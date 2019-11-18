import {unmanagedNode, VApp} from "./VApp"
import {VNode} from "./VNode"

type PatchFunction = (parent: HTMLElement) => HTMLElement;

export class Renderer {
    public $knownAttributes: Set<string> = new Set<string>();

    private static removeElement(parent: HTMLElement, toRemove: VNode) {
        parent.removeChild(toRemove.htmlElement);
    }

    //Proxy for calling
    public diffAgainstLatest(app: VApp): PatchFunction {
        console.log("diffing");
        let latest = app.getLatestSnapshot();
        if (latest == undefined) {
            return el => {
                return el;
            }
        }

        return this.diff(latest, app);
    }

    public diff(snapshot: VApp, vApp: VApp): PatchFunction {
        return this.diffElement(snapshot.rootNode, vApp.rootNode);
    }

    public renderTree(node: VNode): HTMLElement {
        let $elem = document.createElement(node.nodeName);
        $elem.innerHTML = node.getInnerHtml();
        node.$getAttrs().forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));

        node.$getChildren().forEach(child => {
            $elem.appendChild(this.renderTree(child))
        });

        node.setHtmlElement($elem);
        return $elem;
    }

    private diffElement(oldVNode?: VNode, newVNode?: VNode): PatchFunction {
        if (newVNode == undefined) {
            if (oldVNode == undefined) {
                return el => el;
            }
            return (el: HTMLElement) => {
                Renderer.removeElement(el, oldVNode);
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
            oldVNode.addOnDomEventOrExecute((el) => {
                childPatches.forEach(patch => patch(el));
                attributePatch(el);
                innerHtmlPatch(el);
            });

            newVNode.htmlElement = oldVNode.htmlElement;

            return $node;
        };
    }

    private diffInnerHtml(oldVNode: VNode, newVNode: VNode): PatchFunction {
        if (oldVNode.getInnerHtml() !== newVNode.getInnerHtml() || newVNode.dynamicContent) {
            return $node => {
                $node.innerHTML = newVNode.getInnerHtml();
                return $node;
            }
        }

        return $node => $node;
    }

    private diffAttributes(node: VNode, newVNode: VNode): PatchFunction {
        let patches: PatchFunction[] = [];

        let $attributeArray = [];
        if (newVNode.htmlElement) {
            $attributeArray = Array.from(newVNode.htmlElement.attributes).filter($attr => this.$knownAttributes.has($attr.name));
        }

        for (let i = 0; i < Math.max($attributeArray.length, newVNode.$getAttrs().length); i++) {
            const $attribute = $attributeArray[i];
            const vAttribute = newVNode.$getAttrs()[i];

            if ($attribute == undefined && vAttribute != undefined) {
                patches.push($node => {
                    $node.setAttribute(vAttribute.attrName, vAttribute.attrValue);
                    return $node;
                });
                continue;
            }

            if ($attribute !== undefined && vAttribute === undefined) {
                patches.push($node => {
                    $node.removeAttribute($attribute.name);
                    return $node;
                });
                continue;
            }

            if (vAttribute === undefined) {
                continue;
            }

            if ($attribute.value != vAttribute.attrValue || $attribute.name != vAttribute.attrName) {
                patches.push($node => {
                    $node.setAttribute(vAttribute.attrName, vAttribute.attrValue);
                    return $node;
                });
            }

        }

        return $node => {
            patches.forEach(p => p($node));
            return $node;
        }
    }
}
