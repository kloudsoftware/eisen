import { VApp } from './vdom/VApp';
import { VNode, Attribute } from './vdom/VNode';
import { Renderer } from './vdom/render';
import { Component } from './vdom/Component'
import { EventHandler } from './vdom/EventHandler';

let app = new VApp("target");
const renderer = new Renderer();
let vRootDiv = app.createElement("div", undefined, app.rootNode, [new Attribute("vrootdiv", "test")]);
let eventHandler = new EventHandler(app);


let toRemove = app.createElement("h1", "Hello world", vRootDiv);
app.createElement("input", undefined, vRootDiv);
app.createElement("p", "this will be removed", vRootDiv);

setTimeout(() => {
    let patch = renderer.diff(new VApp("target"), app);
    patch(app.rootNode.htmlElement);
}, 1000)

setTimeout(() => {
    vRootDiv.attrs.push(new Attribute("id", "target"));
    toRemove.setInnerHtml("Hello fred");
    const div = app.createElement("div", "hello", vRootDiv);
    app.createElement("p", "world", div);
    let patch = renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}, 3000)

setTimeout(() => {
    vRootDiv.attrs.push(new Attribute("id", "targetmod"));
    //app.notifyDirty();
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

/*let helloWorldFunc = (event) => {
    alert("hello world");
}

let hwComponent = new Component(app);

hwComponent.addChild("h1", "hello world!");
hwComponent.addChild("p", String(Math.floor(Math.random() * 10)));
let btn = hwComponent.addChild("button", "Click me!")

eventHandler.registerEventListener("click", helloWorldFunc, btn);

console.log(btn.id);

hwComponent.mount(vRootDiv);

hwComponent.mount(vRootDiv);

let patch = renderer.diffAgainstLatest(app);
patch(app.rootNode.htmlElement);
console.log(app);
*/

