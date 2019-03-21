import { VApp } from './vdom/VApp';
import { VNode, Attribute } from './vdom/VNode';
import { Renderer } from './vdom/render';

let app = new VApp("target");
const renderer = new Renderer();
let vRootDiv = app.createElement("div", "", app.rootNode, [new Attribute("vrootdiv", "test")]);

//renderer.render(app);

function alterVApp(n: number, app: VApp) {
    vRootDiv.children = [];
    for (let i = 0; i <= n; i++) {
        app.createElement("div", String(n), vRootDiv);
    }

    app.createElement("input", "",  vRootDiv);
}

function transverseDom(): VNode {
    return elemToVelem(document.getElementById("target"));
}

function elemToVelem(html: Element): VNode {
    let node = new VNode(html.tagName.toLowerCase(), []);
    node.innerHtml = html.innerHTML;
    node.htmlElement = html as HTMLElement;
    for (let i = 0; i < html.attributes.length; i++) {
        let attribute = html.attributes[i];
        node.attrs.push(new Attribute(attribute.name, attribute.value));
    }

    for (let i = 0; i < html.children.length; i++) {
        let child = elemToVelem(html.children[i]);
        child.parent = node;
        node.children.push(child);
    }

    return node;
}

app.createElement("h1", "Hello world", vRootDiv);
let toRemove =app.createElement("input", undefined, vRootDiv);
app.createElement("p", "this will be removed", vRootDiv);

setTimeout(() => {
    let patch = renderer.diff(new VApp("target"), app);
    patch(app.rootNode.htmlElement);
}, 1000)

setTimeout(() => {
    toRemove.parent.children.splice(toRemove.parent.children.indexOf(toRemove));
    let app2 = new VApp("target");
    app2.rootNode = transverseDom();
    let patch = renderer.diff(app2, app);
    patch(app.rootNode.htmlElement);
}, 3000)

