import { Comparable, arraysEquals, Stringparser, dataRegex } from './Common';
import { VApp, AppEvent } from './VApp'
import { v4 as uuid } from 'uuid';
import { Props } from './Props';
import { EvtHandlerFunc, EvtType } from './EventHandler';

export const kloudAppId = "data-kloudappid";

const parser = new Stringparser();

export type VNodeType =  '!--...--'|'!DOCTYPE '|'a'|'abbr'|'acronym'|'address'|'applet'|'area'|'article'|'aside'|'audio'|'b'|'base'|'basefont'|'bdi'|'bdo'|'big'|'blockquote'|'body'|'br'|'button'|'canvas'|'caption'|'center'|'cite'|'code'|'col'|'colgroup'|'data'|'datalist'|'dd'|'del'|'details'|'dfn'|'dialog'|'dir'|'div'|'dl'|'dt'|'em'|'embed'|'fieldset'|'figcaption'|'figure'|'font'|'footer'|'form'|'frame'|'frameset'|'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'head'|'header'|'hr'|'html'|'i'|'iframe'|'img'|'input'|'ins'|'kbd'|'label'|'legend'|'li'|'link'|'main'|'map'|'mark'|'meta'|'meter'|'nav'|'noframes'|'noscript'|'object'|'ol'|'optgroup'|'option'|'output'|'p'|'param'|'picture'|'pre'|'progress'|'q'|'rp'|'rt'|'ruby'|'s'|'samp'|'script'|'section'|'select'|'small'|'source'|'span'|'strike'|'strong'|'style'|'sub'|'summary'|'sup'|'svg'|'table'|'tbody'|'td'|'template'|'textarea'|'tfoot'|'th'|'thead'|'time'|'title'|'tr'|'track'|'tt'|'u'|'ul'|'var'|'video'|'wbr';

export class VNode implements Comparable<VNode> {
    app: VApp;
    id: string;
    attrs: Attribute[];
    nodeName: VNodeType;
    private innerHtml: string;
    parent?: VNode;
    private children: VNode[];
    htmlElement?: HTMLElement;
    text?: string;
    props: Props;
    dynamicContent = false;
    modifiedInnerHtml = false;

    constructor(app: VApp, nodeName: VNodeType, children: VNode[], innerHtml?: string, props?: Props, attrs?: Attribute[], parent?: VNode, id?: string) {
        if (attrs == undefined) {
            this.attrs = new Array();
        } else {
            this.attrs = attrs;
        }

        this.app = app;
        if (props == undefined) {
            props = new Props(app);
        }
        this.props = props;
        this.nodeName = nodeName;
        this.innerHtml = innerHtml;
        this.parent = parent;
        this.children = children;
        if (id != undefined) {
            this.id = id;
        }

        if (innerHtml != undefined) {
            let parsed = innerHtml.match(dataRegex)
            if (parsed != null && parsed.length != 0) {
                this.dynamicContent = true;
            }
        }

        this.attrs.push(new Attribute(kloudAppId, this.id));
    }

    public addFocusListener(func: EvtHandlerFunc) {
        this.htmlElement.addEventListener("focus", func);
    }

    public addBlurListener(func: EvtHandlerFunc) {
        this.htmlElement.addEventListener("blur", func);
    }

    public setAttribute(name: string, value: string): boolean {
        const isSet = this.attrs.filter(a => a.attrName == name).length > 0;

        if (!isSet) {
            this.attrs.push(new Attribute(name, value));
            return;
        }

        this.attrs.filter(a => a.attrName == name)[0].attrValue = value;
    }

    public $getChildren() {
        return this.children;
    }

    public setInnerHtml(str: string) {
        this.app.notifyDirty();
        this.modifiedInnerHtml = true;
        this.innerHtml = str;
    }

    public getInnerHtml(): string {
        return parser.parse(this.innerHtml, this.props);
    }

    public replaceChild(old: VNode, node: VNode) {
        this.replaceWith(old, node);
    }

    public removeChild(toRemove: VNode) {
        this.app.notifyDirty();
        this.replaceWith(toRemove, undefined);
    }

