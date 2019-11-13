import {unmanagedNode, VApp} from "./VApp"
import {VNode} from "./VNode"

type PatchFunction = (parent: HTMLElement) => HTMLElement;

export class Renderer {
    public $knownAttributes: Set<string> = new Set<string>();

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
        return this.diffElement(snapshot.rootNode, vApp.rootNode);
    }

    private static removeElement(parent: HTMLElement, toRemove: VNode) {
        parent.removeChild(toRemove.htmlElement);
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
                if(child === undefined) {
                    return parent;
                }
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

        let $attributeArray = Array.from(newVNode.htmlElement.attributes).filter($attr => this.$knownAttributes.has($attr.name));

        for(let i = 0; i < Math.max($attributeArray.length, newVNode.$getAttrs().length); i++){
            const $attribute = $attributeArray[i];
            const vAttribute = newVNode.$getAttrs()[i];

            if($attribute == undefined && vAttribute != undefined) {
                patches.push($node => {
                    $node.setAttribute(vAttribute.attrName, vAttribute.attrValue);
                    return $node;
                });
                continue;
            }

            if($attribute !== undefined && vAttribute === undefined) {
                patches.push($node => {
                    $node.removeAttribute($attribute.name);
                    return $node;
                });
                continue;
            }

            if(vAttribute === undefined) {
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

    public renderTree(node: VNode): HTMLElement {
        if(node === undefined) {
            return undefined;
        }
        let $elem = document.createElement(node.nodeName);
        $elem.innerHTML = node.getInnerHtml();
        if (node.$getAttrs() != undefined) {
            node.$getAttrs().forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));
        }

        node.$getChildren().filter(it => it !== undefined).forEach(child => {
            $elem.appendChild(this.renderTree(child))
        });

        node.setHtmlElement($elem);
        return $elem;
    }
}
