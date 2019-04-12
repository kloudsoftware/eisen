import { VApp } from './vdom/VApp';
import { Component, ComponentHolder } from './vdom/Component';
import { VNode, Attribute, VNodeType } from './vdom/VNode';
import { Props } from './vdom/Props';

type ComponentPropsHolder = [Component, Props];

export class Router {
    private app: VApp;
    private resolvedRouterMap: Map<string, ComponentHolder> = new Map<string, ComponentHolder>();
    public componentMap: Map<string, ComponentPropsHolder> = new Map();
    private mount: VNode;
    private currPath: string = document.location.pathname;

    constructor(app: VApp, mount: VNode) {
        this.mount = mount;
        this.app = app;

        window.onpopstate = (event) => {
            this.resolveRoute(document.location.pathname)}
    }

    registerRoute(path: string, component: Component, props?: Props) {
        if (props == undefined) {
            props = new Props(this.app);
        }
        this.componentMap.set(path, [component, props]);
    }

    hasRouteRegistered(path: string) {
        return this.componentMap.has(path);
    }

    resolveRoute(path: string): boolean {
        history.replaceState(null, "", path)


        if (this.currPath == path) {
            return true;
        }

        if (this.resolvedRouterMap.has(path)) {
            this.mount.$getChildren().forEach(child => this.mount.removeChild(child));
            this.app.remountComponent(this.resolvedRouterMap.get(path) as ComponentHolder, this.mount);
            this.currPath = path;
            return true;
        }

        if (!this.componentMap.has(path)) {
            console.error("No component registered with the router for ", path)
            return false;
        }

        this.mount.$getChildren().forEach(child => this.mount.removeChild(child));
        this.currPath = path;
        let cmp = this.componentMap.get(path);
        this.resolvedRouterMap.set(path, this.app.routerMountComponent(cmp[0], this.mount, cmp[1]));
        return true;
    }
}

export class RouterLink extends VNode {
    target: string;

    constructor(app: VApp, target: string, children: VNode[], innerHtml?: string, props?: Props, attrs?: Attribute[], parent?: VNode, id?: string) {
        super(app, "a", children, innerHtml, props, attrs, parent, id);
        this.target = target;
        this.attrs.push(new Attribute("href", target));

        this.addEventlistener("click", this.clickFunction);
    }

    clickFunction(event: Event, link: VNode) {
        const ln = link as RouterLink;
        if (ln.app.router.componentMap.has(ln.target)) {
            history.pushState({}, "", document.location.pathname)
            ln.app.router.resolveRoute(ln.target);
            event.preventDefault();
            return;
        }
    }
}
