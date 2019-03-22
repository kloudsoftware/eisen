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


/*let toRemove = app.createElement("h1", "Hello world", vRootDiv);
app.createElement("input", undefined, vRootDiv);
app.createElement("p", "this will be removed", vRootDiv);
*
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



let hwComponent = new Component(app);
hwComponent.addChild("h1", "hello world!");
let container = hwComponent.addChild("div");
hwComponent.addChild("p", String(Math.floor(Math.random() * 10)));
let btn = hwComponent.addChild("button", "Click me!")

let helloWorldFunc = (event) => {
    app.createElement("h1", "test", container);
    console.log(app);
}

console.log("About to call registerEventListener");
eventHandler.registerEventListener("click", helloWorldFunc, btn);

console.log(btn.id);

hwComponent.mount(vRootDiv);

hwComponent.mount(vRootDiv);


