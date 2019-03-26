import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode, Attribute, cssClass, id, labelFor, password } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";
import { css } from './adminregistercss'}

export class AdminRegister extends Component {
    public build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props): ComponentProps => {
            app.createElement("style", css, root);
            const div = app.k("div", undefined, undefined,
                              app.k("h1", "Create admin account"),
                              app.k("div", undefined, [cssClass("form-holder")],
                                    app.k("label", "Enter user name", [labelFor("iUserNam")]),
                                    app.k("input", undefined, [id("iUserName")]),
                                    app.k("label", "Enter password", [labelFor("iPassword")]),
                                    app.k("input", undefined, [id("iPassword"), password()]),
                                    app.k("label", "Confirm password", [labelFor("iPasswordConfirm")]),
                                    app.k("input", undefined, [id("iPasswordConfirm"), password()])
                                   )
                             );

            //this is called when the component is mounted to the dom
            root.appendChild(div);

            return {}
        }
    }
}
