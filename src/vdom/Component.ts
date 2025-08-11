import {VNode} from './VNode';
import {AppEvent, ComponentFunctionHolder, VApp} from './VApp';
import {Props} from "./Props";
import {ComponentEventPipeline} from "./GlobalEvent";

export abstract class Component {
    public app: VApp;
    public $mount: VNode;
    public props: Props;
    public subComponents: Map<string, Component> = new Map<string, Component>();
    public componentEvent: ComponentEventPipeline = new ComponentEventPipeline();

    abstract render(props: Props): VNode;

    public mount<T extends Component>(ctor: { new(app: VApp): T }, app: VApp, node: VNode, key: string): T {
        if (this.subComponents.has(key)) {
            // @ts-ignore
            return this.subComponents.get(key);
        }

        const val = new ctor(app);
        this.subComponents.set(key, val);
        this.app.mountSubComponent(val, node, this.props, this);
        return val;
    }


    public mountArgs<T extends Component>(ctor: { new(app: VApp, ...args: any[]): T }, app: VApp, node: VNode, key: string, ...args:any[]): T {
        if (this.subComponents.has(key)) {
            // @ts-ignore
            return this.subComponents.get(key);
        }

        const val = new ctor(app, args);
        this.subComponents.set(key, val);
        this.app.mountSubComponent(val, node, this.props, this);
        return val;
    }


    rerender = () => {
        this.lifeCycle().beforererender?.();
        this.forcedUpdate();
        this.subComponents.forEach(comp => comp.rerender());
        this.lifeCycle().afterrerender?.();
    }


    private forcedUpdate = () => {
        this.app.rerenderComponent(this, this.props);
    };

    abstract lifeCycle(): ComponentProps;

    emit = (name: string, data?: any) => {
        this.componentEvent.callEventComponent(name, data)
    };

    public constructor(app: VApp) {
        this.app = app;
    }
}

export function reactive() {
    const cachedValueKey = Symbol();
    const isFirstChangeKey = Symbol();

    return (target: any, key: PropertyKey) => {
        Object.defineProperty(target, key, {
            set: function (value) {
                // is this the first change
                this[isFirstChangeKey] = this[isFirstChangeKey] === undefined;

                // noop if same value
                if (!this[isFirstChangeKey] && this[cachedValueKey] === value) {
                    return;
                }

                this[cachedValueKey] = value;
                this["rerender"]();
            },
            get: function () {
                return this[cachedValueKey];
            },

            configurable: true
        });
    };
}

export abstract class ComponentProps {
    mounted?(comp: Component): void;

    remount?(comp: Component): void;

    unmounted?(): void;

    beforererender?(): void;

    afterrerender?(): void;
}


export class ComponentHolder {
    mounted: ComponentFunctionHolder;
    remount: ComponentFunctionHolder;
    unmounted: AppEvent;
    component: Component;

    constructor(props: ComponentProps, component: Component) {
        this.mounted = [false, props.mounted];
        this.remount = [true, props.remount];
        this.unmounted = props.unmounted;
        this.component = component;
    }
}
