import {unmanagedNode, VApp} from "./VApp"
import {VInputNode, VNode} from "./VNode"

type PatchFunction = (parent: HTMLElement) => HTMLElement;

export class Renderer {
    public $knownAttributes: Set<string> = new Set<string>();

    private static removeElement(parent: HTMLElement, toRemove: VNode) {
        // We need to notify the component here, as it was just unmounted
        toRemove.app.eventHandler.purge(toRemove, true);
        toRemove.app.notifyUnmount(toRemove);
        toRemove.htmlElement.remove();
    }

    //Proxy for calling
    public diffAgainstLatest(app: VApp): PatchFunction {
        const latest = app.getLatestSnapshot();
        const patch = latest ? this.diff(latest, app) : ((el: HTMLElement) => el);

        return (el: HTMLElement) => {
            const result = patch(el);
            app.snapshots.push(app.clone());
            return result;
        };
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
                oldVNode.app.eventHandler.purge(oldVNode, true);
                oldVNode.app.notifyUnmount(oldVNode);
                el.replaceChild(this.renderTree(newVNode), oldVNode.htmlElement);
                return el;
            }
        }

        const childPatches: PatchFunction[] = [];
        const oldChildren = oldVNode.$getChildren();
        const newChildren = newVNode.$getChildren();

        // When no keys are present and the child count remains the same, reuse
        // the previous IDs so inputs keep their DOM nodes across rerenders.
        if (oldChildren.length === newChildren.length) {
            newChildren.forEach((child, i) => {
                if (child.key === undefined && oldChildren[i] && oldChildren[i].key === undefined) {
                    child.id = oldChildren[i].id;
                }
            });
        }

        const oldMap = new Map<string, VNode>();
        oldChildren.forEach(c => oldMap.set(c.id, c));

        newChildren.forEach((child, i) => {
            const match = oldMap.get(child.id);
            if (match) {
                childPatches.push(parent => {
                    const ref = parent.children[i] ?? null;
                    if (match.htmlElement && match.htmlElement !== ref) {
                        parent.insertBefore(match.htmlElement, ref);
                    }
                    return parent;
                });
                childPatches.push(this.diffElement(match, child));
                oldMap.delete(child.id);
            } else {
                childPatches.push(parent => {
                    const ref = parent.children[i] ?? null;
                    parent.insertBefore(this.renderTree(child), ref);
                    return parent;
                });
            }
        });

        oldMap.forEach(rem => {
            childPatches.push(parent => {
                Renderer.removeElement(parent, rem);
                return parent;
            });
        });


        let attributePatch = this.diffAttributes(oldVNode, newVNode);
        let innerHtmlPatch = this.diffInnerHtml(oldVNode, newVNode);
        let valuePatch = this.diffValue(oldVNode, newVNode);

        return $node => {
            oldVNode.addOnDomEventOrExecute((el) => {
                childPatches.forEach(patch => patch(el));
                attributePatch(el);
                innerHtmlPatch(el);
                valuePatch(el);
            });

            newVNode.app.eventHandler.purge(oldVNode);
            newVNode.setHtmlElement(oldVNode.htmlElement);
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

        let $attributeArray: Array<Attr> = [];
        if (newVNode.htmlElement) {
            $attributeArray = Array.from(newVNode.htmlElement.attributes).filter($attr => this.$knownAttributes.has($attr.name));
        }

        const setAttrs = new Map<string, string>();
        const validAttrs = new Map<string, string>();
        $attributeArray.forEach(attr => {
            setAttrs.set(attr.name, attr.value);
        });
        newVNode.$getAttrs().forEach(attr => {
            validAttrs.set(attr.attrName, attr.attrValue)
        });

        setAttrs.forEach((v, k) => {
            const setVal = validAttrs.get(k);
            if (setVal === undefined) {
                patches.push($node => {
                    $node.removeAttribute(k);
                    return $node;
                });
                validAttrs.delete(k);
                return;
            }

            if (setVal !== v) {
                patches.push($node => {
                    $node.setAttribute(k, setVal);
                    return $node;
                });
                validAttrs.delete(k);
                return;
            }
        });

        validAttrs.forEach((v, k) => {
            patches.push($node => {
                $node.setAttribute(k, v);
                return $node;
            });
        });


        return $node => {
            patches.forEach(p => p($node));
            return $node;
        }
    }

    private diffValue(oldVNode: VNode, newVNode: VNode): PatchFunction {
        if (oldVNode.value !== newVNode.value) {
            return $node => {
                if ($node instanceof HTMLInputElement) {
                    $node.value = newVNode.value
                }

                return $node;
            }
        }

        return $node => $node;
    }
}
