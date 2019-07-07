import { Comparable, arraysEquals, Stringparser, dataRegex, raceToSuccess } from './Common';
import { VApp, AppEvent } from './VApp'
import { Props } from './Props';
import { EvtHandlerFunc, EvtType } from './EventHandler';
import { RouterLink } from '../Router';
import { getLocale } from '../i18n';

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

/**
 * A VNode represents a virtual DOM Node. It's the main data structure to represent a virtual DOM
 * It contains all data to render a real DOM node
 */
export class VNode implements Comparable<VNode> {
    /**
     * Pointer to the current VApp
     */
    app: VApp;
    /**
     * Id of this node
     */
    id: string;
    /**
     * The attributes of this node
     */
    protected attrs: Attribute[];
    /**
     * The node name of this node
     */
    nodeName: VNodeType;
    /**
     * The innerHtml of this node
     * Until parsing it contains placeholders,
     * those will be replaced upon parsing
     *
     * @see rawInnerHtml
     */
    private innerHtml: string;
    /**
     * The parent node
     */
    parent?: VNode;
    /**
     * Children of this node
     */
    private children: VNode[];
    /**
     * The real DOM node that this VNode corresponds to
     */
    htmlElement?: HTMLElement;
    /**
     * The properties of this node
     */
    props: Props;
    /**
     * Tracks if the innerHtml of this node has to be parsed
     */
    dynamicContent = false;
    /**
     * Tracks if the innerHtml has been modified
     */
    modifiedInnerHtml = false;
    /**
     * Holds all events that shoud be run when this node comes visible on the real DOM
     */
    onDomEvenList = new Array<OnDomEvent>();
    /**
     * After parsing i18n and value bindings
     * this holds the raw innerHtml before replacing
     */
    rawInnerHtml: string = undefined;
    /**
     * Holds the last resolved locale, if any
     */
    lastResolvedLocale: string = undefined;
    /**
     *  Way to find out if a given VNode is really a routerlink
     *  instanceof seems to be buggy on some cases and returns false answers
     */
    isRouterLink: boolean = undefined;


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

        if (!this.attrs.some(attr => attr.attrName == kloudAppId)) {
            this.attrs.push(new Attribute(kloudAppId, this.id));
        }

        this.attrs.map(a => a.attrName).forEach(attrName => {
            this.app.renderer.$knownAttributes.add(attrName);
        })
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

