import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode, Attribute, cssClass, id, labelFor, password, VInputNode, email } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";
import { css } from './adminregistercss'
import { RouterLink } from "../../Router";
import { HttpClient } from "../../HttpClient";
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
            let pwInput = app.k("input", { attrs: [id("iPassword"), password(), cssClass("user-input")] }) as VInputNode;
            let pwConfirm = app.k("input", { attrs: [id("iPasswordConfirm"), password(), cssClass("user-input")] }) as VInputNode;
            let userName = app.k("input", { attrs: [id("iUserName"), cssClass("user-input")] }) as VInputNode;
            let eMailInput = app.k("input", { attrs: [id("iEmail"), cssClass("user-input"), email()] }) as VInputNode;
            let routerlnk = new RouterLink(app, "/setup", [], "")
            routerlnk.addClass("router-link");

            let confirmBtn = app.createElement("span", "Register", routerlnk, [cssClass("btn btn-confirm router-btn")]);

            let errorPasswordConfirm = false;
            let errorPassword = false;
            let errorUsername = false;
            let errorEmail = false;

            const http = app.get<HttpClient>("http");


            pwInput.validate((notify) => {
                if (notify) {
                    pwConfirm.doValidation(false);
                }
                return userInfo.password == userInfo.passwordConfirm && isDefinedAndNotEmpty(userInfo.password) && /((?=.*[a-z])(?=.*\d)(?=.*[A-Z])(?=.*[@#$%!]).{8,400})/.test(userInfo.password);
            }, "error")

            pwConfirm.validate((notify) => {
                if (notify) {
                    pwInput.doValidation(false);
                }
                return userInfo.password == userInfo.passwordConfirm && isDefinedAndNotEmpty(userInfo.passwordConfirm)
            }, "error")

            eMailInput.validate(() => {
                return isDefinedAndNotEmpty(userInfo.email)
            }, "error")

            userName.validate(() => {
                return isDefinedAndNotEmpty(userInfo.userName) && userInfo.userName.length > 3
            }, "error")
            confirmBtn.addEventlistener("click", (evt, btn) => {
                if (!eMailInput.doValidation(false) ||
                    !userName.doValidation(false) ||
                    !pwInput.doValidation(true)) {

                    return false;
                }

                const resp = http.performPost("/register", userInfo);

                resp.then(resp => resp.json()).then(json => {
                    window.localStorage.setItem("token", json.token);
                    const path = window.sessionStorage.getItem("path");
                    if (path != undefined) {
                        window.sessionStorage.removeItem("path");
                        app.router.resolveRoute(path);
                    }
                });

                return true;
            });

            eMailInput.bindObject(userInfo, "email");
            userName.bindObject(userInfo, "userName");
            pwInput.bindObject(userInfo, "password");
            pwConfirm.bindObject(userInfo, "passwordConfirm");

            const div = app.k("div", {}, [
                app.k("h1", { value: "Create admin account", attrs: [cssClass("admin-register-heading")] }),
                app.k("div", { attrs: [cssClass("form-holder")] }, [
                    app.k("label", { value: "Enter eMail", attrs: [labelFor("iEmail"), cssClass("user-input-label")] }),
                    eMailInput,
                    app.k("label", { value: "Enter user name", attrs: [labelFor("iUserNam"), cssClass("user-input-label")] }),
                    userName,
                    app.k("label", { value: "Enter password", attrs: [labelFor("iPassword"), cssClass("user-input-label")] }),
                    pwInput,
                    app.k("label", { value: "Confirm password", attrs: [labelFor("iPasswordConfirm"), cssClass("user-input-label")] }),
                    pwConfirm,
                    routerlnk,
                ]),
            ]);


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
