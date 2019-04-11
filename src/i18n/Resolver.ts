export abstract class Resolver {
    public getPrefix(): string {
        return "$_";
    }

    public abstract get(key: string, locale: string): string;
}

export class StringLocaleResolver extends Resolver {
    private localeStringObj: any;

    constructor(localeStringObj: any) {
        super();
        this.localeStringObj = localeStringObj;
    }

    public get(key: string, locale: string): string {
        return this.localeStringObj[key][locale];
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
