import { VNode } from './VNode';
import { Props } from './Props';
import { VApp } from './VApp';


export type ComponentBuildFunc = (root: VNode, props: Props) => ComponentProps

export abstract class Component {
    abstract build(app: VApp): ComponentBuildFunc;
}

export interface ComponentProps {
    mounted?(): void;
    beforeUnmount?(): void;
    unmounted?(): void;
}