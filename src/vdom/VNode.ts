import { Comparable, arraysEquals, Stringparser, dataRegex } from './Common';
import { VApp, AppEvent } from './VApp'
import { v4 as uuid } from 'uuid';
import { Props } from './Props';
import { EvtHandlerFunc, EvtType } from './EventHandler';
import { RouterLink } from '../Router';

/**
 * Attribute to identify a virtual node
 */
export const kloudAppId = "data-kloudappid";

/**
 * Possible type of a VNode
 * See: {@link https://dev.w3.org/html5/html-author/#the-elements}
 */
export type VNodeType = '!--...--' | '!DOCTYPE ' | 'a' | 'abbr' | 'acronym' | 'address' | 'applet' | 'area' | 'article' | 'aside' | 'audio' | 'b' | 'base' | 'basefont' | 'bdi' | 'bdo' | 'big' | 'blockquote' | 'body' | 'br' | 'button' | 'canvas' | 'caption' | 'center' | 'cite' | 'code' | 'col' | 'colgroup' | 'data' | 'datalist' | 'dd' | 'del' | 'details' | 'dfn' | 'dialog' | 'dir' | 'div' | 'dl' | 'dt' | 'em' | 'embed' | 'fieldset' | 'figcaption' | 'figure' | 'font' | 'footer' | 'form' | 'frame' | 'frameset' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'head' | 'header' | 'hr' | 'html' | 'i' | 'iframe' | 'img' | 'input' | 'ins' | 'kbd' | 'label' | 'legend' | 'li' | 'link' | 'main' | 'map' | 'mark' | 'meta' | 'meter' | 'nav' | 'noframes' | 'noscript' | 'object' | 'ol' | 'optgroup' | 'option' | 'output' | 'p' | 'param' | 'picture' | 'pre' | 'progress' | 'q' | 'rp' | 'rt' | 'ruby' | 's' | 'samp' | 'script' | 'section' | 'select' | 'small' | 'source' | 'span' | 'strike' | 'strong' | 'style' | 'sub' | 'summary' | 'sup' | 'svg' | 'table' | 'tbody' | 'td' | 'template' | 'textarea' | 'tfoot' | 'th' | 'thead' | 'time' | 'title' | 'tr' | 'track' | 'tt' | 'u' | 'ul' | 'var' | 'video' | 'wbr';

/**
 * Event firing when the Node appears on the DOM and such gets a HTMLElement
 */
