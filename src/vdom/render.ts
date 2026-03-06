import {unmanagedNode, VApp} from "./VApp"
import {VInputNode, VNode} from "./VNode"

type PatchFunction = (parent: HTMLElement) => HTMLElement;

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set([
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'ellipse', 'g', 'text', 'tspan', 'defs', 'use', 'clipPath', 'mask',
    'filter', 'linearGradient', 'radialGradient', 'stop', 'pattern',
    'image', 'foreignObject', 'marker', 'symbol', 'animate',
    'animateTransform', 'animateMotion', 'set',
]);

const NOOP_PATCH: PatchFunction = ($node) => $node;

export class Renderer {
    public $knownAttributes: Set<string> = new Set<string>();

    /** Recursively copy htmlElement references from old tree to new tree (used when skipping unchanged subtrees). */
    private static transferElements(oldVNode: VNode, newVNode: VNode): void {
        newVNode.htmlElement = oldVNode.htmlElement;
        const oldChildren = oldVNode.$getChildren();
        const newChildren = newVNode.$getChildren();
        for (let i = 0, len = Math.min(oldChildren.length, newChildren.length); i < len; i++) {
            Renderer.transferElements(oldChildren[i], newChildren[i]);
        }
    }

    private static removeElement(parent: HTMLElement, toRemove: VNode, app: VApp) {
        app.notifyUnmount(toRemove);
        if (toRemove.htmlElement) {
            if (toRemove.beforeRemove) {
                // Delayed removal — leave animation plays first
                const el = toRemove.htmlElement;
                toRemove.beforeRemove(el).then(() => {
                    el.remove();
                });
            } else {
                toRemove.htmlElement.remove();
            }
        }
    }

    //Proxy for calling
    public diffAgainstLatest(app: VApp): PatchFunction {
        app.flushDirtyComponents();

        // Fast path: use targeted diffs from flushDirtyComponents (avoids full tree clone)
        const pendingDiffs = app._pendingDiffs;
        if (pendingDiffs.length > 0) {
            app._pendingDiffs = [];
            const patches = pendingDiffs.map(({ old: oldNode, new: newNode }) =>
                this.diffElement(oldNode, newNode, app)
            );
            return (el: HTMLElement) => {
                for (const patch of patches) {
                    patch(el);
                }
                return el;
            };
        }

        // Fallback: full tree diff (used on init)
        const latest = app.getLatestSnapshot();
        const patch = latest ? this.diff(latest, app) : NOOP_PATCH;

        return (el: HTMLElement) => {
            const result = patch(el);
            app.saveSnapshot();
            return result;
        };
    }

    public diff(snapshot: VApp, vApp: VApp): PatchFunction {
        return this.diffElement(snapshot.rootNode, vApp.rootNode, vApp);
    }

    public renderTree(node: VNode, inSvg = false): HTMLElement | Text {
        if (node.isTextNode) {
            const textNode = document.createTextNode(node.getInnerHtml());
            node.htmlElement = textNode as any;
            return textNode;
        }

        const isSvg = inSvg || node.nodeName === 'svg';
        let $elem: HTMLElement;

        if (isSvg && SVG_TAGS.has(node.nodeName)) {
            $elem = document.createElementNS(SVG_NS, node.nodeName) as unknown as HTMLElement;
        } else {
            $elem = document.createElement(node.nodeName);
        }

        const children = node.$getChildren();

        // dangerouslySetInnerHTML takes priority
        if (node.dangerousHtml !== undefined) {
            $elem.innerHTML = node.dangerousHtml;
        } else if (children.length === 0) {
            // Only set innerHTML when there are no child nodes — avoids clobbering
            $elem.innerHTML = node.getInnerHtml();
        }

        node.$getAttrs().forEach(attr => {
            if (isSvg) {
                $elem.setAttributeNS(null, attr.attrName, attr.attrValue);
            } else {
                $elem.setAttribute(attr.attrName, attr.attrValue);
            }
        });

        if (node.dangerousHtml === undefined) {
            children.forEach(child => {
                $elem.appendChild(this.renderTree(child, isSvg));
            });
        }

        node.setHtmlElement($elem);

        // Set .value for input/textarea/select on first render
        if (node.value != null && node.value !== '') {
            if ($elem instanceof HTMLInputElement
                || $elem instanceof HTMLTextAreaElement
                || $elem instanceof HTMLSelectElement) {
                $elem.value = node.value;
            }
        }

        // Portal: render child into a different DOM target
        if (node.portalTarget) {
            const target = document.getElementById(node.portalTarget);
            const portalChild = (node as any)._portalChild;
            if (target && portalChild) {
                target.appendChild(this.renderTree(portalChild, false));
            }
        }

        return $elem;
    }

