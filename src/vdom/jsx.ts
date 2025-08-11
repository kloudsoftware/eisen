import {VApp} from './VApp';
import {Attribute, VNode, VNodeType} from './VNode';
import {Props} from './Props';
import {EvtHandlerFunc, EvtType} from "./EventHandler";

let currentApp: VApp | undefined;

/**
 * JSX factory function converting TSX to eisen `k` calls.
 */
export function jsx(nodeName: VNodeType, config?: any, ...children: any[]): VNode {
    if (!currentApp) {
        throw new Error('No VApp configured for JSX. Call setJSXApp first.');
    }

    const attrs: Attribute[] = [];
    const eventHandlers: Array<[EvtType, EvtHandlerFunc]> = [];
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
        let shouldDisplay = true;
        Object.keys(config).forEach(k => {
            const v = config[k];
            if (v === false || v === undefined || v === null) {
                return;
            }

            if (k.startsWith("e-if") && typeof v === 'function') {
                shouldDisplay = v()
            }

            if (k.startsWith('on') && typeof v === 'function') {
                // all our events are without on* so, click not onClick
                const evt = k.substring(2).toLowerCase() as EvtType;
                eventHandlers.push([evt, v]);
                return;
            }
            attrs.push(new Attribute(k, String(v)));
        });
        if (!shouldDisplay) {
            return null;
        }
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

    const node = currentApp.k(nodeName, {attrs, props, value}, childNodes);
    eventHandlers.forEach(([evt, handler]) => node.addEventlistener(evt, handler));
    return node;
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
