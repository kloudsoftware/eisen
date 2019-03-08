import {VNode, Attribute} from './VNode'

export class VApp {
    rootNode: VNode;

    constructor(targetId: string) {
        let $root = document.getElementById(targetId);
        let $tagName = $root.tagName;
        this.rootNode = new VNode($tagName, new Array(), "", [new Attribute("id" ,$root.id)], undefined);

        this.rootNode.htmlElement = $root;
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