    /**
     * Hydrates a VNode tree by walking the existing DOM and attaching
     * references instead of creating new elements. Used after SSR.
     *
     * Usage:
     *   const { app } = createApp(App, '#app');
     *   app.renderer.hydrate(app.rootNode, document.getElementById('app')!);
     */
    public hydrate(vNode: VNode, domNode: HTMLElement | Text): void {
        if (vNode.isTextNode) {
            vNode.htmlElement = domNode as any;
            return;
        }

        const el = domNode as HTMLElement;
        vNode.setHtmlElement(el);

        // Set value for input/textarea/select
        if (vNode.value != null && vNode.value !== '') {
            if (el instanceof HTMLInputElement
                || el instanceof HTMLTextAreaElement
                || el instanceof HTMLSelectElement) {
                el.value = vNode.value;
            }
        }

        const vChildren = vNode.$getChildren();
        const domChildren = el.childNodes;
        let domIdx = 0;

        for (let i = 0; i < vChildren.length; i++) {
            // Skip whitespace-only text nodes in the DOM
            while (domIdx < domChildren.length) {
                const dc = domChildren[domIdx];
                if (dc.nodeType === 3 /* Text */ && vChildren[i].isTextNode) break;
                if (dc.nodeType === 1 /* Element */ && !vChildren[i].isTextNode) break;
                // Skip comment nodes and mismatched text nodes
                if (dc.nodeType === 3 && !vChildren[i].isTextNode && dc.textContent?.trim() === '') {
                    domIdx++;
                    continue;
                }
                break;
            }

            if (domIdx < domChildren.length) {
                this.hydrate(vChildren[i], domChildren[domIdx] as HTMLElement | Text);
                domIdx++;
            }
        }
    }

