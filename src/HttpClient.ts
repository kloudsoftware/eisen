import { reject } from "q";
import { VApp } from "./vdom/VApp";

export class HttpClient {
    private basePath: string;
    app: VApp;

    constructor(basePath: string, app: VApp) {
        this.basePath = basePath;
        this.app = app;
    }

    peformGet(path: string) {
        return new Promise((resolve, reject) => {
            fetch(this.basePath + path, {
                method: "GET",
                redirect: "follow",
            }).then(resp => {
                if (resp.status == 403) {
                    window.localStorage.removeItem("token");
                    window.sessionStorage.setItem("path", document.location.pathname);
                    this.app.router.resolveRoute("/login");
                    return;
                }
                resolve(resp);
            }).catch(err => reject(err));
        });
    }

    performPost(path: string, data: any, contentType = "application/json"): Promise<Response> {
        return new Promise((resolve, reject) => {
            fetch(this.basePath + path, {
                method: "POST",
                headers: {
                    "Content-Type": contentType,
                },

                redirect: "follow",
                body: JSON.stringify(data),
            }).then(resp => {
                if (resp.status == 403) {
                    window.localStorage.removeItem("token");
                    window.sessionStorage.setItem("path", document.location.pathname);
                    this.app.router.resolveRoute("/login");
                    return;
                }
                resolve(resp);
            }).catch(err => reject(err));
        });
    }

}
