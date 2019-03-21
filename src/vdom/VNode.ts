import { Comparable, arraysEquals } from './Common';

export class VNode implements Comparable<VNode> {
    attrs: Attribute[];
    nodeName: string;
    innerHtml: string;
    parent?: VNode;
    children: VNode[];
    htmlElement?: HTMLElement;

    constructor(nodeName: string, children: VNode[], innerHtml?: string, attrs?: Attribute[], parent?: VNode) {
        if (attrs == undefined) {
            this.attrs = new Array();
        } else {
            this.attrs = attrs;
        }

        this.nodeName = nodeName;
        this.innerHtml = innerHtml;
        this.parent = parent;
        this.children = children;
    }


    equals(o: VNode): boolean {
        if (o == undefined) return false;
        const attrSame = arraysEquals(this.attrs, o.attrs);

        return this.nodeName == o.nodeName
    }

}

export class Attribute implements Comparable<Attribute> {
    public attrName: string;
    public attrValue: string;

    constructor(attrName: string, attrValue: string) {
        this.attrName = attrName;
        this.attrValue = attrValue;
    }

    public clone(attr: Attribute): Attribute {
        return new Attribute(attr.attrName, attr.attrValue);
    }

    public equals(attribute: Attribute): boolean {
        return this.attrName == attribute.attrName && this.attrValue == attribute.attrValue;
    }
}
