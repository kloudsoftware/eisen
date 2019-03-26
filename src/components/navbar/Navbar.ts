import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode, Attribute, cssClass, id, labelFor, password, VNodeType} from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";

import { css } from './navbarcss';

export class Navbar extends Component {
    public build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props): ComponentProps => {
            app.createElement("style", css, root);
            const div = app.k("h1", undefined, undefined,
                              app.k("h1", "Foooooooo"),
                             );

            root.appendChild(div);

            return {}
        }
    }
}
