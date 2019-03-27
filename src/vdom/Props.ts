import { VApp, AppEvent } from "./VApp";
import { Cloneable } from "./Common";

export type PropValue = string | number | any & Cloneable<any>;

export type PropFunc = (val: PropValue) => void;

export class Props implements Cloneable<Props>{
    private props: Map<string, any>;
    private app: VApp;
    private callbacks: Map<string, Array<PropFunc>> = new Map()

    constructor(app: VApp, props?: Map<string, any>) {
        if (props == undefined) {
            props = new Map();
        }
        this.props = props;
        this.app = app;
    }

    public registerCallback(key: string, fun: PropFunc): void {
        if (this.callbacks.has(key)) {
            let array = this.callbacks.get(key);
            if (array == undefined) {
                array = new Array();
            }

            array.push(fun);

            this.callbacks.set(key, array);
        } else {
            console.log("There is no key: " + key + " on this Props object");
        }
    }

    public setPropSilent(key: string, value: PropValue) {
        this.props.set(key, value);
        this.notifyCallbacks(key, value);
    }

    public setProp(key: string, value: PropValue) {
        this.app.notifyDirty();
        this.props.set(key, value);
        this.notifyCallbacks(key, value);
    }

    private notifyCallbacks(key: string, value: PropValue) {
        if (this.callbacks.has(key)) {
            let array = this.callbacks.get(key);
            if (array == undefined) {
                array.forEach(f => f(value))
            }
        }
    }

    public clone(): Props {
        const clone = new Props(this.app);
        Array.from(this.props.keys()).forEach(it => {
            let value = this.props.get(it);
            if (typeof value == 'string' || typeof value == 'number') {
                clone.setProp(it, value);
            } else {
                clone.setProp(it, value.clone());
            }
        });

        return clone;
    }

    public getProp(key: string): PropValue {
        let value = this.props.get(key);
        if (typeof value == 'string' || typeof value == 'number') {
            return value;
        }

        return value.clone();
    }
}
