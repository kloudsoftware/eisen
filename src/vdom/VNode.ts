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

    public remove() {
        console.log("Removing!!!", this);
        this.htmlElement.remove();
        this.children.forEach(child => child.htmlElement.remove());
        this.parent.children.splice(this.parent.children.indexOf(this), 1);
    }

    public replaceWith(node: VNode) {
        if (node.htmlElement == undefined || this.htmlElement == undefined) {
            //debugger;
        }
        this.nodeName = node.nodeName;
        this.innerHtml = node.innerHtml;
        this.attrs = node.attrs;
        if (this.htmlElement != undefined) {
            this.htmlElement.replaceWith(node.htmlElement);
        }

        this.htmlElement = node.htmlElement;
    }

    public static clone(node?: VNode, child?: VNode): VNode {
        if (node == undefined || parent == undefined) {
            console.log("Test")
            return undefined;
        }

        if (node.children.indexOf(child) != 0) {
            return node;
        }

        let copy = new VNode(node.nodeName, []);
        copy.htmlElement = node.htmlElement;
        copy.parent = VNode.clone(node.parent);
        node.attrs.forEach(attr => copy.attrs.push(attr.clone(attr)));
        node.children.forEach(child => copy.children.push(VNode.clone(child)));
        return copy;
    }


    equals(o: VNode): boolean {
        if (o == undefined) return false;
        const attrSame = arraysEquals(this.attrs, o.attrs);

        return this.nodeName == o.nodeName
            && this.innerHtml == o.innerHtml
            && attrSame;
    }

    equalsWithoutHTML(o: VNode): boolean {
        if (o == undefined) return false;

        return this.nodeName == o.nodeName
            && arraysEquals(this.attrs, o.attrs);
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
