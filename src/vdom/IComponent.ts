import { VNode } from './VNode';
import { Props } from './Props';

export type ComponentBuildFunc = (root: VNode, props: Props) => void
export type ComponentScriptFunc = () => void

export abstract class Component {
    abstract build(): ComponentBuildFunc;

    beforeMount(): ComponentScriptFunc {
        return () => { };
    }

    mounted(): ComponentScriptFunc {
        return () => { };
    }

    unmounted(): ComponentScriptFunc {
        return () => { };
    }
}
