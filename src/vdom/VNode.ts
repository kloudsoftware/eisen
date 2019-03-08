export class VNode {
    attrs: Attribute[];
    nodeName: string;
    innerHtml: string;
    parent?: VNode;
    children: VNode[];
    htmlElement?: HTMLElement;

    constructor(nodeName: string, children: VNode[], innerHtml?: string, attrs?: Attribute[], parent?: VNode) {
        if(attrs == undefined) {
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
        console.log("Removing!!!")
        this.htmlElement.remove();
        this.children.forEach(child => child.htmlElement.remove());
        this.parent.children.splice(this.parent.children.indexOf(this), 1);
    }

    public replaceWith(node: VNode) {
        this.nodeName = node.nodeName;
        this.innerHtml = node.innerHtml;
        this.attrs = node.attrs;
        this.htmlElement.replaceWith(node.htmlElement);
        this.htmlElement = node.htmlElement;
    }

    public static clone(node?: VNode, child?: VNode): VNode {
        if(node == undefined || parent == undefined) {
            console.log("Test")
            return undefined;
        }

        if(node.children.indexOf(child) != 0) {
            return node;
        }

        let copy = new VNode(node.nodeName, []);
        copy.htmlElement = node.htmlElement;
        copy.parent = VNode.clone(node.parent);
        node.attrs.forEach(attr => copy.attrs.push(attr.clone(attr)));
        node.children.forEach(child => copy.children.push(VNode.clone(child)));
        return copy;
    }
}

export class Attribute {
    public attrName: string;
    public attrValue: string;

    constructor(attrName: string, attrValue: string) {
        this.attrName = attrName;
        this.attrValue = attrValue;
    }

    public clone(attr: Attribute): Attribute {
        return new Attribute(attr.attrName, attr.attrValue);
    }
}