export type OnDomEvent = (html: HTMLElement) => void;
function b(a) { return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, b) }
/**
 * A VNode represents a virtual DOM Node. It's the main data structure to represent a virtual DOM
 * It contains all data to render a real DOM node
 */
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
    onDomEvenList = new Array<OnDomEvent>();

    /**
     * Creates a new VNode. Typically not directly called, but through `app.k` or `appendChild`
     * @param app reference to the VApp instance
     * @param nodeName tag name of the node. Must be a valid HTML tag name
     * @param children Array containing childs of this node, if any
     * @param innerHtml the innerHTML of the node
     * @param props the props of this node, see {@link Props}
     * @param attrs attributes of this node, see {@link Attribute}
     * @param parent the parent node, if any
     * @param id the UUID of this node, to refer to it within the virtual dom. Different from the id in attributes
     */
    constructor(
        app: VApp,
        nodeName: VNodeType,
        children: VNode[],
        innerHtml?: string,
        props?: Props,
        attrs?: Attribute[],
        parent?: VNode,
        id?: string
    ) {
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

    /**
     * Sets the HTMLElement of this node, that is the real DOM node
     * Triggers the onDomEvents of this node
     * @param el the real DOM element of this node
     */
    public setHtmlElement(el: HTMLElement) {
        this.htmlElement = el;
        this.onDomEvenList.forEach(f => f(el));
    }

    /**
     * Add an eventhandler that runs when this node becomes a HTMLElement assigned
     * Contains shortcut to run the handler immediately if a HTMLElement is already assigned
     * @param func the handler to run
     */
    public addOnDomEventOrExecute(func: OnDomEvent) {
        if (this.htmlElement == undefined) {
            this.onDomEvenList.push(func)
            return;
        }

        func(this.htmlElement);
    }

    /**
     * Add a onFocus listener
     * See {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onfocus}
     * @param func handler to be run
     */
    public addFocusListener(func: EvtHandlerFunc) {
        if (this.htmlElement == undefined) {
            this.onDomEvenList.push((el) => {
                el.addEventListener("focus", func);
            });

            return;
        }
        this.htmlElement.addEventListener("focus", func);
    }

    /**
     * Add a onBlur listener
     * See {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onblur}
     * @param func handler to be run
     */
    public addBlurListener(func: EvtHandlerFunc) {
        if (this.htmlElement == undefined) {
            this.onDomEvenList.push((el) => {
                el.addEventListener("blur", func);
            });

            return;
        }
        this.htmlElement.addEventListener("blur", func);
    }

    /**
     * Adds an attribute to the node
     * replaces the value if an attribute with the given name is already found
     * @param name name of the attribute
     * @param value value of the attribute
     */
    public setAttribute(name: string, value: string) {
        const isSet = this.attrs.filter(a => a.attrName == name).length > 0;

        if (!isSet) {
            this.attrs.push(new Attribute(name, value));
            return;
        }

        this.attrs.filter(a => a.attrName == name)[0].attrValue = value;
    }

    /**
     * Get the childrens of this node
     * Handle with care, changes made to them via this function will not be tracked by the renderer
     */
    public $getChildren() {
        if (this.children.length != 0 && this.children[0] != undefined && this.children[0].nodeName == "img") {
            //console.trace()
        }
        return this.children;
    }

    /**
     * Sets the innerHtml of this node
     * Using this function marks the app as dirty
     * @param str the new innerHtml
     */
    public setInnerHtml(str: string) {
        this.app.notifyDirty();
        this.modifiedInnerHtml = true;
        this.innerHtml = str;
    }

    /**
     * Sets the innerHtml of this node
     * handle with care, changes will not be tracked by the renderer
     * @param str the new innerHtml
     */
    public $setInnerHtmlNoDirty(str: string) {
        this.modifiedInnerHtml = true;
        this.innerHtml = str;
    }

    /**
     * Returns the parsed innerHtml of this node
     * That is, all placeholders will be replaced with the corresponding props
     */
    public getInnerHtml(): string {
        return new Stringparser().parse(this.innerHtml, this.props);
    }

    /**
     * Replace a child of this node with a new one
     * Using this function marks the app as dirty
     * @param old the child that will be replaced
     * @param node the child to replace with
     */
    public replaceChild(old: VNode, node: VNode) {
        this.replaceWith(old, node);
    }

    /**
     * Remove a child of this node
     * Using this function marks the app as dirty
     * @param toRemove the child to remove
     */
    public removeChild(toRemove: VNode) {
        this.app.notifyDirty();
        this.replaceWith(toRemove, undefined);
    }

    /**
     * Append a child to this node
     * Using this function marks the app as dirty
     * @param node the child to add
     */
    public appendChild(node: VNode) {
        this.app.notifyDirty();
        node.parent = this;
        this.children.push(node);
    }

    /**
     * Add a listener to a given event, targeting this node
     * See {@link EventHandler}
     * @param evt the type of the event
     * @param func the handler to be run
     */
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

    /**
     * Clones this node, returning a new identical node that was deep copied
     * Works recursively on child nodes
     * @param parent the parent node from where to clone from
     */
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

    /**
     * Clones this node, returning a new identical node that was deep copied
     * Same as clone(), but sets an new id for every node
     * Works recursively on child nodes
     * @param parent the parent node from where to clone from
     */
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

    /**
     * Compares this node to another node
     * @param o the other node to compare
     */
    equals(o: VNode): boolean {
        if (o == undefined) return false;

        return this.nodeName == o.nodeName;
    }

    /**
     * Adds the given class[es] to the node
     * Calling this multple times appends classes
     * @param name the class name to add
     */
    public addClass = (name: string) => {
        this.app.notifyDirty();
        let classAttr = this.attrs.filter(el => el.attrName == "class")[0];
        if (classAttr == undefined) {
            classAttr = new Attribute("class", name);
            this.attrs.push(classAttr);
            return;
        }

        classAttr.attrValue = classAttr.attrValue + " " + name;
        return this;
    }

    /**
     * Checks if a given class is set on this node
     * @param name the name of the class to look for
     */
    public hasClass = (name: string): boolean => {
        const classAttr = this.attrs.filter(el => el.attrName == "class")[0];

        if (classAttr == undefined) {
            return false;
        }

        return classAttr.attrValue.indexOf(name) != -1;
    }

    /**
     * Removes the given class if it's set
     * @param name the name of the class to remove
     */
    public removeClass = (name: string) => {
        this.app.notifyDirty();
        const classAttr = this.attrs.filter(el => el.attrName == "class")[0];

        if (classAttr == undefined) {
            return;
        }

        classAttr.attrValue = classAttr.attrValue.replace(name, "");
        return this;
    }

    /**
     * Returns a new {@link VNodeBuilder} to build a VNode
     */
    public static builder(): VNodeBuilder {
        return new VNodeBuilder();
    }
}

