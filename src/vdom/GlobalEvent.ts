export type PipelineEvent = (data?: any) => void;

export class EventPipeline {
    private events: Map<string, Array<PipelineEvent>> = new Map();

    public registerEvent(name: string, event: PipelineEvent) {
        if(this.events.has(name)) {
            this.events.get(name).push(event);
        } else {
            this.events.set(name, [event]);
        }
    }

    public callEvent(name: string, data?: any) {
        this.events.get(name).forEach(f => f(data));
    }
}
