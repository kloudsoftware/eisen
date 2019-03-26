import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode, Attribute, cssClass, id, labelFor, password, VInputNode } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";
import { css } from './adminregistercss'

class UserRegisterInfo {
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
            let pwInput = app.k("input", undefined, [id("iPassword"), password(),  cssClass("user-input")]) as VInputNode;
            let pwConfirm =  app.k("input", undefined, [id("iPasswordConfirm"), password(),  cssClass("user-input")]) as VInputNode;
            let userName = app.k("input", undefined, [id("iUserName"),  cssClass("user-input")]) as VInputNode;
            let confirmBtn = app.k("button", "Register", [cssClass("btn", "btn-confirm")]);

            let errorAdded = false;

            confirmBtn.addEventlistener("click", (_, btn) => {
                if(userInfo.password != userInfo.passwordConfirm && !errorAdded) {
                    pwConfirm.addClass("error");
                    errorAdded = true;
                    return;
                } else if(userInfo.password == userInfo.passwordConfirm) {
                    errorAdded = false;
                    pwConfirm.removeClass("error")
                }

                console.log(userInfo)

            });

            userName.bindObject(userInfo, "userName");
            pwInput.bindObject(userInfo, "password");
            pwConfirm.bindObject(userInfo, "passwordConfirm");

            const div = app.k("div", undefined, undefined,
                              app.k("h1", "Create admin account", [cssClass("admin-register-heading")]),
                              app.k("div", undefined, [cssClass("form-holder")],
                                    app.k("label", "Enter user name", [labelFor("iUserNam"), cssClass("user-input-label")]),
                                    userName,
                                    app.k("label", "Enter password", [labelFor("iPassword"), cssClass("user-input-label")]),
                                    pwInput,
                                    app.k("label", "Confirm password", [labelFor("iPasswordConfirm"), cssClass("user-input-label")]),
                                    pwConfirm,
                                    confirmBtn,
                                   )
                             );

            root.appendChild(div);

            return {}
        }
    }
}
