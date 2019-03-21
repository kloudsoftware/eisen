import {VApp} from "./VApp"
import {VNode} from "./VNode"
import {arraysEquals} from "./Common"

type PatchFunction = (parent: HTMLElement) => HTMLElement;

export class Renderer {

    //Proxy for calling
    public diffAgainstLatest(app: VApp): PatchFunction {
        let latest = app.getLatestSnapshot();
        if(latest == undefined) {
            return el => {
                return el;
            }
        }

        return this.diff(latest, app);
    }

    public diff(snapshot: VApp, vApp: VApp): PatchFunction {
        let patch = this.diffElement(snapshot.rootNode, vApp.rootNode);
        vApp.dirty = false;
        return patch;
    }

    private removeElement(parent: HTMLElement, toRemove: VNode) {
        if (toRemove.htmlElement == undefined) debugger;
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
            return el => {
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
        Array.from(newVNode.htmlElement.attributes).forEach(attribute => {
            newVNode.htmlElement.removeAttribute(attribute.name);
        });

        newVNode.attrs.forEach(attr => {
            newVNode.htmlElement.setAttribute(attr.attrName, attr.attrValue);
        });

        if (newVNode.getInnerHtml() != oldVNode.getInnerHtml() ) {
            newVNode.htmlElement.innerHTML = newVNode.getInnerHtml();
        }

        return $node => $node;
    }

    private renderTree(node: VNode): HTMLElement {
        let $elem = document.createElement(node.nodeName);
        node.htmlElement = $elem;
        $elem.innerHTML = node.getInnerHtml();
        if(node.attrs != undefined) {
            node.attrs.forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));
        }

        node.children.forEach(child => {
            $elem.appendChild(this.renderTree(child))
        })

        return $elem;
    }
}
