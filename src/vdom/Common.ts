import {Props} from "./Props";

export interface Comparable<T> {
    equals(o: T): boolean;
}

export function arraysEquals<T extends Comparable<T>>(arrayA: T[], arrayB: T[]): boolean {
    if (arrayA == undefined && arrayB == undefined) {
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

export const dataRegex = /{{(.*?)}}/g;

export class Stringparser {
    constructor() {
    }

    private static getFromProps(uncleanKey: string, props: Props): string {
        let key = uncleanKey.split("{{")[1].split("}}")[0].trim();
        return props.getProp(key);
    }

    private static buildStringFunc(splitter: string, props: Props, orig: string): string {
        let parts = orig.split(splitter);
        return parts.join(Stringparser.getFromProps(splitter, props));
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
}

export const invokeIfDefined = (fun: () => void) => {
    if (fun != undefined) {
        fun();
    }
};

export const getOrNoop = (fun: any) => {
    if (isFunction(fun)) {
        return fun;
    } else {
        return () => {
        };
    }
};

function isFunction(functionToCheck: any) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

export const isDefinedAndNotEmpty = (str: string) => {
    return str != undefined && str != "";
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
