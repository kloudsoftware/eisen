import { VNode, Attribute } from './VNode'

export class VApp {
    rootNode: VNode;
    targetId: string;
    dirty: boolean;
    snapshots: VApp[] = [];

    constructor(targetId: string, rootNode?: VNode) {
        this.targetId = targetId;
        let $root = document.getElementById(targetId);
        let $tagName = $root.tagName.toLowerCase();
        this.dirty = false;
        if (rootNode != undefined) {
            this.rootNode = rootNode.clone(undefined);
        } else {
            this.rootNode = new VNode(this, $tagName, new Array(), "", [new Attribute("id", $root.id)], undefined);
            this.rootNode.htmlElement = $root;
        }
    }

    public notifyDirty() {
        if (this.dirty) {
            return;
        }
        this.dirty = true;
        this.snapshots.push(this.clone());
    }

    public getLatestSnapshot(): VApp {
        if (this.snapshots.length < 1) {
            return undefined;
        }
        return this.snapshots[this.snapshots.length - 1];
    }

    public getPreviousSnapshot(): VApp {
        if (this.snapshots.length < 2) {
            return undefined;
        }
        return this.snapshots[this.snapshots.length - 2]
    }

    public clone(): VApp {
        return new VApp(this.targetId, this.rootNode);
    }

    public createElement(tagName: string, content = "", parentNode?: VNode, attrs?: [Attribute]): VNode {
        this.notifyDirty();
        if (parentNode == undefined) {
            parentNode = this.rootNode;
        }

        let newNode = new VNode(this, tagName, new Array<VNode>(), content, attrs, parentNode);
        parentNode.children.push(newNode);

        //console.log("Adding node: ", newNode)
        return newNode;
    }
}
