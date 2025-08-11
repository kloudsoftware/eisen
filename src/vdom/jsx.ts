import { VApp } from './VApp';
import { Attribute, VNode, VNodeType } from './VNode';
import { Props } from './Props';

let currentApp: VApp | undefined;

/**
 * JSX factory function converting TSX to eisen `k` calls.
 */
export function jsx(nodeName: VNodeType, config?: any, ...children: any[]): VNode {
    if (!currentApp) {
        throw new Error('No VApp configured for JSX. Call setJSXApp first.');
    }

    const attrs: Attribute[] = [];
    let props: Props = new Props(currentApp);
    let value = '';

    if (config) {
        if (config.props && config.props instanceof Props) {
            props = config.props;
            delete config.props;
        }
        if (typeof config.value === 'string') {
            value = config.value;
            delete config.value;
        }
        Object.keys(config).forEach(k => {
            const v = config[k];
            if (v === false || v === undefined || v === null) {
                return;
            }
            attrs.push(new Attribute(k, String(v)));
        });
    }

    const childNodes: VNode[] = [];
    children.forEach(c => {
        if (typeof c === 'string') {
            value += c;
        } else if (Array.isArray(c)) {
            c.forEach(el => {
                if (typeof el === 'string') {
                    value += el;
                } else if (el) {
                    childNodes.push(el);
                }
            });
        } else if (c) {
            childNodes.push(c);
        }
    });

    return currentApp.k(nodeName, { attrs, props, value }, childNodes);
}

/**
 * Sets the active {@link VApp} instance used by the JSX factory.
 * This must be called before evaluating code produced from TSX.
 */
export function setJSXApp(app: VApp) {
    currentApp = app;
}

// Expose the factory globally so compiled TSX can find it at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jsx = jsx;

declare global {
    namespace JSX {
        type Element = VNode;
        interface IntrinsicAttributes {
            props?: Props;
            value?: string;
            [key: string]: any;
        }
        interface IntrinsicElements extends Record<VNodeType, IntrinsicAttributes> {
            [elemName: string]: IntrinsicAttributes;
        }
    }
}
