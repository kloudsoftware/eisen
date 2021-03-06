import {Comparable, dataRegex, raceToSuccess, Stringparser} from './Common';
import {VApp} from './VApp'
import {Props} from './Props';
import {EvtHandlerFunc, EvtType} from './EventHandler';
import {getLocale} from '../i18n/Resolver';

export type VNodeType =
    '!--...--'
    | '!DOCTYPE '
    | 'a'
    | 'abbr'
    | 'acronym'
    | 'address'
    | 'applet'
    | 'area'
    | 'article'
    | 'aside'
    | 'audio'
    | 'b'
    | 'base'
    | 'basefont'
    | 'bdi'
    | 'bdo'
    | 'big'
    | 'blockquote'
    | 'body'
    | 'br'
    | 'button'
    | 'canvas'
    | 'caption'
    | 'center'
    | 'cite'
    | 'code'
    | 'col'
    | 'colgroup'
    | 'data'
    | 'datalist'
    | 'dd'
    | 'del'
    | 'details'
    | 'dfn'
    | 'dialog'
    | 'dir'
    | 'div'
    | 'dl'
    | 'dt'
    | 'em'
    | 'embed'
    | 'fieldset'
    | 'figcaption'
    | 'figure'
    | 'font'
    | 'footer'
    | 'form'
    | 'frame'
    | 'frameset'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'head'
    | 'header'
    | 'hr'
    | 'html'
    | 'i'
    | 'iframe'
    | 'img'
    | 'input'
    | 'ins'
    | 'kbd'
    | 'label'
    | 'legend'
    | 'li'
    | 'link'
    | 'main'
    | 'map'
    | 'mark'
    | 'meta'
    | 'meter'
    | 'nav'
    | 'noframes'
    | 'noscript'
    | 'object'
    | 'ol'
    | 'optgroup'
    | 'option'
    | 'output'
    | 'p'
    | 'param'
    | 'picture'
    | 'pre'
    | 'progress'
    | 'q'
    | 'rp'
    | 'rt'
    | 'ruby'
    | 's'
    | 'samp'
    | 'script'
    | 'section'
    | 'select'
    | 'small'
    | 'source'
    | 'span'
    | 'strike'
    | 'strong'
    | 'style'
    | 'sub'
    | 'summary'
    | 'sup'
    | 'svg'
    | 'table'
    | 'tbody'
    | 'td'
    | 'template'
    | 'textarea'
    | 'tfoot'
    | 'th'
    | 'thead'
    | 'time'
    | 'title'
    | 'tr'
    | 'track'
    | 'tt'
    | 'u'
    | 'ul'
    | 'var'
    | 'video'
    | 'wbr';

export type OnDomEvent = (html: HTMLElement) => void;

export class VNode implements Comparable<VNode> {
    app: VApp;
    id: string;
    nodeName: VNodeType;
    parent?: VNode;
    htmlElement?: HTMLElement | undefined;
    text?: string;
    props: Props;
    dynamicContent = false;
    modifiedInnerHtml = false;
    onDomEvenList = new Array<OnDomEvent>();
    rawInnerHtml: string = undefined;
    lastResolvedLocale: string = undefined;
    // instanceof seems to be buggy on some cases and returns false answers
    isRouterLink: boolean = false;
    public children: VNode[];
    protected attrs: Attribute[];
    private innerHtml: string;

    constructor(app: VApp, nodeName: VNodeType, children: VNode[], innerHtml?: string, props?: Props, attrs?: Attribute[], parent?: VNode, id?: string) {
        if (attrs == undefined) {
            this.attrs = [];
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
            let parsed = innerHtml.match(dataRegex);
            if (parsed != null && parsed.length != 0) {
                this.dynamicContent = true;
            }
        }

        this.attrs.map(a => a.attrName).forEach(attrName => {
            this.app.renderer.$knownAttributes.add(attrName);
        })
    }

    public addFocusListener(func: EvtHandlerFunc) {
        if (this.htmlElement == undefined) {
            this.onDomEvenList.push((el) => {
                el.addEventListener("focus", func);
            });

            return;
        }
        this.htmlElement.addEventListener("focus", func);
    }

    public setHtmlElement(el: HTMLElement) {
        this.htmlElement = el;
        this.onDomEvenList.forEach(f => f(el));
    }

    public addOnDomEventOrExecute(func: OnDomEvent) {
        if (this.htmlElement == undefined) {
            this.onDomEvenList.push(func);
            return;
        }

        func(this.htmlElement);
    }

    public $getAttrs() {
        return this.attrs;
    }

    public getAttributeValue(name: string): string {
        if (this.attrs == undefined) {
            return null;
        }

        const targetAttribute = this.attrs.find(it => it.attrName == name);

        return targetAttribute != undefined ? targetAttribute.attrValue : null;
    }

