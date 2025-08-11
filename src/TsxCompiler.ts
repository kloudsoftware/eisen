/**
 * Compiles a string containing TSX into JavaScript that uses the
 * eisen JSX runtime. The resulting code will call the `jsx` factory
 * which can be wired to a {@link VApp} via {@link setJSXApp}.
 *
 * @param source TSX source code
 * @param jsxFactory name of the JSX factory function, defaults to `jsx`
 */
export function compileTsx(source: string, jsxFactory = 'jsx'): string {
    const ts: any = eval('require')('typescript');
    const result = ts.transpileModule(source, {
        compilerOptions: {
            jsx: ts.JsxEmit.React,
            jsxFactory,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2017,
        },
    });

    return result.outputText;
}
