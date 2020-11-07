import {Component} from "./Component";

export type PipelineEvent = (data?: any) => void;

export class EventPipeline {
    private events: Map<string, Array<PipelineEvent>> = new Map();

    public registerEvent(name: string, event: PipelineEvent) {
        if (this.events.has(name)) {
            this.events.get(name).push(event);
        } else {
            this.events.set(name, [event]);
        }
    }

    public callEvent(name: string, data?: any) {
        const event = this.events.get(name);

        if (event === undefined) {
            return;
        }

        event.forEach(f => f(data));
    }
}

export class ComponentEventPipeline extends EventPipeline {
    public components: Array<Component> = [];

    public callEventComponent(name: string, data?: any) {
        // @ts-ignore
        this.components.map(comp => comp[name]).filter(fun => fun !== undefined && fun !== null).forEach(fun => fun(data));
    }

    public removeComponent(component: Component) {
        if(this.components.indexOf(component) !== -1) {
            this.components.splice(this.components.indexOf(component), 1)
        }
    }
}
