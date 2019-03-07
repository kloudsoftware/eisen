import {VApp} from './vdom/VApp';
import {Renderer} from './vdom/Render'
import { Attribute } from './vdom/VNode';

let app = new VApp("target");
let renderer = new Renderer();

let paragraph = app.createElement("div");
app.createElement( "p", "Hello World", paragraph);
renderer.render(app);