export class VNodeBuilder {
    private app: VApp;
    private id: string;
    private attrs: Attribute[];
    private nodeName: VNodeType;
    private innerHtml: string;
    private parent?: VNode;
    private children: VNode[];
    private props: Props;

    constructor() {
        this.children = [];
        this.attrs = [];
    }

    public setApp(app: VApp): VNodeBuilder {
        this.app = app;
        return this;
    }

    public setNodeName(name: VNodeType): VNodeBuilder {
        this.nodeName = name;
        return this;
    }

    public setChildren(childs: VNode[]): VNodeBuilder {
        this.children = childs;
        return this;
    }

    public setInnerHtml(html: string) {
        this.innerHtml = html;
    }

    public setProps(props: Props): VNodeBuilder {
        this.props = props;
        return this;
    }

    public setAttrs(attrs: Attribute[]): VNodeBuilder {
        this.attrs = attrs;
        return this;
    }

    public setParent(parent: VNode): VNodeBuilder {
        this.parent = parent;
        return this;
    }

    public setId(id: string): VNodeBuilder {
        this.id = id;
        return this;
    }

    public build(): VNode {
        if (this.app == undefined) {
            console.error("VNode cant be constructed without an app");
            return undefined;
        }

        if (this.nodeName == undefined) {
            console.error("VNode cant be constructed without a node name");
            return undefined;
        }

        return new VNode(
            this.app,
            this.nodeName,
            this.children,
            this.innerHtml,
            this.props,
            this.attrs,
            this.parent,
            this.id
        );
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
export const email = () => new Attribute("type", "email");
export const src = (srcStr: string) => new Attribute("src", srcStr);

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

export type ValidationFunc = (shouldNotifyOthers: boolean) => boolean;
export type ValidationHolder = [ValidationFunc, string];

export class VInputNode extends VNode {
    validationFuncs = new Array<ValidationHolder>();
    hasError = false;
    hasValidateBlurFunction = false;

    bindObject(obj: any, key: string) {
        this.app.eventHandler.registerEventListener("input", (ev, node) => {
            obj[key] = (node.htmlElement as HTMLInputElement).value;
        }, this);
    }

    bind(object: Props, propKey: string) {
        this.onDomEvenList.push(() => {
            (this.htmlElement as HTMLInputElement).value = object.getProp(propKey) != undefined ? object.getProp(propKey) : "";
        });

        this.app.eventHandler.registerEventListener("input", (ev, node) => {
            object.setProp(propKey, (node.htmlElement as HTMLInputElement).value);
            this.props.registerCallback(propKey, (newVal: string) => {
                (this.htmlElement as HTMLInputElement).value = newVal;
            });
        }, this);
    }

    doValidation(shouldNotifyOthers: boolean) {
        return !this.validationFuncs.map(holder => {
            let result = holder[0](shouldNotifyOthers);

            if (result == false) {
                if (this.hasClass(holder[1])) {
                    return result;
                }
                this.hasError = true;
                this.addClass(holder[1])
            } else if (this.hasClass(holder[1])) {
                this.removeClass(holder[1])
            }

            return result;
        }).some((el) => el == false);
    }

    validate(validateFunc: ValidationFunc, errorClass: string) {
        this.validationFuncs.push([validateFunc, errorClass])
        if (this.hasValidateBlurFunction) {
            return;
        }

        this.addBlurListener((ev) => {
            this.doValidation(true);
        });
    }
}
