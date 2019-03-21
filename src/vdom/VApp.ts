import {VNode, Attribute} from './VNode'

export class VApp {
    rootNode: VNode;
    targetId: string;

    constructor(targetId: string, rootNode?: VNode) {
        this.targetId = targetId;
        let $root = document.getElementById(targetId);
        let $tagName = $root.tagName.toLowerCase();
        if (rootNode != undefined) {
            this.rootNode = rootNode.clone(undefined);
        } else {
            this.rootNode = new VNode($tagName, new Array(), "", [new Attribute("id" ,$root.id)], undefined);
            this.rootNode.htmlElement = $root;
        }
    }

    public clone(): VApp {
        return new VApp(this.targetId, this.rootNode);
    }

    public createElement(tagName: string, content = "", parentNode?: VNode, attrs?: [Attribute]): VNode {
        if(parentNode == undefined) {
            parentNode = this.rootNode;
        }

        let newNode = new VNode(tagName,  new Array<VNode>(), content, attrs,  parentNode);
        parentNode.children.push(newNode);

        //console.log("Adding node: ", newNode)
        return newNode;
    }
}
