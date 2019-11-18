import { VNode, Attribute, VInputNode, VNodeType } from './VNode'
import { Renderer } from './render';
import { Props } from './Props';
import { Component, ComponentHolder } from './Component';
import { EventHandler } from './EventHandler';
import { invokeIfDefined } from './Common';
import { Router, IRouter } from '../Router';
import { Resolver } from '../i18n/Resolver';
import { EventPipeline } from './GlobalEvent';

export const unmanagedNode: string = "__UNMANAGED__"


export type AppEvent = () => void;
export type FunctionHolder = [boolean, AppEvent];

export interface NodeOptions {
    attrs?: Attribute[];
    props?: Props;
    value?: string
}

type ElemFunc = (type: VNodeType, options?: NodeOptions, children?: Array<VNode>) => VNode

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
    router?: IRouter;
    pluginMap: Map<string, any> = new Map();
    oneTimeRenderCallbacks = new Array<AppEvent>();
    i18nResolver: Array<Resolver>;
    eventPipeLine: EventPipeline = new EventPipeline();

    /**
     * Constructs the app
     * @param targetId id of the DOM mountpoint, defined in your index.html
     * @param renderer an Instance of the Renderer
     * @param rootNode Used to clone the VApp, ignore on creation of a new one
     */
    constructor(targetId: string, renderer: Renderer, rootNode?: VNode) {
        this.targetId = targetId;
        this.renderer = renderer;
        let $root = document.getElementById(targetId);
        let $tagName = $root.tagName.toLowerCase() as VNodeType;
        this.dirty = false;
        if (rootNode != undefined) {
            this.rootNode = rootNode.$clone(undefined);
        } else {
            this.rootNode = new VNode(this, $tagName, new Array(), "", new Props(this), [new Attribute("id", $root.id)], undefined);
            this.rootNode.htmlElement = $root;
        }

        this.eventHandler = new EventHandler(this);
    }

    /**
     * Use the default router for this app
     * @param mount The mountpoint for the Router
     */
    public useRouter(mount: VNode): IRouter {
        this.router = new Router(this, mount);
        return this.router;
    }

    /**
     * Use custom router for this app
     * @param router The custom router instance
     */
    public useCustomRouter(router: IRouter): IRouter {
        this.router = router;
        return this.router;
    }

   /**
     * Adds a callback to the initial render of this app, its executed after the initial render is done and all elements of it are on the dom.
     * @param listener
     */ public addInitialRenderEventlistener(listener: AppEvent) {
        this.eventListeners.push(listener);
    }

   /**
     * Mounts a component to this app
     * @param component The component to mount
     * @param mount the mountpoint for the Component
     * @param props Any properties, passed into the Component
     */
    public mountComponent(component: Component, mount: VNode, props: Props): VNode {
        if (props == undefined) {
            props = new Props(this);
        }

        let compMount = this.k("div");
        compMount.parent = mount;
        mount.$getChildren().push(compMount);
        let compProps = component.build(this)(compMount, props);
        this.compProps.push(new ComponentHolder(compProps, compMount));
        this.notifyDirty();
        return compMount;
    }

    /**
     * Mounts a component and returns the full ComponentHolder, used by the Router
     * @param component
     * @param mount
     * @param props
     */
    public routerMountComponent(component: Component, mount: VNode, props: Props): ComponentHolder {
        if (this.router == undefined) {
            console.error("No router mounted");
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

    /**
      * Remounts a previously mounted component. Primarily used by the Router
      * @param holder The ComponentHolder object, holds necessary callbacks
      * @param mount Mountpoint for this component
      */
    public remountComponent(holder: ComponentHolder, mount: VNode) {
        holder.remount[0] = false;
        mount.appendChild(holder.mount);
        if(!this.compProps.includes(holder)) {
            this.compProps.push(holder);
        }
    }

    /**
      * Unmounts a component that was mounted on this app
      * @param mount Mountpoint, returned by VApp.mountComponent
      */
    public unmountComponent(mount: VNode) {
        const filteredComps = this.compProps.filter(it => it.mount == mount);

        if (filteredComps.length == 0) {
            console.error("Node is not component mount")
            return;
        } else if (!filteredComps[0].mounted) {
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

            let patch = this.renderer.diffAgainstLatest(this);
            patch(this.rootNode.htmlElement);
            this.dirty = false;
            this.snapshots.push(this.clone());


            if (this.initial) {
                this.initial = false;
                this.eventListeners.forEach(f => f())
            }

            this.compProps.filter(prop => !prop.mounted[0]).forEach(prop => {
                prop.mounted[0] = true;
                invokeIfDefined(prop.mounted[1])
            });

            this.compProps.filter(prop => !prop.remount[0]).forEach(prop => {
                prop.remount[0] = true;
                invokeIfDefined(prop.remount[1])
            });

            this.compsToNotifyUnmount.forEach(f => invokeIfDefined(f));
            this.compsToNotifyUnmount = [];

        }, 50);
    }

    /** Notifies that a redraw of the app is needed */
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

    /**
     * Creates a VNode and appends it as a child to the parentNode
     * @param tagName HTML tagName
     * @param content Value of the element(innerHTML)
     * @param parentNode The node will be appended as a child to this node
     * @param attrs any attributes
     * @param props Properties for the node
     */
    public createElement(tagName: VNodeType, content = "", parentNode?: VNode, attrs?: Attribute[], props?: Props): VNode | VInputNode {
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

    /**
     * Creates an unmanagedNode (its childnodes are ignored by the renderer) at a specified mountpoint.
     * @param mount
     */
    public createUnmanagedNode(mount: VNode): VNode {
        this.notifyDirty();
        return this.createUnmanagedNoDirty(mount);
    }

    /**
      * Creates an unmanagedNode (its childnodes are ignored by the renderer) at a specified mountpoint. This operation does not cause a re-render
      * @param mount
      */
    public createUnmanagedNoDirty(mount: VNode) {
        let unmanagedNode = new VNode(this, "div", [], "", new Props(this), [], mount, "__UNMANAGED__");
        mount.$getChildren().push(unmanagedNode);
        return unmanagedNode;
    }


    /**
     * Creates a VNode, useful for cleanly modelling a DOM structure using the children array and optional nodeOptions
     * @param nodeName Type of the HTML tag
     * @param options
     * @param children
     */
    public k(nodeName: VNodeType, options?: NodeOptions, children?: Array<VNode>): VInputNode | VNode {
        let attrs: Attribute[];
        let props: Props;
        let value: string;

        if (children == undefined) {
            children = [];
        }

        if (options == undefined) {
            attrs = [];
            value = "";
            props = new Props(this);
        } else {
            attrs = options.attrs != undefined ? options.attrs : [];
            props = options.props != undefined ? options.props : new Props(this);
            value = options.value != undefined ? options.value : "";
        }

        let cleaned = children.filter(child => true);

        let node: VInputNode | VNode;

        if (nodeName == "input") {
            node = new VInputNode(this, nodeName, cleaned, value, props, attrs)
        } else {
            node = new VNode(this, nodeName, cleaned, value, props, attrs);
        }

        cleaned.forEach(child => {
            child.parent = node;
        });

        return node;
    }

    /**
     * Adds an object into the pluginMap, retrieve it using VApp.get()
     * @param key key where this object is stored
     * @param obj
     */
    public use(key: string, obj: any) {
        this.pluginMap.set(key, obj);
    }

    /**
     * retrieve an object saved in the app, using VApp.use()
     * @param key
     */
    public get<T>(key: string) {
        return this.pluginMap.get(key) as T;
    }

    /**
     * Configure the VApp to add an additional resolver for i18n strings
     * @param resolver
     */
    public useTranslationResolver(resolver: Resolver) {
        if (this.i18nResolver == undefined) {
            this.i18nResolver = new Array<Resolver>()
        }

        this.i18nResolver.push(resolver);
    }
}
