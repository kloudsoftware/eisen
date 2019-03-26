import { VApp } from './vdom/VApp';
import { VNode, Attribute, VInputNode, cssClass } from './vdom/VNode';
import { Renderer } from './vdom/render';
import { EventHandler } from './vdom/EventHandler';
import { Props } from './vdom/Props';
import { AdminRegister } from './components/adminregister/AdminRegisterComponent';

const renderer = new Renderer();
const app = new VApp("target", renderer);
app.init();

const css = `
.container {
display: flex
}

.center-container {
    justify-content: center;
}

html, body {
    width: 100%;
    height: 100%;
}
`;
app.createElement("style", css, app.rootNode);

const container = app.createElement("div", undefined, app.rootNode, [cssClass("container", "center-container")]);
app.mountComponent(new AdminRegister(), container, new Props(app));