    public appendChild(node: VNode) {
        this.app.notifyDirty();
        node.parent = this;
        this.children.push(node);
    }

    public addEventlistener(evt: EvtType, func: EvtHandlerFunc) {
        this.app.eventHandler.registerEventListener(evt, func, this);
    }

    private replaceWith(toReplace: VNode, replacement?: VNode): void {
        this.app.notifyDirty();
        let replaceIndex = -1;
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] == undefined) continue;
            if (this.children[i] == toReplace) {
                replaceIndex = i;
                break;
            }
        }

        if (replaceIndex != -1) {
            this.children[replaceIndex] = replacement;
        }
    }

    public clone(parent: VNode): VNode {
        const id = this.id;
        const nodeName = this.nodeName;
        const innerHtml = this.innerHtml;
        const props = Object.assign(this.props, {}) as Props;

        const htmlElement = this.htmlElement;
        const attrs = this.attrs.map(a => a.clone());

        const clonedNode = new VNode(this.app, nodeName, [], innerHtml, props, attrs, parent, id);
        const children = [];

        this.children.forEach(child => {
            if (child == undefined) {
                children.push(undefined);
            } else {
                children.push(child.clone(clonedNode))
            }
        })

        clonedNode.children = children;
        clonedNode.htmlElement = htmlElement;
        return clonedNode;
    }

    //Sets a new id for every item
    public copy(parent: VNode): VNode {
        const id = uuid();
        const nodeName = this.nodeName;
        const innerHtml = this.innerHtml;
        const props = Object.assign(this.props, {}) as Props;

        const htmlElement = this.htmlElement;
        const attrs = this.attrs.map(a => a.clone());

        const clonedNode = new VNode(this.app, nodeName, [], innerHtml, props, attrs, parent, id);
        const children = this.children.map(c => c.copy(clonedNode));

        clonedNode.children = children;
        clonedNode.htmlElement = htmlElement;
        return clonedNode;
    }
    equals(o: VNode): boolean {
        if (o == undefined) return false;

        return this.nodeName == o.nodeName;
    }

    public addClass = (name: string) => {
        this.app.notifyDirty();
        let classAttr = this.attrs.filter(el => el.attrName == "class")[0];
        if(classAttr == undefined) {
            console.log("debug")
            classAttr = new Attribute("class", name);
            this.attrs.push(classAttr);
            return;
        }

        classAttr.attrValue = classAttr.attrValue + " " + name;
    }

    public removeClass = (name: string) => {
        this.app.notifyDirty();
        const classAttr = this.attrs.filter(el => el.attrName == "class")[0];

        if(classAttr == undefined) {
            return;
        }

        classAttr.attrValue = classAttr.attrValue.replace(name, "");
    }
}

export const cssClass = (...classNames: string[]) => {
    if (classNames.length == 1) {
        return new Attribute("class", classNames[0]);
    }

    const val = classNames.reduce((acc, curr) => acc + curr + " ", "").trim();
    return new Attribute("class", val);
}

export const id = (id: string) => new Attribute("id", id);
export const labelFor = (idFor: string) => new Attribute("for", idFor);
export const password = () => new Attribute("type", "password");

export class Attribute implements Comparable<Attribute> {
    public attrName: string;
    public attrValue: string;

    constructor(attrName: string, attrValue: string) {
        this.attrName = attrName;
        this.attrValue = attrValue;
    }

    public clone(): Attribute {
        return new Attribute(this.attrName, this.attrValue);
    }

    public equals(attribute: Attribute): boolean {
        return this.attrName == attribute.attrName && this.attrValue == attribute.attrValue;
    }
}

export class VInputNode extends VNode {

    bindObject(obj: any, key: string) {
        this.app.eventHandler.registerEventListener("input", (ev, node) => {
            obj[key] = (node.htmlElement as HTMLInputElement).value;
        }, this);
    }

    bind(object: Props, propKey: string) {
        this.app.eventHandler.registerEventListener("input", (ev, node) => {
            object.setProp(propKey, (node.htmlElement as HTMLInputElement).value);
        }, this);
    }
}
