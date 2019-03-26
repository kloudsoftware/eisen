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
        this.app = app;
    }

    registerRoute(path: string, component: Component) {
        this.componentMap.set(path, component);
    }

    resolveRoute(path: string): boolean {
        if (this.currPath == path) {
            return true;
        }

        if (this.resolvedRouterMap.has(path)) {
            //this.app.unmountComponent()
            return true;
        }

        if(!this.componentMap.has(path)) {
            return false;
        }

        let cmp = this.componentMap.get(path);
        this.app.mountComponent(cmp, this.mount, new Props(this.app));
    }
}

export class RouterLink extends VNode {

    constructor(app: VApp, nodeName: VNodeType, children: VNode[], innerHtml?: string, props?: Props, attrs?: Attribute[], parent?: VNode, id?: string) {
        super(app, "a", children, innerHtml, props, attrs, parent, id);

        //this.app.router.registerRoute()
    }
}
