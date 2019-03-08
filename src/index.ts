import {VApp} from './vdom/VApp';
import {Renderer} from './vdom/Render'
import { VNode, Attribute } from './vdom/VNode';

let app = new VApp("target");
let renderer = new Renderer();
let vRootDiv = app.createElement("div", "", app.rootNode, [new Attribute("vRootDiv", "test")]);

renderer.render(app);

function alterVApp(n: number, app: VApp) {
    vRootDiv.children = [];
    for(let i = 0; i <= n; i++) {
        app.createElement("p", String(n), vRootDiv);
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
    }

    return node;
}

//setInterval(() => {
    const n = Math.floor(Math.random() * 10);
    console.log("old rootnode: ", app.rootNode);
    const clone = transverseDom();
    alterVApp(n, app);
    const patch = renderer.diff(clone, app.rootNode);
    console.log("new rootnode: ", app.rootNode);
    patch(app.rootNode);
//}, 1000)
{
    const n = Math.floor(Math.random() * 10);
    console.log("old rootnode: ", app.rootNode);
    const clone = transverseDom();
    alterVApp(n, app);
    const patch = renderer.diff(clone, app.rootNode);
    console.log("new rootnode: ", app.rootNode);
    patch(app.rootNode);
}
