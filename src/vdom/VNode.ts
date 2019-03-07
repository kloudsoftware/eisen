export class VNode {
    attrs: Attribute[];
    nodeName: string;
    innerHtml: string;
    parent?: VNode;
    children: VNode[];
    htmlElement?: HTMLElement;

    constructor(nodeName: string, children: VNode[], innerHtml?: string, attrs?: Attribute[], parent?: VNode) {
        this.attrs = attrs;
        this.nodeName = nodeName;
        this.innerHtml = innerHtml;
        this.parent = parent;
        this.children = children;
    }

    public remove() {
        this.htmlElement.remove();
        this.children.forEach(child => child.htmlElement.remove());
        this.parent.children.splice(this.parent.children.indexOf(this), 1);
    }
}

export class Attribute {
    attrName: string;
    attrValue: string;

    constructor(attrName: string, attrValue: string) {
        this.attrName = attrName;
        this.attrValue = attrValue;
    }
}
