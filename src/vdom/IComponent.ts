import { VNode } from './VNode';
import { Props } from './Props';

export type ComponentBuildFunc = (root: VNode, props: Props) => void

export interface IComponent {
    build(): ComponentBuildFunc;
}
