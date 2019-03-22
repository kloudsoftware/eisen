import { Component, ComponentBuildFunc, ComponentScriptFunc } from "../vdom/IComponent";
import { VNode } from "../vdom/VNode";
import { Props } from "../vdom/Props";
import { VApp } from "../vdom/VApp";

//vendor
import { schema } from "prosemirror-schema-basic"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"

export class ProsemirrorComponent extends Component {
    public build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props) => {
            let mount = app.createUnmanagedNode(root);

            //this is called when the component is mounted to the dom
            return () => {
                let $mount = mount.htmlElement;
                console.log("prose mounting to: ", $mount);

                let state = EditorState.create({ schema })
                let view = new EditorView($mount, {
                    state,
                    dispatchTransaction(transaction) {
                        console.log("Document size went from", transaction.before.content.size,
                            "to", transaction.doc.content.size)
                        let newState = view.state.apply(transaction)
                        view.updateState(newState)
                    }
                });
            }
        }
    }
}