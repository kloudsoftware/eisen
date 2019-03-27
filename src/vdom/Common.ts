import { Props } from "./Props";
import { VNode } from "./VNode";

export interface Comparable<T> {
    equals(o: T): boolean;
}

export function arraysEquals<T extends Comparable<T>>(arrayA: T[], arrayB: T[]): boolean {
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

    public parse(str: string, props: Props) {
        let parsed = dataRegex.exec(str)
        if (parsed == null || parsed.length == 0) {
            return str;
        }

        let parse = str.match(dataRegex);

        let currStr = ""; parsed
        parse.forEach(it => currStr = this.buildStringFunc(it, props, str))
        return currStr;
    }

    private getFromProps(uncleanKey: string, props: Props): string {
        let key = uncleanKey.split("{{")[1].split("}}")[0].trim();
        return props.getProp(key);
    }

    private buildStringFunc(splitter: string, props: Props, orig: string): string {
        let parts = orig.split(splitter);
        return parts.join(this.getFromProps(splitter, props));
    }
}

export const invokeIfDefined = (fun: () => void) => {
    if (fun != undefined) {
        fun();
    }
}

export const isDefinedAndNotEmpty = (str: string) => {
    return str != undefined && str != "";
}

export const toggleError = (node: VNode) => {
    node.addClass("error");
}
