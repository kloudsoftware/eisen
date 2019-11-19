import {VNode} from './VNode';
import {AppEvent, ComponentFunctionHolder, FunctionHolder, VApp} from './VApp';
import {Props} from "./Props";

export abstract class Component {
    public app: VApp;
    public $mount: VNode;
    public props: Props;

    abstract render(props: Props): VNode;

    abstract lifeCycle(): ComponentProps;

    forcedUpdate = () => {
        this.app.rerenderComponent(this, this.props);
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

                const oldValue = this[cachedValueKey];
                this[cachedValueKey] = value;
                this["forcedUpdate"]();
            },
            get: function () {
                return this[cachedValueKey];
            }
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
