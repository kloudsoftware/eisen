import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode, Attribute, cssClass, id, labelFor, password, VInputNode } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";
import { css } from './logincss'
import { RouterLink } from "../../Router";
import { isDefinedAndNotEmpty } from "../../vdom/Common";
import { HttpClient } from "../../HttpClient";

class UserRegisterInfo {
    userName: string;
    password: string;
    passwordConfirm: string;
}

export class Login extends Component {
    public build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props): ComponentProps => {

            root.addClass("card container");

            app.createElement("style", css, root);
            let userInfo = new UserRegisterInfo();
            let pwInput = app.k("input", { attrs: [id("iPassword"), password(), cssClass("user-input")] }) as VInputNode;
            let userName = app.k("input", { attrs: [id("iUserName"), cssClass("user-input")] }) as VInputNode;
            let routerlnk = new RouterLink(app, "/setup", [], "")
            routerlnk.addClass("router-link");

            let confirmBtn = app.createElement("span", "Login", routerlnk, [cssClass("btn btn-confirm router-btn")]);


            userName.bindObject(userInfo, "userName");
            pwInput.bindObject(userInfo, "password");

            const div = app.k("div", {}, [
                app.k("h1", { value: "Log in", attrs: [cssClass("admin-register-heading")] }),
                app.k("div", { attrs: [cssClass("form-holder")] }, [
                    app.k("label", { value: "Enter user name", attrs: [labelFor("iUserNam"), cssClass("user-input-label")] }),
                    userName,
                    app.k("label", { value: "Enter password", attrs: [labelFor("iPassword"), cssClass("user-input-label")] }),
                    pwInput,
                    routerlnk,
                ])
            ]);


            userName.validate(() => {
                return isDefinedAndNotEmpty(userInfo.userName) && userInfo.userName.length > 3
            }, "error")

            pwInput.validate(() => {
                return isDefinedAndNotEmpty(userInfo.password) && /((?=.*[a-z])(?=.*\d)(?=.*[A-Z])(?=.*[@#$%!]).{8,400})/.test(userInfo.password);
            }, "error")

            confirmBtn.addEventlistener("click", (evt, btn) => {
                evt.preventDefault();

                if (!userName.doValidation(false) ||
                    !pwInput.doValidation(false)) {

                    return false;
                }

                const http = app.get<HttpClient>("http");
                const resp = http.performPost("/token", userInfo);

                resp.then(resp => resp.json()).then(json => {
                    console.log(json);
                    window.localStorage.setItem("token", json.token);
                    const path = window.sessionStorage.getItem("path");
                    if (path != undefined) {
                        window.sessionStorage.removeItem("path");
                        app.router.resolveRoute(path);
                    }
                });

                return true;
            });

            root.appendChild(div);

            return {
                remount: () => {
                    (pwInput.htmlElement as HTMLInputElement).value = userInfo.password != undefined ? userInfo.password : "";
                    (userName.htmlElement as HTMLInputElement).value = userInfo.userName != undefined ? userInfo.userName : "";
                }
            }
        }
    }
}
