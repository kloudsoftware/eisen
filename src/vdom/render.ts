import { VApp, unmanagedNode } from "./VApp"
import { VNode } from "./VNode"
import { arraysEquals } from "./Common"

type PatchFunction = (parent: HTMLElement) => HTMLElement;

export class Renderer {

    //Proxy for calling
    public diffAgainstLatest(app: VApp): PatchFunction {
        let latest = app.getLatestSnapshot();
        if (latest == undefined) {
            return el => {
                return el;
            }
        }

        return this.diff(latest, app);
    }

    public diff(snapshot: VApp, vApp: VApp): PatchFunction {
        let patch = this.diffElement(snapshot.rootNode, vApp.rootNode);
        return patch;
    }

    private removeElement(parent: HTMLElement, toRemove: VNode) {
        parent.removeChild(toRemove.htmlElement);
    }

    private diffElement(oldVNode?: VNode, newVNode?: VNode): PatchFunction {
        if (newVNode == undefined) {
            if (oldVNode == undefined) {
                return el => el;
            }
            return (el: HTMLElement) => {
                this.removeElement(el, oldVNode);
                return el;
            }
        }

        if (oldVNode == undefined) {
            return el => {
                el.appendChild(this.renderTree(newVNode))
                return el;
            }
        }

        if (newVNode.id == unmanagedNode) {
            return el => el;
        }

        if (!oldVNode.equals(newVNode)) {
            return el => {
                el.replaceChild(this.renderTree(newVNode), oldVNode.htmlElement);
                return el;
            }
        }

        let childPatches: PatchFunction[] = [];
        oldVNode.$getChildren().forEach((child, i) => {
            childPatches.push(this.diffElement(child, newVNode.$getChildren()[i]));
        });

        newVNode.$getChildren().slice(oldVNode.$getChildren().length).forEach(child => {
            childPatches.push(parent => {
                parent.appendChild(this.renderTree(child));
                return parent;
            });
        });

        let attributePatch = this.diffAttributes(oldVNode, newVNode);
        let innerHtmlPatch = this.diffInnerHtml(oldVNode, newVNode);

        return $node => {
            childPatches.forEach(patch => patch(newVNode.htmlElement));
            attributePatch(newVNode.htmlElement);
            innerHtmlPatch(newVNode.htmlElement);
            return $node;
        };
    }

    private diffInnerHtml(oldVNode: VNode, newVNode: VNode): PatchFunction {
        if (newVNode.modifiedInnerHtml || newVNode.dynamicContent) {
            return $node => {
                $node.innerHTML = newVNode.getInnerHtml();
                return $node;
            }
        }

        return $node => $node;
    }

    private diffAttributes(node: VNode, newVNode: VNode): PatchFunction {
        let patches: PatchFunction[] = [];

        Array.from(newVNode.htmlElement.attributes).forEach(attribute => {
            patches.push($node => {
                $node.removeAttribute(attribute.name);
                return $node;
            })
        });

        newVNode.$getAttrs().forEach(attr => {
            patches.push($node => {
                $node.setAttribute(attr.attrName, attr.attrValue)
                return $node;
            })
        });

        return $node => {
            patches.forEach(p => p($node))
            return $node;
        }
    }

    public renderTree(node: VNode): HTMLElement {
        let $elem = document.createElement(node.nodeName);
        $elem.innerHTML = node.getInnerHtml();
        node.setHtmlElement($elem);
        if (node.$getAttrs() != undefined) {
            node.$getAttrs().forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));
        }

        node.$getChildren().forEach(child => {
            $elem.appendChild(this.renderTree(child))
        })

        return $elem;
    }
}
