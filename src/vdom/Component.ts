import { VNode, Attribute } from "./VNode";
import { VApp } from "./VApp";


class Component {
    nodeList: VNode[];
    componentRoot: VNode;
    app: VApp;

    constructor(nodeList: VNode[], app: VApp) {
        this.nodeList = nodeList;
        this.app = app;
        this.componentRoot = new VNode(app, "div", []);
    }

    public addChild(tagName: string, content = "", attrs?: [Attribute]): VNode {
        let newNode = new VNode(this.app, tagName, new Array<VNode>(), content, attrs, this.componentRoot)
        return newNode;
    }

    public appendChild(tagName: string, parent: VNode, content = "", attrs?: [Attribute]) {
        if (!this.inTree(parent, this.componentRoot)) {
            console.error("parent: ", parent, " is not located in this component")
            return;
        }

        let newNode = new VNode(this.app, tagName, new Array<VNode>(), content, attrs, parent)
        return newNode;
    }

    private inTree(needle: VNode, hayStack: VNode): boolean {
        if (needle.id == hayStack.id) {
            return true;
        }

        return hayStack.children.map(child => this.inTree(needle, child)).find(it => it == true) != undefined ? true : false;
    }

    public mount(mountpoint: VNode) {
        let copied = this.componentRoot.copy(this.componentRoot);
        copied.parent = mountpoint;
        this.app.notifyDirty();
    }

    public unmount(mountpoint: VNode) {
        mountpoint = undefined;
    }

}