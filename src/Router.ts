import {HttpClient} from './HttpClient';

export class Router {
    private routes: [Route];
    private container: HTMLDivElement;

    constructor(containerIdentifier: string) {
        this.container = document.getElementById(containerIdentifier) as HTMLDivElement;
    }

    public init() {
        let router = this;
​        window.onclick = function (e: any) {
            if (e.target.localName == 'a') {
                let anchor: HTMLAnchorElement = e.target;
                if(checkResponsible(anchor)) {
                    router.handleClick(anchor);
                    e.preventDefault();
                }
            }
        }​
    }

    //TODO: Find a better way to identify the route separator?
    public handleClick(anchor: HTMLAnchorElement) {
        const cleanedPath = anchor.href.split("/#/")[1];
        const route = this.routes.filter(route => cleanedPath == route.path)[0];
        if(!route) {
            throw new Error("No applicable route found for: " + cleanedPath);
        }

        const htmlContent = route.getContent();
        this.container.innerHTML = htmlContent;
    }


    public addRoute(route: Route) {
        this.routes.push(route);
    }
}

function checkResponsible(link: HTMLAnchorElement): boolean {
    return link.href.indexOf("/#/") != -1;
}

export class Route {
    public path: string;
    private content: RouteContent;
    constructor (path: string, content: RouteContent) {
        this.path = path;
        this.content = content;
    }

    public getContent(): string {
        return this.content.getContent();
    }
}

abstract class RouteContent {
    public abstract getContent(): string;
}

export class LocalRouteContent extends RouteContent {
    private content: string;

    public getContent(): string {
        return this.content;
    }

    constructor(content: string) {
        super();
        this.content = content;
    }
}

class RouteContentDTO {
    htmlData: string;
}

export class RemoteRouteContent extends RouteContent {
    private httpClient: HttpClient;
    private path: string;

    public getContent(): string {
        let resp = this.httpClient.peformGet<RouteContentDTO>("/foo");
        return resp.htmlData;
    }

    constructor(httpClient: HttpClient, path: string) {
        super();
        this.httpClient = httpClient;
        this.path = path;
    }
}
