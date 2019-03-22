import { VApp } from "./VApp";
import { Cloneable } from "./Common";

export type PropValue = string | number | any & Cloneable<any>;

export class Props implements Cloneable<Props>{
    private props: Map<string, any>;
    private app: VApp;

    constructor(app: VApp, props?: Map<string, any>) {
        if(props == undefined) {
            props = new Map();
        }
        this.props = props;
        this.app = app;
    }

    public setProp(key: string, value: PropValue) {
        this.app.notifyDirty();
        this.props.set(key, value);
    }

    public clone(): Props {
        const clone = new Props(this.app);
        Array.from(this.props.keys()).forEach (it =>{
            let value = this.props.get(it);
            if(typeof value == 'string' || typeof value == 'number') {
                clone.setProp(it, value);
            } else {
                clone.setProp(it, value.clone());
            }
        });

        return clone;
    }

    public getProp(key: string): PropValue{
        let value = this.props.get(key);
        if(typeof value == 'string' || typeof value == 'number') {
            return value;
        }

        return value.clone();
    }
}