    public addBlurListener(func: EvtHandlerFunc) {
        if (this.htmlElement == undefined) {
            this.onDomEvenList.push((el) => {
                el.addEventListener("blur", func);
            });

            return;
        }
        this.htmlElement.addEventListener("blur", func);
    }

    public removeAttribute(attribute: string) {
        const isSet = this.attrs.filter(a => a.attrName == attribute);

        if (isSet != undefined && isSet.length != 0) {
            this.attrs.splice(this.attrs.indexOf(isSet[0], 1));
            this.app.notifyDirty();
            return;
        }
    }

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

    public $getChildren() {
        return this.children;
    }

    public setInnerHtml(str: string) {
        this.app.notifyDirty();
        this.modifiedInnerHtml = true;
        this.innerHtml = str;
    }

    public $setInnerHtmlNoDirty(str: string) {
        this.modifiedInnerHtml = true;
        this.innerHtml = str;
    }

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

    public appendChildren(nodes: Array<VNode>) {
        nodes.forEach(node => this.appendChild(node));
    }

    public addEventlistener(evt: EvtType, func: EvtHandlerFunc, bubble = true) {
        this.app.eventHandler.registerEventListener(evt, func, this, bubble);
    }

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
            children.push(child.$clone(clonedNode))
        });

        clonedNode.children = children;
        this.addOnDomEventOrExecute((el) => {
            clonedNode.htmlElement = el
        });

        return clonedNode;
    }

    equals(o: VNode): boolean {
        if (o == undefined) return false;

        return this.nodeName == o.nodeName;
    }

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
    };

    public hasClass = (name: string): boolean => {
        const classAttr = this.attrs.filter(el => el.attrName == "class")[0];

        if (classAttr == undefined) {
            return false;
        }

        return classAttr.attrValue.indexOf(name) != -1;
    };

    public removeClass = (name: string) => {
        this.app.notifyDirty();
        const classAttr = this.attrs.filter(el => el.attrName == "class")[0];

        if (classAttr == undefined) {
            return;
        }

        classAttr.attrValue = classAttr.attrValue.replace(name, "");
        return this;
    };

    public $replaceWith(toReplace: VNode, replacement?: VNode): void {
        let replaceIndex = -1;
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] == toReplace) {
                replaceIndex = i;
                break;
            }
        }

        if (replaceIndex != -1 && replacement != undefined) {
            this.children[replaceIndex] = replacement;
        } else {
            this.children.splice(replaceIndex, 1);
        }
    }

    private resolvei18n(): Promise<void> {
        return new Promise((resolve, reject) => {
            const locale = getLocale();
            const htmlToUse = this.rawInnerHtml != undefined ? this.rawInnerHtml : this.innerHtml;
            const resolver = this.app.i18nResolver
                .filter(resolver => htmlToUse.startsWith(resolver.getPrefix()));

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

    private replaceWith(toReplace: VNode, replacement?: VNode): void {
        this.app.notifyDirty();
        this.$replaceWith(toReplace, replacement);
    }
}

export const cssClass = (...classNames: string[]) => {
    if (classNames.length == 1) {
        return new Attribute("class", classNames[0]);
    }

    const val = classNames.reduce((acc, curr) => acc + curr + " ", "").trim();
    return new Attribute("class", val);
};

export type InputFieldType =
    'button'
    | 'checkbox'
    | 'color'
    | 'date'
    | 'datetime-local'
    | 'email'
    | 'file'
    | 'hidden'
    | 'image'
    | 'month'
    | 'number'
    | 'password'
    | 'radio'
    | 'range'
    | 'reset'
    | 'search'
    | 'submit'
    | 'tel'
    | 'text'
    | 'time'
    | 'url'
    | 'week';

export const id = (id: string) => new Attribute("id", id);
export const labelFor = (idFor: string) => new Attribute("for", idFor);
export const password = () => new Attribute("type", "password");
export const email = () => new Attribute("type", "email");
export const inputType = (iType: InputFieldType) => new Attribute("type", iType);
export const placeholder = (p: string) => new Attribute("placeholder", p);
export const src = (srcStr: string) => new Attribute("src", srcStr);
export const style = (style: string) => new Attribute("style", style);

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
            if (node.getAttributeValue("type") == "file") {
                const fileList = (node.htmlElement as HTMLInputElement).files;
                obj[key] = fileList != null ? fileList[0] : null;
            } else {
                obj[key] = (node.htmlElement as HTMLInputElement).value;
            }
        }, this);
    }

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
        this.validationFuncs.push([validateFunc, errorClass]);
        if (this.hasValidateBlurFunction) {
            return;
        }

        this.addBlurListener((ev) => {
            this.doValidation(true);
        });
    }
}
