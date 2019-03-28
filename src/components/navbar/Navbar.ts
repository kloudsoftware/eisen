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
            let routerLinkHome = new RouterLink(app, "/", [
                app.k("h2", { value: "{{ blogName }}", props: props })
            ], "");

            routerlnk.addClass("loginIcon");
            app.createElement("img", undefined, routerlnk, [src("login.svg"), cssClass("loginIcon")])

            app.createElement("style", css, root);
            const div = app.k("div", { attrs: [cssClass("logo-container")] }, [
                routerLinkHome,
                app.k("p", { value: "{{ blogSubtitle }}", props: props }),
                routerlnk
            ]);

            root.appendChild(div);

            return {
                remount: () => {
                    console.log("Navbar remounted")
                }
            }
        }
    }
}
