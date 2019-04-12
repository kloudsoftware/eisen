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
        return new Promise((resolve, reject) => {
            const locales = this.localeStringObj[key];
            if (locales == undefined) {
                reject(`Could not find a match for ${key} for locale ${locale}`)
            }
            const result = locales[locale];
            if (result != undefined) {
                resolve(result);
            } else {
                reject(`Could not find a match for ${key} for locale ${locale}`)
            }
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
