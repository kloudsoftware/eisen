import { VApp, unmanagedNode } from "./VApp"
import { VNode } from "./VNode"
import { arraysEquals } from "./Common"

type PatchFunction = (parent: HTMLElement) => HTMLElement;

/**
 * This class is responsible determining the Changes that need to be applied to the $DOM
 * its use is to create the PatchFunction that needs to be applied to the {@link VApp}.rootNode.htmlElement to update the $DOM state in order to reflect the new VApp
 */
export class Renderer {

    //Proxy for calling
    /**
     * Compares the given {@link VApp} instance to the latest snapshot made.
     * Returns a function to patch the $DOM.
     * @param app the current state of the app
     */
    public diffAgainstLatest(app: VApp): PatchFunction {
        let latest = app.getLatestSnapshot();
        if (latest == undefined) {
            return el => {
                return el;
            }
        }

        return this.diff(latest, app);
    }

    /**
     * Compares two {@link VApp} instances and returns a function to patch the $DOM
     * @param snapshot the snapshot made prior. Base of the comparison
     * @param vApp the current state to compare with
     */
    public diff(snapshot: VApp, vApp: VApp): PatchFunction {
        let patch = this.diffElement(snapshot.rootNode, vApp.rootNode);
        return patch;
    }

    private removeElement(parent: HTMLElement, toRemove: VNode) {
        parent.removeChild(toRemove.htmlElement);
    }

    /**
     * Compares two VNodes and returns a {@link PatchFunction} to patch the corresponding $DOM element. Children are handled recursively.
     * @param oldVNode the node in the old state
     * @param newVNode the node in the new state
     */
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

    /**
     * Compares the innerHtml values of the nodes. Uses {@link VNode}.modifiedInnerHtml as an indicator wether HTML was altered. This is done to
     * diff more easily and protect from mistakes. If a VNode has dynamicContent such as a two way bound string, it will always be re-rendered in order to update its state
     * @param oldVNode
     * @param newVNode
     */
    private diffInnerHtml(oldVNode: VNode, newVNode: VNode): PatchFunction {
        if (newVNode.modifiedInnerHtml || newVNode.dynamicContent) {
            return $node => {
                //console.log($node, newVNode.getInnerHtml());
                $node.innerHTML = newVNode.getInnerHtml();
                return $node;
            }
        }

        return $node => $node;
    }

    /**
     * Compares the attributes of the nodes. Current implementation does not actually compare the old and new Values, rather it simply replaces them.
     * @param node
     * @param newVNode
     */
    private diffAttributes(node: VNode, newVNode: VNode): PatchFunction {
        let patches: PatchFunction[] = [];

        Array.from(newVNode.htmlElement.attributes).forEach(attribute => {
            patches.push($node => {
                $node.removeAttribute(attribute.name);
                return $node;
            })
        });

        newVNode.attrs.forEach(attr => {
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

    /**
     * Renders a complete $DOM tree from this VNode. It recursively handles the ChildNodes
     * @param node the $DOM element corresponding to the input VNode
     */
    public renderTree(node: VNode): HTMLElement {
        let $elem = document.createElement(node.nodeName);
        $elem.innerHTML = node.getInnerHtml();
        node.setHtmlElement($elem);
        if (node.attrs != undefined) {
            node.attrs.forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));
        }

        node.$getChildren().forEach(child => {
            $elem.appendChild(this.renderTree(child))
        })

        return $elem;
    }
}
