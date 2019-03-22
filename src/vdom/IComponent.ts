import { VNode } from './VNode';
import { Props } from './Props';
import { VApp } from './VApp';

export type ComponentScriptFunc = () => void
export type ComponentBuildFunc = (root: VNode, props: Props) => ComponentScriptFunc

export abstract class Component {
    abstract build(app: VApp): ComponentBuildFunc;

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
