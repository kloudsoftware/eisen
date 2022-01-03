import {VNode} from './VNode';
import {AppEvent, ComponentFunctionHolder, VApp} from './VApp';
import {Props} from "./Props";
import {ComponentEventPipeline} from "./GlobalEvent";

export abstract class Component {
    public app: VApp;
    public $mount: VNode;
    public props: Props;
    public subComponents: Array<Component> = [];
    public componentEvent: ComponentEventPipeline = new ComponentEventPipeline();

    abstract render(props: Props): VNode;

    rerender = () => {
        this.forcedUpdate();
        this.subComponents.forEach(comp => comp.rerender());
    }

    mount = (component: Component, mount: VNode, props?: Props) => {
        if (this.subComponents.indexOf(component) == -1) {
            this.subComponents.push(component);
            this.app.mountSubComponent(component, mount, props, this);
        }
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
