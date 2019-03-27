import { HttpClient } from './HttpClient';
import { VApp } from './vdom/VApp';
import { Component, ComponentHolder } from './vdom/Component';
import { VNode, Attribute, VNodeType } from './vdom/VNode';
import { Props } from './vdom/Props';

export class Router {
    app: VApp;
    resolvedRouterMap: Map<string, ComponentHolder> = new Map();
    componentMap: Map<string, Component> = new Map();
    mount: VNode;
    currPath: string;

    constructor(app: VApp, mount: VNode) {
        this.mount = mount;
        this.app = app;

        window.onpopstate = (event) => {
            this.resolveRoute(document.location.pathname)
        }
    }

    registerRoute(path: string, component: Component) {
        this.componentMap.set(path, component);
    }

    resolveRoute(path: string): boolean {
        if (this.currPath == path) {
            return true;
        }

        if (this.resolvedRouterMap.has(path)) {
            console.log("remounting")
            this.mount.$getChildren().forEach(child => this.mount.removeChild(child));
            this.app.remountComponent(this.resolvedRouterMap.get(path), this.mount);
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
        this.resolvedRouterMap.set(path, this.app.routerMountComponent(cmp, this.mount, new Props(this.app)));
    }
}

export class RouterLink extends VNode {
    target: string;

    constructor(app: VApp, target: string, children: VNode[], innerHtml?: string, props?: Props, attrs?: Attribute[], parent?: VNode, id?: string) {
        super(app, "a", children, innerHtml, props, attrs, parent, id);
        this.target = target;

        this.addEventlistener("click", (event, link) => {
            if (!this.app.router.resolveRoute(this.target)) {
                return;
            }

            event.preventDefault();
        });
    }
}
