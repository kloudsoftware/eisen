import { Props } from "./Props";
import { VNode, VNodeType, Attribute } from "./VNode";
import { VApp } from "./VApp";

export interface Comparable<T> {
    equals(o: T): boolean;
}

export function arraysEquals<T extends Comparable<T>>(arrayA: T[], arrayB: T[]): boolean {
    if(arrayA == undefined && arrayB == undefined) {
        return true;
    }

    if (arrayA.length != arrayB.length) {
        return false;
    }

    for (let i = 0; i < arrayA.length; i++) {
        if (!arrayA[i].equals(arrayB[i])) {
            return false;
        }
    }

    return true;
}

export interface Cloneable<T> {
    clone(): T;
}

export const dataRegex = /{{(.*?)}}/g;

export class Stringparser {
    constructor() {
    }

    public parse(str: string, props: Props): string {
        let parsed = dataRegex.exec(str);
        if (parsed == null || parsed.length == 0) {
            return str;
        }

        let parse = str.match(dataRegex);

        let currStr = "";

        parse.forEach(it => currStr = Stringparser.buildStringFunc(it, props, currStr !== "" ? currStr : str));

        return currStr;
    }

    private static getFromProps(uncleanKey: string, props: Props): string {
        let key = uncleanKey.split("{{")[1].split("}}")[0].trim();
        return props.getProp(key);
    }

    private static buildStringFunc(splitter: string, props: Props, orig: string): string {
        let parts = orig.split(splitter);
        return parts.join(Stringparser.getFromProps(splitter, props));
    }
}

export const invokeIfDefined = (fun: () => void) => {
    if (fun != undefined) {
        fun();
    }
};

export const isDefinedAndNotEmpty = (str: string) => {
    return str != undefined && str != "";
};

export const toggleError = (node: VNode) => {
    node.addClass("error");
};

export const parseIntoUnmanaged = (htmlString: string, mount: VNode): VNode => {
    const unmanged = mount.app.createUnmanagedNoDirty(mount);

    unmanged.addOnDomEventOrExecute((htmlEl: HTMLElement) => {
        htmlEl.innerHTML = htmlString;
    });

    return unmanged;
};

//TODO: This is currently buggy for textNodes
export const parseStrIntoVNode = (htmlString: string, app: VApp): VNode  =>  {
    const parser = new DOMParser();
    const html = parser.parseFromString(htmlString, "text/html");

    let children = Array.from(html.body.children).map(child => parse(child, app));
    const container = app.k("div", {}, children);
    children.forEach(child => {
        child.parent = container;
        container.$getChildren().push(child);
    });

    console.log(container);
    return container;
};

const parse = (node: Element, app: VApp): VNode => {
    const attributes: Attribute[] = [];
    for(let i = 0; i < node.attributes.length; i++) {
        const currAtt = node.attributes.item(i);
        attributes.push(new Attribute(currAtt.name, currAtt.value));
    }

    const vNode = app.k(node.nodeName as VNodeType, {
        attrs: attributes,
    });

    const nodeArr = Array.from(node.children).filter(el => el.nodeType === Node.TEXT_NODE).map(el => el.nodeValue);
    const itemText = nodeArr != undefined && nodeArr.length > 0 ? nodeArr[0] : "";

    vNode.$setInnerHtmlNoDirty(itemText);

    const children = Array.from(node.children).map(child => parse(child, app));
    children.forEach(child => {
        child.parent = vNode;
        vNode.$getChildren().push(child);
    });

    return vNode;
};

/**
 * Inverts Promise.all
 * Resolves on first successful Promise
 * If all Promises fail, it will reject with the last error
 * @param promises The promises to run
 */
export function raceToSuccess<T>(promises: Array<Promise<T>>): Promise<T> {
    return Promise.all(promises.map(p => {
        return p.then(
            (val: T) => Promise.reject(val),
            err => Promise.resolve(err)
        );
    }))
        .then(
            errors => Promise.reject(errors),
            (val: T) => Promise.resolve(val)
        );
}
