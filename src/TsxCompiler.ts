/**
 * Compiles a string containing TSX into JavaScript that uses the
 * eisen JSX runtime. The resulting code will call the `jsx` factory
 * which can be wired to a {@link VApp} via {@link setJSXApp}.
 *
 * @param source TSX source code
 * @param jsxFactory name of the JSX factory function, defaults to `jsx`
 */
type TypeScriptModule = typeof import('typescript');

let cachedTypeScript: TypeScriptModule | undefined;

function resolveTypeScript(explicit?: TypeScriptModule): TypeScriptModule {
    if (explicit) {
        cachedTypeScript = explicit;
        return explicit;
    }

    if (cachedTypeScript) {
        return cachedTypeScript;
    }

    const globalScope = typeof globalThis === 'object' ? (globalThis as any) : undefined;
    const globalTs = globalScope?.typescript ?? globalScope?.ts;
    if (globalTs) {
        cachedTypeScript = globalTs as TypeScriptModule;
        return cachedTypeScript;
    }

    const nodeRequire: ((id: string) => unknown) | undefined = globalScope?.require ?? globalScope?.module?.require;
    if (typeof nodeRequire === 'function') {
        try {
            cachedTypeScript = nodeRequire('typescript') as TypeScriptModule;
            return cachedTypeScript;
        } catch (error) {
            if ((error as { code?: string }).code !== 'MODULE_NOT_FOUND') {
                throw error;
            }
        }
    }

    throw new Error('TypeScript compiler not available. Install "typescript" or provide it when calling compileTsx.');
}

export function compileTsx(source: string, jsxFactory = 'jsx', typescriptImpl?: TypeScriptModule): string {
    const ts = resolveTypeScript(typescriptImpl);
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
