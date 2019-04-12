export abstract class Resolver {
    public getPrefix(): string {
        return "$_";
    }

    public isStrict(): boolean {
        return false;
    }

    public abstract get(key: string, locale: string): Promise<string>;
}

export class StringLocaleResolver extends Resolver {
    private localeStringObj: any;

    constructor(localeStringObj: any) {
        super();
        this.localeStringObj = localeStringObj;
    }

    public get(key: string, locale: string): Promise<string> {
        return new Promise((resolve, _) => {
            resolve(this.localeStringObj[key][locale]);
        });
    }
}

export const getLocale = () => {
    let locale = window.localStorage.getItem("locale")

    if (locale == undefined) {
        locale = navigator.language;
    }

    return locale;
}

export const setLocale = (locale: string) => {
    window.localStorage.setItem("locale", locale);
}
