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
            app.createElement("style", css, root);
            let userInfo = new UserRegisterInfo();
            let pwInput = app.k("input", undefined, [id("iPassword"), password()]) as VInputNode;
            let pwConfirm =  app.k("input", undefined, [id("iPasswordConfirm"), password()]) as VInputNode;
            let userName = app.k("input", undefined, [id("iUserName")]) as VInputNode;
            let confirmBtn = app.k("button", "Register", [cssClass("btn", "btn-confirm")]);

            confirmBtn.addEventlistener("click", (_, btn) => {
                console.log(userInfo);
            });


            userName.bindObject(userInfo, "userName");
            pwInput.bindObject(userInfo, "password");
            pwConfirm.bindObject(userInfo, "passwordConfirm");

            const div = app.k("div", undefined, undefined,
                              app.k("h1", "Create admin account"),
                              app.k("div", undefined, [cssClass("form-holder")],
                                    app.k("label", "Enter user name", [labelFor("iUserNam")]),
                                    userName,
                                    app.k("label", "Enter password", [labelFor("iPassword")]),
                                    pwInput,
                                    app.k("label", "Confirm password", [labelFor("iPasswordConfirm")]),
                                    pwConfirm,
                                    confirmBtn,
                                   )
                             );

            //this is called when the component is mounted to the dom
            root.appendChild(div);

            return {}
        }
    }
}
