import { VNode } from './VNode';
import { Props } from './Props';
import { VApp, FunctionHolder, AppEvent } from './VApp';


export type ComponentBuildFunc = (root: VNode, props: Props) => ComponentProps

export abstract class Component {
    abstract build(app: VApp): ComponentBuildFunc;
}

export interface ComponentProps {
    mounted?(): void;
    unmounted?(): void;
}

export class ComponentEventHolder {
    mounted: FunctionHolder;
    unmounted: AppEvent;
    mount: VNode;

    constructor(props: ComponentProps, mount: VNode) {
        this.mounted = [false, props.mounted];
        this.unmounted = props.unmounted;
        this.mount = mount;
    }
}
