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

const splitAtSlash = (s: string): Array<string> => s.split("/");
const stringIncludesCurlyBrace = (s: string): boolean => s.includes("{");

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
        const splittedPath = splitAtSlash(path);

        return splittedPath
            .map(p => pathVariableRegex.exec(p))
            .filter(m => m != null)
            .map(m => m[1]);
    }

    hasRouteRegistered(path: string): boolean {
        return this.findMatchingPath(path) != undefined;
    }

    private findMatchingPath(path: string): string {
        // Short path
        if (this.componentMap.has(path)) {
            return path;
        }

        if (path.endsWith("/")) {
            path = path.substr(0, path.length - 1)
        }

        const splitted = splitAtSlash(path);
        const nSlashes = splitted.length - 1;

        const possibleMatches: string[] = this.pathVariables
            .filter(e => splitAtSlash(e).length - 1 == nSlashes);

        for (let knownPath of possibleMatches) {
            let splittedKnownPath = knownPath.split("/");

            if (this.matchSubPath(splittedKnownPath, splitted)) {
                return knownPath;
            }
        }

        return undefined;
    }

    private matchSubPath(splittedKnownPath: Array<string>, splitted: Array<string>): boolean {
        for (let i = 0; i < splittedKnownPath.length; i++) {
            const knownSubPath = splittedKnownPath[i];
            const givenSubPath = splitted[i];

            if (givenSubPath == undefined) {
                return false;
            }

            if (!stringIncludesCurlyBrace(knownSubPath)) {
                if (!(knownSubPath == givenSubPath)) {
                    return false;
                }
            }
        }

        return true;
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

            const foundPath = this.findMatchingPath(path);

            if (foundPath == undefined) {
                return Promise.reject("No component registered with the router for " + path + " register one using 'registerRoute()'");
            }

            this.mount.$getChildren().forEach(child => this.mount.removeChild(child));
            this.currPath = path;
            let cmp = this.componentMap.get(foundPath);
            if (stringIncludesCurlyBrace(foundPath)) {
                const foundVars = splitAtSlash(foundPath);
                const givenVars = splitAtSlash(path);
                const props: Props = cmp[1];

                for (let i = 0; i < foundVars.length; i++) {
                    if (stringIncludesCurlyBrace(foundVars[i])) {
                        const key = "_" + foundVars[i].replace("{", "").replace("}", "");
                        props.setProp(key, givenVars[i]);
                    }
                }
            }
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
