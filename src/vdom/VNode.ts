import { Comparable, arraysEquals } from './Common';
import { VApp } from './VApp'
import { v4 as uuid } from 'uuid';

export const kloudAppId = "kloudappid";

export class VNode implements Comparable<VNode> {
    app: VApp;
    id: string;
    attrs: Attribute[];
    nodeName: string;
    private innerHtml: string;
    parent?: VNode;
    children: VNode[];
    htmlElement?: HTMLElement;
    text?: string;
    eventListeners: EventListener[];

    constructor(app: VApp, nodeName: string, children: VNode[], innerHtml?: string, attrs?: Attribute[], parent?: VNode, id?: string) {
        if (attrs == undefined) {
            this.attrs = new Array();
        } else {
            this.attrs = attrs;
        }

        this.app = app;
        this.nodeName = nodeName;
        this.innerHtml = innerHtml;
        this.parent = parent;
        this.children = children;
        if (id != undefined) {
            this.id = id;
        } else {
            this.id = uuid();
        }

        this.attrs.push(new Attribute(kloudAppId, id));
    }

    public setInnerHtml(str: string) {
        this.app.notifyDirty();
        this.innerHtml = str;
    }

    public getInnerHtml(): string {
        return this.innerHtml;
    }

    public replaceChild(old: VNode, node: VNode) {
        this.replaceWith(old, node);
    }

    public removeChild(toRemove: VNode) {
        this.replaceWith(toRemove, undefined);
    }

    private replaceWith(toReplace: VNode, replacement?: VNode): void {
        this.app.notifyDirty();
        let replaceIndex = -1;
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i].id == toReplace.id) {
                replaceIndex = i;
                break;
            }
        }
        if (replaceIndex != -1) {
            this.children[replaceIndex] = replacement;
        }
    }

    public clone(parent: VNode): VNode {
        const id = this.id;
        const nodeName = this.nodeName;
        const innerHtml = this.innerHtml;

        const htmlElement = this.htmlElement;
        const attrs = this.attrs.map(a => a.clone());

        const clonedNode = new VNode(this.app, nodeName, [], innerHtml, attrs, parent, id);
        const children = this.children.map(c => c.clone(clonedNode));

        clonedNode.children = children;
        clonedNode.htmlElement = htmlElement;
        return clonedNode;
    }

    equals(o: VNode): boolean {
        if (o == undefined) return false;

        return this.nodeName == o.nodeName;
    }

}

export class Attribute implements Comparable<Attribute> {
    public attrName: string;
    public attrValue: string;

    constructor(attrName: string, attrValue: string) {
        this.attrName = attrName;
        this.attrValue = attrValue;
    }

    public clone(): Attribute {
        return new Attribute(this.attrName, this.attrValue);
    }

    public equals(attribute: Attribute): boolean {
        return this.attrName == attribute.attrName && this.attrValue == attribute.attrValue;
    }
}