    public $getAttrs() {
        return this.attrs;
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

    public getAttributeValue(name: string): string {
        if (this.attrs == undefined) {
            return null;
        }

        const targetAttribute = this.attrs.find(it => it.attrName == name);

        return targetAttribute != undefined ? targetAttribute.attrValue : null;
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
     * Remove an attribute from the node, if it's set
     * @param attribute the name of the attribute to remove
     */
    public removeAttribute(attribute: string) {
        const isSet = this.attrs.filter(a => a.attrName == attribute);

        if (isSet != undefined && isSet.length != 0) {
            this.attrs.splice(this.attrs.indexOf(isSet[0], 1));
            this.app.notifyDirty();
            return;
        }
    }

    /**
     * Adds an attribute to the node
     * replaces the value if an attribute with the given name is already found
     * @param name name of the attribute
     * @param value value of the attribute
     */
    public setAttribute(name: string, value: string) {
        this.app.notifyDirty();
        const isSet = this.attrs.filter(a => a.attrName == name).length > 0;
        this.app.renderer.$knownAttributes.add(name);

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
        const locale = getLocale();
        const htmlToUse = this.rawInnerHtml != undefined ? this.rawInnerHtml : this.innerHtml;
        if (this.app.i18nResolver != undefined
            && this.app.i18nResolver.some(resolver => htmlToUse.startsWith(resolver.getPrefix()))
            && locale != this.lastResolvedLocale) {
            this.resolvei18n().catch((e) => console.error(e));
        }
        return new Stringparser().parse(this.innerHtml, this.props);
    }

    private resolvei18n(): Promise<void> {
        return new Promise((resolve, reject) => {
            const locale = getLocale();
            const htmlToUse = this.rawInnerHtml != undefined ? this.rawInnerHtml : this.innerHtml;
            const resolver = this.app.i18nResolver
                .filter(resolver => htmlToUse.startsWith(resolver.getPrefix()))

            const strictResolver = resolver
                .filter(r => r.isStrict())
                .map(res => {
                    return res.get(htmlToUse, locale);
                });

            const nonStrictResolver = resolver
                .filter(r => !r.isStrict())
                .map(res => {
                    return res.get(htmlToUse, locale.split("-")[0]);
                });


            const processMatch = (match: string) => {
                if (match != undefined) {
                    if (this.rawInnerHtml == undefined) {
                        this.rawInnerHtml = htmlToUse;
                    }
                    this.lastResolvedLocale = locale;
                    this.setInnerHtml(match);
                }
            };

            raceToSuccess(strictResolver)
                .then(match => {
                    processMatch(match);
                    resolve();
                }).catch(_ => {
                    raceToSuccess(nonStrictResolver).then(match => {
                        processMatch(match);
                        resolve();
                    }).catch(e => reject(e));
                });
        });
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
    public $clone(parent: VNode): VNode {
        const id = this.id;
        const nodeName = this.nodeName;
        const innerHtml = this.innerHtml;
        const props = Object.assign(this.props, {}) as Props;

        const htmlElement = this.htmlElement;
        const attrs = this.attrs.map(a => a.clone());

        const clonedNode = new VNode(this.app, nodeName, [], innerHtml, props, attrs, parent, id);
        const children = new Array<VNode>();

        this.children.forEach(child => {
            if (child == undefined) {
                children.push(undefined);
            } else {
                children.push(child.$clone(clonedNode))
            }
        })

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

    /**
     * Set the reference to the app
     * @param app the app to use
     */
    public setApp(app: VApp): VNodeBuilder {
        this.app = app;
        return this;
    }

    /**
     * Set the tag name of the node
     * @param name the tag name to use
     */
    public setNodeName(name: VNodeType): VNodeBuilder {
        this.nodeName = name;
        return this;
    }

    /**
     * Set the children of the node
     * @param childs the children to use
     */
    public setChildren(childs: VNode[]): VNodeBuilder {
        this.children = childs;
        return this;
    }

    /**
     * Set the innerHtml of the node
     * @param html the innerHtml to use
     */
    public setInnerHtml(html: string) {
        this.innerHtml = html;
    }

    /**
     * Set the props for the nodde
     * @param props the props to use
     */
    public setProps(props: Props): VNodeBuilder {
        this.props = props;
        return this;
    }

    /**
     * Set the attrs for the nodde
     * @param attrs the attrs to use
     */
    public setAttrs(attrs: Attribute[]): VNodeBuilder {
        this.attrs = attrs;
        return this;
    }

    /**
     * Set the parent for the nodde
     * @param parent the parent to use
     */
    public setParent(parent: VNode): VNodeBuilder {
        this.parent = parent;
        return this;
    }

    /**
     * Set the id for the nodde
     * @param id the id to use
     */
    public setId(id: string): VNodeBuilder {
        this.id = id;
        return this;
    }

    /**
     * Build the node as specified
     */
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

/**
 * Create an attribute adding css class[es] for a node
 * @param classNames the css class[es] to use
 */
export const cssClass = (...classNames: string[]) => {
    if (classNames.length == 1) {
        return new Attribute("class", classNames[0]);
    }

    const val = classNames.reduce((acc, curr) => acc + curr + " ", "").trim();
    return new Attribute("class", val);
}

export type InputFieldType = 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week';

/**
 * Create an attribute setting the id for a node
 * @param id the id to use
 */
export const id = (id: string) => new Attribute("id", id);

/**
 * Create an attribute setting the 'for' attribute, e.g. for a label
 * @param idFor the id for the 'for' attribute
 */
export const labelFor = (idFor: string) => new Attribute("for", idFor);

/**
 * Create an attribute setting an input field to the type 'password'
 */
export const password = () => new Attribute("type", "password");

/**
 * Create an attribute setting an input field to the type 'email'
 */
export const email = () => new Attribute("type", "email");

export const inputType = (iType: InputFieldType) => new Attribute("type", iType);
export const placeholder = (p: string) => new Attribute("placeholder", p);
/**
 * Create an attribute setting the 'src' attribute on a node
 * @param srcStr the 'src' to use
 */
export const src = (srcStr: string) => new Attribute("src", srcStr);
export const style = (style: string) => new Attribute("style", style);

/**
 * Attribute represents an attribute on a DOM node (e.g. 'id' or 'src')
 * See: {@link https://dev.w3.org/html5/html-author/#the-elements}
 */
export class Attribute implements Comparable<Attribute> {
    public attrName: string;
    public attrValue: string;

    /**
     * Creates a new Attribute
     * @param attrName the name of the attribute
     * @param attrValue the value of the attribute
     */
    constructor(attrName: string, attrValue: string) {
        this.attrName = attrName;
        this.attrValue = attrValue;
    }

    /**
     * Clones this attribute
     * Returns a deep copy
     */
    public clone(): Attribute {
        return new Attribute(this.attrName, this.attrValue);
    }

    /**
     * Compares this attribute to another one
     * @param attribute the attribute to compare with
     */
    public equals(attribute: Attribute): boolean {
        return this.attrName == attribute.attrName && this.attrValue == attribute.attrValue;
    }
}

/**
 * Defines a validation
 * If 'shouldNotifyOthers' is set, this validation function is free to
 * call other validation functions, e.g. on password confirmation fields.
 * Thus, this parameter should be used to supress infinite recursion
 */
export type ValidationFunc = (shouldNotifyOthers: boolean) => boolean;

/**
 * Holds a {@see ValidationFunc} and a string defining the error css class to apply
 */
export type ValidationHolder = [ValidationFunc, string];

/**
 * Represents an 'input' DOM node
 * Extends {@link VNode} with two way data binding and validation
 */
export class VInputNode extends VNode {
    validationFuncs = new Array<ValidationHolder>();
    hasError = false;
    hasValidateBlurFunction = false;

    /**
     * Bind the value of this input field to the given object.key
     * @param obj the object holding the value
     * @param key the key specifing the value on obj to bind
     */
    bindObject(obj: any, key: string) {
        this.app.eventHandler.registerEventListener("input", (ev, node) => {
            if (node.getAttributeValue("type") == "file") {
                const fileList = (node.htmlElement as HTMLInputElement).files;
                obj[key] = fileList != null ? fileList[0] : null;
            } else {
                obj[key] = (node.htmlElement as HTMLInputElement).value;
            }
        }, this);
    }

    /**
     * Bind the value of this input field to a {@link Props} instance
     * @param object The @{link Props} instance to bind to
     * @param propKey the key specifing the value on the props to bind to
     */
    bind(object: Props, propKey: string) {
        this.onDomEvenList.push(() => {
            (this.htmlElement as HTMLInputElement).value = object.getProp(propKey) != undefined ? object.getProp(propKey) : "";
        });

        this.app.eventHandler.registerEventListener("input", (ev, node) => {
            object.setProp(propKey, (node.htmlElement as HTMLInputElement).value);
            object.registerCallback(propKey, (newVal: string) => {
                (this.htmlElement as HTMLInputElement).value = newVal;
            });
        }, this);
    }

    /**
     * Runs all validatins on this input
     * Returns wether validation has passed
     *
     * If 'shouldNotifyOthers' is set, this validation function is free to
     * call other validation functions, e.g. on password confirmation fields.
     * Thus, this parameter should be used to supress infinite recursion
     * @param shouldNotifyOthers wether the validation function is allowed to call other validation functions
     */
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

    /**
     * Register a validation function and an errorClass
     * The errorClass will be added to the node if validation fails
     * @param validateFunc
     * @param errorClass
     */
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
