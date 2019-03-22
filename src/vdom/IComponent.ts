import { VNode } from './VNode';

export type ComponentBuildFunc = (root: VNode, props: Props) => void

export interface IComponent {
    build(): ComponentBuildFunc;
}
