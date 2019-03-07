import { VNode, Attribute } from './VNode';
import {VApp} from './VApp';

export class Renderer {
    public render(app: VApp) {
        this.renderNode(app.rootNode);
    }

    private renderNode(node: VNode) {
        if(node.parent != undefined) {
            this.performDOMRender(node);
        }
        node.children.forEach(child => {
            this.performDOMRender(child);
            if(child.children.length != 0) {
                child.children.forEach(childchild => this.renderNode(childchild));
            }
        })
    }

    private performDOMRender(node: VNode) {
        let $elem = document.createElement(node.nodeName);
        node.htmlElement = $elem;
        $elem.innerHTML = node.innerHtml;
        node.attrs.forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));
        node.parent.htmlElement.appendChild($elem);
    }

    public diff(oldVTree: VApp, newVTree?: VApp): (node: VNode) => VNode  {
        if(newVTree == undefined) {
            //Assume DOM is destroyed, return undefined rootNode
            return $node => {
                $node.remove();

                return undefined;
            }
        }
    }
}
