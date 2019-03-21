import { Comparable, arraysEquals } from './Common';
import { VApp } from './VApp'
import { v4 as uuid } from 'uuid';


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
    }

    public setInnerHtml(str: string) {
        this.app.notifyDirty();
        this.innerHtml = str;
    }

    public getInnerHtml(): string {
        return this.innerHtml;
    }
    public removeChild(toRemove: VNode) {
        this.app.notifyDirty();
        let removeIndex = -1;
        for(let i = 0; i < this.children.length; i++) {
            if (this.children[i].id == toRemove.id) {
                removeIndex = i;
                break;
            }
        }
        if (removeIndex != -1) {
            this.children[removeIndex] = undefined;
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
        const attrSame = arraysEquals(this.attrs, o.attrs);

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