    private diffElement(oldVNode: VNode | undefined, newVNode: VNode | undefined, app: VApp): PatchFunction {
        // Skip identical subtrees — nothing changed
        if (oldVNode !== undefined && oldVNode === newVNode) {
            return $node => $node;
        }

        if (newVNode == undefined) {
            if (oldVNode == undefined) {
                return el => el;
            }
            return (el: HTMLElement) => {
                Renderer.removeElement(el, oldVNode, app);
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
                app.notifyUnmount(oldVNode);
                el.replaceChild(this.renderTree(newVNode), oldVNode.htmlElement as any);
                return el;
            }
        }

        // Text node diff — just update textContent if changed
        if (newVNode.isTextNode && oldVNode.isTextNode) {
            return $node => {
                const oldText = oldVNode.getInnerHtml();
                const newText = newVNode.getInnerHtml();
                if (oldText !== newText && oldVNode.htmlElement) {
                    (oldVNode.htmlElement as any).textContent = newText;
                }
                newVNode.htmlElement = oldVNode.htmlElement;
                return $node;
            };
        }

        // Content hash fast path — skip entire subtree when content is identical
        if (oldVNode.contentHash !== 0 && oldVNode.contentHash === newVNode.contentHash) {
            Renderer.transferElements(oldVNode, newVNode);
            return NOOP_PATCH;
        }

        const childPatches: PatchFunction[] = [];
        const oldChildren = oldVNode.$getChildren();
        const newChildren = newVNode.$getChildren();

        // When no keys are present and the child count remains the same, reuse
        // the previous IDs so inputs keep their DOM nodes across rerenders.
        if (oldChildren.length === newChildren.length) {
            newChildren.forEach((child, i) => {
                if (child.key === undefined && oldChildren[i] && oldChildren[i].key === undefined) {
                    const previousId = child.id;
                    const targetId = oldChildren[i].id;
                    child.app.eventHandler.reassign(child, previousId, targetId);
                    child.id = targetId;
                }
            });
        }

        // Fast path: same-length keyed lists with all IDs matching in order
        // (covers select-row, update-every-10th — no structural changes)
        let allMatchInOrder = oldChildren.length === newChildren.length;
        if (allMatchInOrder) {
            for (let i = 0; i < oldChildren.length; i++) {
                if (oldChildren[i].id !== newChildren[i].id) {
                    allMatchInOrder = false;
                    break;
                }
            }
        }

        if (allMatchInOrder) {
            for (let i = 0; i < newChildren.length; i++) {
                const patch = this.diffElement(oldChildren[i], newChildren[i], app);
                if (patch !== NOOP_PATCH) childPatches.push(patch);
            }
        } else {
            // Build old index map: id → position
            const oldMap = new Map<string, VNode>();
            const oldIndexMap = new Map<string, number>();
            for (let i = 0; i < oldChildren.length; i++) {
                oldMap.set(oldChildren[i].id, oldChildren[i]);
                oldIndexMap.set(oldChildren[i].id, i);
            }

            // Identify which children moved, were added, or removed
            const moves: Array<{ type: 'move' | 'insert'; index: number; node: VNode; match?: VNode }> = [];
            const removals: VNode[] = [];
            const matched = new Set<string>();

            for (let i = 0; i < newChildren.length; i++) {
                const child = newChildren[i];
                const match = oldMap.get(child.id);
                if (match) {
                    matched.add(child.id);
                    const oldIdx = oldIndexMap.get(child.id)!;
                    // Diff the content (may be NOOP_PATCH if hash matches)
                    const contentPatch = this.diffElement(match, child, app);
                    if (contentPatch !== NOOP_PATCH) {
                        childPatches.push(contentPatch);
                    }
                    // Only emit a move patch if position actually changed
                    if (oldIdx !== i) {
                        moves.push({ type: 'move', index: i, node: child, match });
                    }
                } else {
                    moves.push({ type: 'insert', index: i, node: child });
                }
            }

            // Collect removals
            for (let i = 0; i < oldChildren.length; i++) {
                if (!matched.has(oldChildren[i].id)) {
                    removals.push(oldChildren[i]);
                }
            }

            // Apply removals first, then moves/inserts
            if (removals.length > 0) {
                childPatches.push(parent => {
                    for (const rem of removals) {
                        Renderer.removeElement(parent, rem, app);
                    }
                    return parent;
                });
            }

            if (moves.length > 0) {
                childPatches.push(parent => {
                    for (const m of moves) {
                        if (m.type === 'move') {
                            const ref = parent.childNodes[m.index] ?? null;
                            if (m.match!.htmlElement && m.match!.htmlElement !== ref) {
                                parent.insertBefore(m.match!.htmlElement as any, ref);
                            }
                        } else {
                            const ref = parent.childNodes[m.index] ?? null;
                            parent.insertBefore(this.renderTree(m.node), ref);
                        }
                    }
                    return parent;
                });
            }
        }


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

            newVNode.setHtmlElement(oldVNode.htmlElement);
            return $node;
        };
    }

    private diffInnerHtml(oldVNode: VNode, newVNode: VNode): PatchFunction {
        // dangerouslySetInnerHTML diff
        if (newVNode.dangerousHtml !== undefined) {
            if (oldVNode.dangerousHtml !== newVNode.dangerousHtml) {
                return $node => {
                    $node.innerHTML = newVNode.dangerousHtml!;
                    return $node;
                };
            }
            return $node => $node;
        }

        // Skip innerHTML diff when node has children — text is handled by child text VNodes
        if (newVNode.$getChildren().length > 0) {
            return $node => $node;
        }

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
        if (node.htmlElement) {
            $attributeArray = Array.from(node.htmlElement.attributes).filter($attr => this.$knownAttributes.has($attr.name));
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
                if ($node instanceof HTMLInputElement
                    || $node instanceof HTMLTextAreaElement
                    || $node instanceof HTMLSelectElement) {
                    $node.value = newVNode.value
                }

                return $node;
            }
        }

        return $node => $node;
    }
}
