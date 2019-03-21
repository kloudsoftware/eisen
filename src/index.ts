import { VApp } from './vdom/VApp';
import { VNode, Attribute } from './vdom/VNode';
import { Renderer } from './vdom/render';

let app = new VApp("target");
const renderer = new Renderer();
let vRootDiv = app.createElement("div", undefined, app.rootNode, [new Attribute("vrootdiv", "test")]);

//renderer.render(app);

let toRemove = app.createElement("h1", "Hello world", vRootDiv);
app.createElement("input", undefined, vRootDiv);
app.createElement("p", "this will be removed", vRootDiv);

setTimeout(() => {
    let patch = renderer.diff(new VApp("target"), app);
    patch(app.rootNode.htmlElement);
}, 1000)

setTimeout(() => {
    toRemove.setInnerHtml("Hello fred");
    const div = app.createElement("div", "hello", vRootDiv);
    app.createElement("p", "world", div);
    let patch = renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}, 3000)

setTimeout(() => {
    console.log(app.snapshots);
    console.log(app)
    let backPatch = renderer.diff(app, app.snapshots[1])
    backPatch(app.rootNode.htmlElement);
},6000)

