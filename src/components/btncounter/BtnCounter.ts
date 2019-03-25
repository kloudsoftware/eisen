import { Component, ComponentBuildFunc } from "../../vdom/Component";
import { VApp } from "../../vdom/VApp";
import { VNode } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";

export default class BtnCounter extends Component {
    build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props) => {

            props.setProp("times", 0);
            let btn = app.createElement("button", "You have clicked me {{ times }} times!", root, undefined, props);

            app.eventHandler.registerEventListener("click", (ev, _btn) => {
                props.setProp("times", props.getProp("times") + 1);
            }, btn)

            return {
                mounted: () => {
                    console.log("Mounted");
                },

                unmounted: () => {
                    console.log("unmounted");
                }
            }
        }
    }
}
