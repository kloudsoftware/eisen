export interface Resolver {
    get(key: string, locale: string): string;
}

export class StringLocaleResolver implements Resolver {
    private localeStringObj: any;

    constructor(localeStringObj: any) {
        this.localeStringObj = localeStringObj;
    }

    get(key: string, locale: string): string {
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
