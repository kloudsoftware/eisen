import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode, Attribute, cssClass, id, labelFor, password, VInputNode, email } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";
import { css } from './adminregistercss'
import { RouterLink } from "../../Router";
import { isDefinedAndNotEmpty } from "../../vdom/Common";

class UserRegisterInfo {
    email: string
    userName: string;
    password: string;
    passwordConfirm: string;
}

export class AdminRegister extends Component {
    public build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props): ComponentProps => {

            root.addClass("card container");

            app.createElement("style", css, root);
            let userInfo = new UserRegisterInfo();
            let pwInput = app.k("input", undefined, [id("iPassword"), password(), cssClass("user-input")]) as VInputNode;
            let pwConfirm = app.k("input", undefined, [id("iPasswordConfirm"), password(), cssClass("user-input")]) as VInputNode;
            let userName = app.k("input", undefined, [id("iUserName"), cssClass("user-input")]) as VInputNode;
            let eMailInput = app.k("input", undefined, [id("iEmail"), cssClass("user-input"), email()]) as VInputNode;
            let routerlnk = new RouterLink(app, "/foo", [], "")
            routerlnk.addClass("router-link");

            let confirmBtn = app.createElement("span", "Register", routerlnk, [cssClass("btn btn-confirm router-btn")]);

            let errorPasswordConfirm = false;
            let errorPassword = false;
            let errorUsername = false;
            let errorEmail = false;

            confirmBtn.addEventlistener("click", (evt, btn) => {
                evt.preventDefault();
                if (userInfo.password != userInfo.passwordConfirm && !errorPasswordConfirm) {
                    pwConfirm.addClass("error");
                    errorPasswordConfirm = true;
                } else if (userInfo.password == userInfo.passwordConfirm && errorPasswordConfirm) {
                    errorPasswordConfirm = false;
                    pwConfirm.removeClass("error")
                }

                if (!isDefinedAndNotEmpty(userInfo.password) && !errorPassword) {
                    errorPassword = true;
                    pwInput.addClass("error");
                } else if (isDefinedAndNotEmpty(userInfo.password) && errorPassword) {
                    pwInput.removeClass("error")
                    errorPassword = false;
                }

                if (!isDefinedAndNotEmpty(userInfo.email) && !errorEmail) {
                    errorEmail = true;
                    eMailInput.addClass("error");
                } else if (isDefinedAndNotEmpty(userInfo.email) && errorEmail) {
                    eMailInput.removeClass("error")
                    errorEmail = false;
                }

                if (!isDefinedAndNotEmpty(userInfo.userName) && !errorUsername) {
                    errorUsername = true;
                    userName.addClass("error");
                } else if (isDefinedAndNotEmpty(userInfo.userName) && errorUsername) {
                    userName.removeClass("error")
                    errorUsername = false;
                }
                if (!isDefinedAndNotEmpty(userInfo.userName) && !errorUsername) {
                    errorUsername = true;
                    userName.addClass("error");
                } else if (isDefinedAndNotEmpty(userInfo.userName) && errorUsername) {
                    userName.removeClass("error")
                    errorUsername = false;
                }

                if (errorUsername || errorEmail || errorPassword || errorPasswordConfirm) {
                    return false;
                }
                return true;
            });

            eMailInput.bindObject(userInfo, "email");
            userName.bindObject(userInfo, "userName");
            pwInput.bindObject(userInfo, "password");
            pwConfirm.bindObject(userInfo, "passwordConfirm");

            const div = app.k("div", undefined, undefined,
                app.k("h1", "Create admin account", [cssClass("admin-register-heading")]),
                app.k("div", undefined, [cssClass("form-holder")],
                    app.k("label", "Enter eMail", [labelFor("iEmail"), cssClass("user-input-label")]),
                    eMailInput,
                    app.k("label", "Enter user name", [labelFor("iUserNam"), cssClass("user-input-label")]),
                    userName,
                    app.k("label", "Enter password", [labelFor("iPassword"), cssClass("user-input-label")]),
                    pwInput,
                    app.k("label", "Confirm password", [labelFor("iPasswordConfirm"), cssClass("user-input-label")]),
                    pwConfirm,
                    routerlnk,
                )
            );

            root.appendChild(div);

            return {
                remount: () => {
                    (pwInput.htmlElement as HTMLInputElement).value = userInfo.password != undefined ? userInfo.password : "";
                    (pwConfirm.htmlElement as HTMLInputElement).value = userInfo.passwordConfirm != undefined ? userInfo.passwordConfirm : "";
                    (userName.htmlElement as HTMLInputElement).value = userInfo.userName != undefined ? userInfo.userName : "";

                }
            }
        }
    }
}
