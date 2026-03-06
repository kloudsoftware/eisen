/**
 * Vite plugin for eisen. Provides zero-config JSX/TSX support and HMR.
 *
 * Usage in vite.config.ts:
 *   import { eisenPlugin } from '@kloudsoftware/eisen/vite-plugin';
 *   export default { plugins: [eisenPlugin()] };
 *
 * What it does:
 * - Configures esbuild JSX factory to `jsx` and fragment to `Fragment`
 * - Auto-injects the jsx/Fragment imports in .tsx/.jsx files
 * - Adds HMR support: component state is preserved on file save
 */
export function eisenPlugin(): any {
    return {
        name: 'vite-plugin-eisen',

        config() {
            return {
                esbuild: {
                    jsxFactory: 'jsx',
                    jsxFragment: 'Fragment',
                    jsxInject: `import { jsx, Fragment } from '@kloudsoftware/eisen';`,
                },
            };
        },

        transform(code: string, id: string) {
            // Only process .tsx/.jsx files, skip node_modules
            if (!/\.[jt]sx$/.test(id) || id.includes('node_modules')) {
                return null;
            }

            // Detect exported class components: `export class X extends Component`
            // or `export default class X extends Component`
            const classExportRe = /export\s+(?:default\s+)?class\s+(\w+)\s+extends\s+Component/g;
            const classMatches: string[] = [];
            let m;
            while ((m = classExportRe.exec(code)) !== null) {
                classMatches.push(m[1]);
            }

            // Detect exported function components: `export function X` or `export default function X`
            const fnExportRe = /export\s+(?:default\s+)?function\s+(\w+)/g;
            const fnMatches: string[] = [];
            while ((m = fnExportRe.exec(code)) !== null) {
                // Skip lowercase functions — likely helpers, not components
                if (m[1][0] === m[1][0].toUpperCase()) {
                    fnMatches.push(m[1]);
                }
            }

            if (classMatches.length === 0 && fnMatches.length === 0) {
                return null;
            }

            const moduleId = JSON.stringify(id);
            let hmrCode = '';

            if (classMatches.length > 0) {
                hmrCode += `\nimport { _hmrAccept as __hmrAccept } from '@kloudsoftware/eisen';\n`;
                hmrCode += `if (import.meta.hot) {\n`;
                hmrCode += `  import.meta.hot.accept((newModule) => {\n`;
                hmrCode += `    if (newModule) {\n`;
                for (const name of classMatches) {
                    hmrCode += `      if (newModule.${name}) __hmrAccept(${moduleId}, newModule.${name});\n`;
                }
                hmrCode += `    }\n`;
                hmrCode += `  });\n`;
                hmrCode += `}\n`;
            }

            if (fnMatches.length > 0) {
                hmrCode += `\nimport { _hmrAcceptFn as __hmrAcceptFn } from '@kloudsoftware/eisen';\n`;
                hmrCode += `if (import.meta.hot) {\n`;
                hmrCode += `  import.meta.hot.accept((newModule) => {\n`;
                hmrCode += `    if (newModule) {\n`;
                for (const name of fnMatches) {
                    hmrCode += `      if (newModule.${name}) __hmrAcceptFn(${moduleId}, newModule.${name});\n`;
                }
                hmrCode += `    }\n`;
                hmrCode += `  });\n`;
                hmrCode += `}\n`;
            }

            return {
                code: code + hmrCode,
                map: null as any,
            };
        },
    };
}
