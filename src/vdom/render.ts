import { VNode, Attribute } from './VNode';
import {VApp} from './VApp';
import {Comparable, arraysEquals} from './Common'

export class Renderer {
    public render(app: VApp): VNode{
        return this.renderNode(app.rootNode);
    }

    private renderNode(node: VNode): VNode {
        if(node.parent != undefined) {
            this.performDOMRender(node);
        }
        node.children.forEach(child => {
            this.performDOMRender(child);
            if(child.children.length != 0) {
                child.children.forEach(childchild => this.renderNode(childchild));
            }
        })

        return node;
    }

    private performDOMRender(node: VNode) {
        let $elem = this.performDOMelCreation(node);
        node.parent.htmlElement.appendChild($elem);
    }

    private performDOMelCreation(node: VNode):HTMLElement {
        let $elem = document.createElement(node.nodeName);
        node.htmlElement = $elem;
        $elem.innerHTML = node.innerHtml;
        if(node.attrs != undefined) {
            node.attrs.forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));
        }

        return $elem;
    }

    public diff(oldVTree: VNode, newVTree?: VNode): (node: Element) => Element {
        if(newVTree == undefined) {
            //Assume DOM is destroyed, return undefined node
            return $node => {
                $node.remove();
                return undefined;
            }
        }

        if(oldVTree.nodeName != newVTree.nodeName) {
            return $node => {
                console.log("replacing: ", $node)
                const $newTree = this.performDOMelCreation(newVTree);
                $node.replaceWith($newTree);
                return $node;
            }
        }

        const attrPatches = this.diffAttrs(oldVTree.attrs, newVTree.attrs);
        const childPatches = this.diffChildren(oldVTree.children, newVTree.children);

        return $node => {
            attrPatches($node);
            childPatches($node);
            return $node;
        }
    }

    private diffAttrs(oldAttrs: Attribute[], newAttrs: Attribute[]): (node: Element) => void {
        //Shortcircuit for same attributes
        if(arraysEquals(oldAttrs, newAttrs)) {
            return node => node;
        }

        const patches = [];
        newAttrs.forEach(attr => {
            patches.push(($node: Element) => {
                $node.setAttribute(attr.attrName, attr.attrValue)
            })
        })

        oldAttrs.forEach(attr => {
            patches.push(($node: Element) => {
                $node.removeAttribute(attr.attrName);
            })
        })

        return $node => {
            patches.forEach(patch => patch($node));
        }
    }

    private diffChildren(oldChildren: VNode[], newChildren: VNode[]): ($node:Element ) => void {
        const patches = [];
        //This handles every child that is contained in oldChildren
        oldChildren.forEach((child, i) => {
            patches.push(this.diff(child, newChildren[i]))
        })

        console.log(newChildren, newChildren.length - oldChildren.length)

        const additionalPatches = [];
        //This handles every child that is NOT in oldChildren
        newChildren.slice(oldChildren.length).forEach((child) => {
            (additionalPatches.push((node: Element) => {
                console.log("new child added to dom: ", node)
                const $node = this.performDOMelCreation(child);
                node.appendChild($node)
                return node;
            }));
        })

        return (parent: Element) => {
            for(let i = 0; i < parent.children.length; i++) {
                patches[i](parent.children[i]);
            }

            additionalPatches.forEach(patch => patch(parent));
        }
    }
}
