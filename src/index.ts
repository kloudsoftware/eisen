import { VApp } from './vdom/VApp';
import { cssClass } from './vdom/VNode';
import { Renderer } from './vdom/render';
import { Props } from './vdom/Props';
import { AdminRegister } from './components/adminregister/AdminRegisterComponent';
import { Navbar } from './components/navbar/Navbar';
import BtnCounter from './components/btncounter/BtnCounter';
import { Login } from './components/login/LoginComponent';
import { HttpClient } from './HttpClient';

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

app.use("http", new HttpClient("http://192.168.111.118:8083", app));

app.mountComponent(new Navbar(), app.rootNode, new Props(app));

const container = app.createElement("div", undefined, app.rootNode, [cssClass("container", "center-container")]);

const routerMnt = app.createElement("div", undefined, container);

const router = app.useRouter(routerMnt);

router.registerRoute("/", new AdminRegister())
router.registerRoute("/foo", new BtnCounter());
router.registerRoute("/login", new Login());
router.resolveRoute(document.location.pathname);
