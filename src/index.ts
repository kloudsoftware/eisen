import {VApp} from './vdom/VApp';
//import {Renderer} from './vdom/Render'
import {SimpleRenderer} from "./vdom/SimpleRenderer"
import { VNode, Attribute } from './vdom/VNode';

let app = new VApp("target");
let renderer = new SimpleRenderer();
let vRootDiv = app.createElement("div", "", app.rootNode, [new Attribute("vrootdiv", "test")]);

//renderer.render(app);

function alterVApp(n: number, app: VApp) {
    vRootDiv.children = [];
    for(let i = 0; i <= n; i++) {
        app.createElement("div", String(n), vRootDiv);
    }
}

function transverseDom(): VNode {
    return elemToVelem(document.getElementById("target"));
}

function elemToVelem(html: Element): VNode {
    let node = new VNode(html.tagName.toLowerCase(), []);
    node.innerHtml = html.innerHTML;
    for(let i = 0; i < html.attributes.length; i++) {
        let attribute = html.attributes[i];
        node.attrs.push(new Attribute(attribute.name, attribute.value));
    }

    for(let i = 0; i < html.children.length; i++) {
        console.log(html.children[i]);
        let child = elemToVelem(html.children[i]);
        child.parent = node;
        node.children.push(child);
    }

    return node;
}

const $root = app.rootNode.htmlElement;
alterVApp(12, app);
console.log("vRootDiv", vRootDiv);
renderer.updateElement($root, vRootDiv);
alterVApp(3, app);
console.log("new vApp", app);
renderer.updateElement($root, vRootDiv);


/*
//setInterval(() => {
    const n = Math.floor(Math.random() * 10);
    console.log("old rootnode: ", app.rootNode);
    const clone = transverseDom();
    
    alterVApp(3, app);
    const patch = renderer.diff(clone, app.rootNode);
    console.log("new rootnode: ", app.rootNode);
    patch(app.rootNode);
     
//}, 1000)
{
    const n = Math.floor(Math.random() * 10);
    console.log("old rootnode: ", app.rootNode);
    const clone = transverseDom();
    console.log("cloned real dom", clone); 
    alterVApp(4, app);
    const patch = renderer.diff(clone, app.rootNode);
    console.log("new rootnode: ", app.rootNode);
    patch(app.rootNode);
}*/
