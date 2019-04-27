import { VApp } from './vdom/VApp';
import { Component, ComponentHolder } from './vdom/Component';
import { VNode, Attribute, VNodeType } from './vdom/VNode';
import { Props } from './vdom/Props';

type ComponentPropsHolder = [Component, Props];

export interface IRouter {
    resolveRoute(path: string): Promise<boolean>;
    registerRoute(path: string, component: Component, props?: Props): void;
    hasRouteRegistered(path: string): boolean;
    useMiddleWare(middleWare: MiddleWare): void;
}

export interface MiddleWare {
    check(path: string): Promise<boolean>
}

const pathVariableRegex = /{([a-zA-Z$_][a-zA-Z$_0-9]+)}/;
export class Router implements IRouter {
    private app: VApp;
    private resolvedRouterMap: Map<string, ComponentHolder> = new Map<string, ComponentHolder>();
    public componentMap: Map<string, ComponentPropsHolder> = new Map();
    private mount: VNode;
    private currPath: string = undefined;
    private middleWares: Array<MiddleWare> = new Array<MiddleWare>();
    private pathVariables: Array<string> = new Array();

    constructor(app: VApp, mount: VNode) {
        this.mount = mount;
        this.app = app;

        window.onpopstate = (event) => {
            this.resolveRoute(document.location.pathname)
        }
    }

    useMiddleWare(middleWare: MiddleWare): void {
        this.middleWares.push(middleWare);
    }

    registerRoute(path: string, component: Component, props?: Props) {
        if (props == undefined) {
            props = new Props(this.app);
        }

        const pathVars = this.splitPathVars(path);

        if (pathVars.length > 0) {
            this.pathVariables.push(path);
        }
        this.componentMap.set(path, [component, props]);
    }

    private splitPathVars(path: string): Array<string> {
        const splittedPath = path.split("/");

        return splittedPath
            .map(p => pathVariableRegex.exec(p))
            .filter(m => m != null)
            .map(m => m[1]);
    }

    hasRouteRegistered(path: string): boolean {
        if (this.pathVariables.length == 0) {
            // Short path
            return this.componentMap.has(path);
        }

        if (path.endsWith("/")) {
            path = path.substr(0, path.length -1)
        }

        const splitted = path.split("/");
        const nSlashes = splitted.length - 1;

        const possibleMatches: string[] = this.pathVariables
            .filter(e => e.split("/").length - 1 == nSlashes);

        for (let knownPath of possibleMatches) {
            let splittedKnownPath = knownPath.split("/");

            let subPathMatch = true;
            // TODO: refactor into own function?
            for (let i = 0; i < splittedKnownPath.length; i++) {
                const knownSubPath = splittedKnownPath[i];
                const givenSubPath = splitted[i];

                if (givenSubPath == undefined) {
                    subPathMatch = false;
                    break;
                }

                if (!knownSubPath.includes("{")) {
                    if (!(knownSubPath == givenSubPath)) {
                        subPathMatch = false;
                        break;
                    }
                }
            }

            if (subPathMatch) {
                return true;
            }
        }

        return false;
    }

    resolveRoute(path: string): Promise<boolean> {
        return Promise.all(this.middleWares.map(it => it.check(path))).then(() => {
            history.replaceState(null, "", path)

            if (this.currPath == path) {
                return Promise.resolve(true);
            }

            if (this.resolvedRouterMap.has(path)) {
                this.mount.$getChildren().forEach(child => this.mount.removeChild(child));
                this.app.remountComponent(this.resolvedRouterMap.get(path) as ComponentHolder, this.mount);
                this.currPath = path;
                return Promise.resolve(true);
            }

            if (!this.componentMap.has(path)) {
                return Promise.reject("No component registered with the router for " + path + " register one using 'registerRoute()'");
            }

            this.mount.$getChildren().forEach(child => this.mount.removeChild(child));
            this.currPath = path;
            let cmp = this.componentMap.get(path);
            this.resolvedRouterMap.set(path, this.app.routerMountComponent(cmp[0], this.mount, cmp[1]));
            return Promise.resolve(true);
        });
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
        if (ln.app.router.hasRouteRegistered(ln.target)) {
            history.pushState({}, "", document.location.pathname)
            ln.app.router.resolveRoute(ln.target).catch(err => console.error("Error occured in routing: ", err));
            event.preventDefault();
            return;
        }
    }
}
