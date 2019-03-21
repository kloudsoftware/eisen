import {VApp} from "./VApp"
import {VNode} from "./VNode"
import {arraysEquals} from "./Common"

type PatchFunction = (parent: HTMLElement) => HTMLElement;

export class Renderer {

    //Proxy for calling
    public diff(oldVapp: VApp, newVApp: VApp): PatchFunction {
        return this.diffElement(oldVapp.rootNode, newVApp.rootNode);
    }

    private removeElement(parent: HTMLElement, toRemove: VNode) {
        parent.removeChild(toRemove.htmlElement);
    }

    private diffElement(oldVNode?: VNode, newVNode?: VNode): PatchFunction {
        if(newVNode == undefined) {
            return (el: HTMLElement) => {
                this.removeElement(el, oldVNode);
                return el;
            }
        }

        if(oldVNode == undefined) {
            return el => {
                el.appendChild(this.renderTree(newVNode))
                return el;
            }
        }

        if(!oldVNode.equals(newVNode)) {
            console.log(oldVNode, newVNode);
            console.log(oldVNode.nodeName == newVNode.nodeName);
            return el => {
                debugger;
                el.replaceChild(this.renderTree(newVNode), oldVNode.htmlElement);
                return el;
            }
        }

        let childPatches: PatchFunction[] = [];
        oldVNode.children.forEach((child, i) => {
            childPatches.push(this.diffElement(child, newVNode.children[i]));
        });

        newVNode.children.slice(oldVNode.children.length).forEach(child => {
            childPatches.push(parent => {
                parent.appendChild(this.renderTree(child));
                return parent;
            });
        });

        childPatches.forEach(patch => patch(newVNode.htmlElement));
        if (newVNode.htmlElement == undefined) {
            debugger;
        }
        Array.from(newVNode.htmlElement.attributes).forEach(attribute => {
            newVNode.htmlElement.removeAttribute(attribute.name);
        });

        newVNode.attrs.forEach(attr => {
            newVNode.htmlElement.setAttribute(attr.attrName, attr.attrValue);
        });

        return $node => $node;
    }

    private renderTree(node: VNode): HTMLElement {
        let $elem = document.createElement(node.nodeName);
        node.htmlElement = $elem;
        $elem.innerHTML = node.innerHtml;
        if(node.attrs != undefined) {
            node.attrs.forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));
        }

        node.children.forEach(child => {
            $elem.appendChild(this.renderTree(child))
        })

        return $elem;
    }
}
