export const splitAtSlash = (s: string): Array<string> => s.split("/");
export const stringIncludesCurlyBrace = (s: string): boolean => s.includes("{");

export const pathVariableRegex = /{([a-zA-Z$_][a-zA-Z$_0-9]+)}/;
export function splitPathVars(path: string): Array<string> {
    const splittedPath = splitAtSlash(path);

    return splittedPath
        .map(p => pathVariableRegex.exec(p))
        .filter(m => m != null)
        .map(m => m[1]);
}

export function matchSubPath(splittedKnownPath: Array<string>, splitted: Array<string>): boolean {
    for (let i = 0; i < splittedKnownPath.length; i++) {
        const knownSubPath = splittedKnownPath[i];
        const givenSubPath = splitted[i];

        if (givenSubPath == undefined) {
            return false;
        }

        if (!stringIncludesCurlyBrace(knownSubPath)) {
            if (!(knownSubPath == givenSubPath)) {
                return false;
            }
        }
    }

    return true;
}
