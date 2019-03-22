import { VApp } from './vdom/VApp';
import { VNode, Attribute } from './vdom/VNode';
import { Renderer } from './vdom/render';
import { Component } from './vdom/Component'
import { EventHandler } from './vdom/EventHandler';



const renderer = new Renderer();
const app = new VApp("target", renderer);
app.init();
let vRootDiv = app.createElement("div", undefined, app.rootNode, [new Attribute("vrootdiv", "test")]);
let eventHandler = new EventHandler(app);


app.createElement("h1", "Hello world", vRootDiv);
app.createElement("input", undefined, vRootDiv);
let toRemove = app.createElement("p", "this will be removed", vRootDiv);
let btn = app.createElement("button", "click me!", vRootDiv);

const addPTag = (_, __) => {
    let container = app.createElement("div", "", vRootDiv);
    app.createElement("p", "This was added dynamicially", container)
    let rmBtn = app.createElement("button", "Remove this container", container);
    eventHandler.registerEventListener("click", rmfunc, rmBtn)
}

let rmfunc = (_, rmobj: VNode) => {
    rmobj.parent.parent.removeChild(rmobj.parent);
}

const remove = (event) => {
    toRemove.parent.removeChild(toRemove);
}

eventHandler.registerEventListener("click", addPTag, btn);
eventHandler.registerEventListener("click", remove, toRemove);


import { schema } from "prosemirror-schema-basic"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
let mount = app.createUnmanagedNode(app.rootNode);


setTimeout(() => {
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
}, 100);



/*setTimeout(() => {
    let patch = renderer.diff(new VApp("target"), app);
    patch(app.rootNode.htmlElement);
}, 1000)

setTimeout(() => {
    vRootDiv.setAttribute("foo", "fred");
    toRemove.setInnerHtml("Hello fred");
    const div = app.createElement("div", "hello", vRootDiv);
    app.createElement("p", "world", div);
    let patch = renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}, 3000)

setTimeout(() => {
    vRootDiv.setAttribute("foo", "targetMod");
    toRemove.setInnerHtml("lol");
    app.notifyDirty();
    let patch = renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}, 6000)

/*setTimeout(() => {
    console.log(app.snapshots);
    console.log(app)
    let backPatch = renderer.diff(app, app.snapshots[1])
    backPatch(app.rootNode.htmlElement);
}, 6000)
*/

