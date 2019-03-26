import { VNode, Attribute, VInputNode, VNodeType } from './VNode'
import { Renderer } from './render';
import { Props } from './Props';
import { Component, ComponentHolder } from './Component';
import { EventHandler } from './EventHandler';
import { invokeIfDefined } from './Common';
import { Router } from '../Router';

export const unmanagedNode: string = "__UNMANAGED__"


type ElemFunc = (type: VNodeType, value: string, attrs?: Array<Attribute>, ...children: Array<VNode>) => VNode
export type AppEvent = () => void;
export type FunctionHolder = [boolean, AppEvent];

export class VApp {
    rootNode: VNode;
    targetId: string;
    dirty: boolean;
    snapshots: VApp[] = [];
    renderer: Renderer;
    eventListeners: AppEvent[] = [];
    initial = true;
    compProps: Array<ComponentHolder> = new Array<ComponentHolder>();
    compsToNotifyUnmount: Array<AppEvent> = new Array<AppEvent>();
    eventHandler: EventHandler;
    router?: Router;

    constructor(targetId: string, renderer: Renderer, rootNode?: VNode) {
        this.targetId = targetId;
        this.renderer = renderer;
        let $root = document.getElementById(targetId);
        let $tagName = $root.tagName.toLowerCase() as VNodeType;
        this.dirty = false;
        if (rootNode != undefined) {
            this.rootNode = rootNode.clone(undefined);
        } else {
            this.rootNode = new VNode(this, $tagName, new Array(), "", new Props(this), [new Attribute("id", $root.id)], undefined);
            this.rootNode.htmlElement = $root;
        }

        this.eventHandler = new EventHandler(this);
    }

    public useRouter(mount: VNode): Router {
        this.router = new Router(this, mount);
        return this.router;
    }

    public addInitialRenderEventlistener(listener: AppEvent) {
        this.eventListeners.push(listener);
    }

    public mountComponent(component: Component, mount: VNode, props: Props): VNode {
        if (props == undefined) {
            props = new Props(this);
        }

        let compMount = this.createElement("div", undefined, mount);
        let compProps = component.build(this)(compMount, props);
        this.compProps.push(new ComponentHolder(compProps, compMount));
        return compMount;
    }

    public routerMountComponent(component: Component, mount: VNode, props: Props): ComponentHolder {
        if(this.router == undefined) {
            console.error("No router mounted")
            return undefined;
        }
        if (props == undefined) {
            props = new Props(this);
        }

        let compMount = this.createElement("div", undefined, mount);
        let compProps = component.build(this)(compMount, props);
        const holder = new ComponentHolder(compProps, compMount);
        this.compProps.push(holder);
        return holder;
    }

    public remountComponent(holder: ComponentHolder, mount) {
        holder.remount[0] = false;
        mount.appendChild(holder.mount);
        this.compProps.push(holder);
    }

    public unmountComponent(mount: VNode) {
        const filteredComps = this.compProps.filter(it => it.mount == mount);

        if (filteredComps.length == 0) {
            console.error("Node is not component mount")
            return;
        } else if (!filteredComps[0].mount[0]) {
            console.error("Component cannot be unmounted before it was mounted")
            return;
        }

        let target = filteredComps[0];

        target.mount.parent.removeChild(target.mount);
        this.compProps.splice(this.compProps.indexOf(target), 1);
        this.compsToNotifyUnmount.push(target.unmounted);
    }

    public init() {
        this.snapshots.push(this.clone());
        this.tick();
    }

    private tick() {
        setInterval(() => {
            if (!this.dirty) {
                return;
            }

            console.log("Redraw");
            let patch = this.renderer.diffAgainstLatest(this);
            patch.apply(this.rootNode.htmlElement)
            this.dirty = false;
            this.snapshots.push(this.clone());


            if (this.initial) {
                this.initial = false;
                this.eventListeners.forEach(f => f())
            }

            this.compProps.filter(prop => !prop.mounted[0]).forEach(prop => {
                invokeIfDefined(prop.mounted[1])
                prop.mounted[0] = true;
            });

            this.compProps.filter(prop => !prop.remount[0]).forEach(prop => {
                invokeIfDefined(prop.remount[1])
                prop.remount[0] = true;
            });

            this.compsToNotifyUnmount.forEach(f => invokeIfDefined(f));
            this.compsToNotifyUnmount = [];

        }, 50);
    }

    public notifyDirty() {
        this.dirty = true;
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
        return new VApp(this.targetId, this.renderer, this.rootNode);
    }

    public createElement(tagName: VNodeType, content = "", parentNode?: VNode, attrs?: [Attribute], props?: Props): VNode | VInputNode {
        this.notifyDirty();
        if (props == undefined) {
            props = new Props(this);
        }
        if (parentNode == undefined) {
            parentNode = this.rootNode;
        }

        let newNode: VNode | VInputNode;

        if (tagName == "input") {
            newNode = new VInputNode(this, tagName, new Array<VNode>(), content, props, attrs, parentNode);
        } else {
            newNode = new VNode(this, tagName, new Array<VNode>(), content, props, attrs, parentNode);
        }

        parentNode.appendChild(newNode);

        //console.log("Adding node: ", newNode)
        return newNode;
    }

    public createUnmanagedNode(mount: VNode): VNode {
        this.notifyDirty();
        let unmanagedNode = new VNode(this, "div", [], "", new Props(this), [], mount, "__UNMANAGED__");
        mount.appendChild(unmanagedNode);
        return unmanagedNode;
    }

    public k: ElemFunc = (nodeName: VNodeType, value?: string, attrs?: Array<Attribute>, ...children: Array<VNode>): VInputNode | VNode => {
        if (children == undefined) {
            children = [];
        }

        if (attrs == undefined) {
            attrs = [];
        }

        if (value == undefined) {
            value = "";
        }

        let cleaned = children.filter(child => child != undefined);

        let node: VInputNode | VNode;

        if (nodeName == "input") {
            node = new VInputNode(this, nodeName, cleaned, value, new Props(this), attrs)
        } else {
            node = new VNode(this, nodeName, cleaned, value, new Props(this), attrs);
        }

        cleaned.forEach(child => {
            child.parent = node;
        });

        return node;
    }
}
