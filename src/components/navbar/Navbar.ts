import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode, Attribute, cssClass, id, labelFor, password, VNodeType, src } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";

import { css } from './navbarcss';
import { RouterLink } from "../../Router";

export class Navbar extends Component {
    public build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props): ComponentProps => {
            let routerlnk = new RouterLink(app, "/login", [], "")
            routerlnk.addClass("loginIcon");
            app.createElement("img", undefined, routerlnk, [src("login.svg"), cssClass("loginIcon")])

            app.createElement("style", css, root);
            const div = app.k("div", undefined, [cssClass("logo-container")],
                app.k("h2", "kloud-ms"),
                app.k("p", "because no one wants wordpress anyway"),
                routerlnk
            );

            root.appendChild(div);

            return {}
        }
    }
}
