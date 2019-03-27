import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode, Attribute, cssClass, id, labelFor, password, VInputNode } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";
import { css } from './logincss'
import { RouterLink } from "../../Router";

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
            let pwInput = app.k("input", undefined, [id("iPassword"), password(), cssClass("user-input")]) as VInputNode;
            let userName = app.k("input", undefined, [id("iUserName"), cssClass("user-input")]) as VInputNode;
            let routerlnk = new RouterLink(app, "/foo", [], "")
            routerlnk.addClass("router-link");

            let confirmBtn = app.createElement("span", "Register", routerlnk, [cssClass("btn btn-confirm router-btn")]);

            let errorAdded = false;

            confirmBtn.addEventlistener("click", (_, btn) => {
                return true;
            });

            userName.bindObject(userInfo, "userName");
            pwInput.bindObject(userInfo, "password");

            const div = app.k("div", undefined, undefined,
                app.k("h1", "Log in", [cssClass("admin-register-heading")]),
                app.k("div", undefined, [cssClass("form-holder")],
                    app.k("label", "Enter user name", [labelFor("iUserNam"), cssClass("user-input-label")]),
                    userName,
                    app.k("label", "Enter password", [labelFor("iPassword"), cssClass("user-input-label")]),
                    pwInput,
                    routerlnk,
                )
            );

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
