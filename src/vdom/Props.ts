import {VApp} from "./VApp";

export type PropValue = any;

export type PropFunc = (val: PropValue) => void;

export class Props {
    private props: Map<string, any>;
    private readonly app: VApp;
    public cbs: Map<string, Array<PropFunc>> = new Map<string, Array<PropFunc>>();
    public callbacksExclusive: Map<string, PropFunc>;

    constructor(app: VApp, props?: Map<string, any>) {
        if (props == undefined) {
            props = new Map();
        }
        this.props = props;
        this.app = app;
        this.callbacksExclusive = new Map<string, PropFunc>();
    }

    public registerCallback(key: string, fun: PropFunc, exclusive = false): void {
        if (!exclusive) {
            if (this.cbs.has(key)) {
                this.cbs.get(key).push(fun)
            } else {
                const arr = [fun];
                this.cbs.set(key, arr);
                this.cbs.set(key, arr);
            }
        } else {
            this.callbacksExclusive.set(key, fun);
        }
    }

    public setPropSilent(key: string, value: PropValue) {
        this.props.set(key, value);
        this.notifyCallbacks(key, value);
    }

    public setProp(key: string, value: PropValue) {
        this.props.set(key, value);
        this.notifyCallbacks(key, value);
        this.app.notifyDirty();
    }

    private notifyCallbacks(key: string, value: PropValue) {
        if (this.cbs.has(key)) {
            let array = this.cbs.get(key);
            array.forEach(f => f(value))
        }

        if (this.callbacksExclusive.has(key)) {
            this.callbacksExclusive.get(key)(value);
        }
    }

    public getProp(key: string): PropValue {
        let value = this.props.get(key);
        if (value == undefined) {
            return undefined;
        }

        return value;
    }

    public clearCallbacks() {
        //NOOP
    }
}
