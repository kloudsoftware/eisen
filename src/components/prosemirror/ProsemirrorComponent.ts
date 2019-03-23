import { Component, ComponentBuildFunc, ComponentProps } from "../../vdom/Component";
import { VNode } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { VApp } from "../../vdom/VApp";

//vendor
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { exampleSetup } from "prosemirror-example-setup"
import css from "./prosecss";


export class ProsemirrorComponent extends Component {
  public build(app: VApp): ComponentBuildFunc {
    return (root: VNode, props: Props): ComponentProps => {
      let mount = app.createUnmanagedNode(root);
      app.createElement("style", css, mount);
      //this is called when the component is mounted to the dom
      return {
        mounted: () => {
          let $mount = mount.htmlElement;
          console.log("prose mounting to: ", $mount);

          const mySchema = new Schema({
            nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
            marks: schema.spec.marks
          })

          const editor = new EditorView($mount, {
            state: EditorState.create({
              doc: DOMParser.fromSchema(mySchema).parse($mount),
              plugins: exampleSetup({ schema: mySchema })
            })
          })

          let btn = app.createElement("button", "getTextFromEditor", root);
          app.eventHandler.registerEventListener("click", (_, button) => {
            console.log(editor.props.state.doc);
          }, btn);
        }
      }
    }
  }
}