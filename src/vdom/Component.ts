import { VNode, Attribute } from "./VNode";
import { VApp } from "./VApp";


export class Component {
    componentRoot: VNode;
    app: VApp;

    constructor(app: VApp) {
        this.app = app;
        this.componentRoot = new VNode(app, "div", [], "");
    }

    public addChild(tagName: string, content = "", attrs?: [Attribute]): VNode {
        let newNode = new VNode(this.app, tagName, new Array<VNode>(), content, attrs, this.componentRoot)
        this.componentRoot.children.push(newNode);
        return newNode;
    }

    //TODO: fix this function
    public appendChild(tagName: string, parent: VNode, content = "", attrs?: [Attribute]) {
        //if (!this.inTree(parent, this.componentRoot)) {
        //    console.error("parent: ", parent, " is not located in this component")
        //    return;
        //}

        let newNode = new VNode(this.app, tagName, new Array<VNode>(), content, attrs, parent)
        this.componentRoot.children.push(newNode);
        return newNode;
    }

    private inTree(needle: VNode, hayStack: VNode): boolean {
        if (needle.id == hayStack.id) {
            return true;
        }

        return hayStack.children.map(child => this.inTree(needle, child)).find(it => it == true) != undefined ? true : false;
    }

    public mount(mountpoint: VNode) {
        this.app.notifyDirty();
        let copied = this.componentRoot.copy(this.componentRoot);
        copied.parent = mountpoint;
        mountpoint.children.push(copied);
        //console.log("mounting: ", copied);
    }

    public unmount(mountpoint: VNode) {
        mountpoint = undefined;
    }

}
