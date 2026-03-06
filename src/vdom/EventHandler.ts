import {VNode} from './VNode'
import {VApp} from './VApp'
import {isRouterLink, RouterLink} from '../Router';

const EVENT_NAMES = [
    "click", "dblclick", "close", "complete", "copy", "cut", "deviceorientation", "DOMContentLoaded",
    "keyup", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop",
    "durationchange", "ended", "endEvent", "error", "focus", "blur", "focusin", "focusout",
    "fullscreenchange", "fullscreenerror", "input", "invalid", "keydown", "keypress",
    "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup",
    "offline", "online", "open", "orientationchange", "pagehide", "pageshow", "paste", "pause",
    "play", "playing", "progress", "readystatechange", "reset", "scroll", "seeked", "seeking",
    "select", "show", "stalled", "storage", "submit", "success", "suspend", "timeout",
    "timeupdate", "touchcancel", "touchend", "touchenter", "touchleave", "touchmove",
    "touchstart", "visibilitychange", "volumechange", "waiting", "wheel", "change",
] as const;

export type EvtType = (typeof EVENT_NAMES)[number];

export type EvtHandlerFunc = (ev: Event, node?: VNode, bubble?: boolean) => boolean | void;

type HandlerEntry = [EvtHandlerFunc, boolean];

type ListenerRecord = {
    node: VNode;
    handlers: Array<HandlerEntry>;
};

export class EventHandler {
    private handlers: Map<EvtType, Map<string, ListenerRecord>> = new Map();
    routerLnks = new Array<RouterLink>();

    private $root: HTMLElement | undefined;
    private boundHandler = this.dispatch.bind(this);
    private attachedEvents = new Set<EvtType>();

    constructor(app: VApp, attachDomListeners = true) {
        if (attachDomListeners) {
            this.$root = app.rootNode.htmlElement;
        }
    }

    purge(node: VNode, deep = false) {
        if (deep) {
            node.$getChildren().forEach(child => this.purge(child, true));
        }

        this.handlers.forEach(handlerMap => {
            handlerMap.delete(node.id);
        });

        this.routerLnks = this.routerLnks.filter(link => link.id !== node.id);
    }

    registerEventListener(evt: EvtType, handler: EvtHandlerFunc, target: VNode, bubble = true) {
        if (isRouterLink(target)) {
            this.routerLnks.push(target as RouterLink);
        }

        this.ensureAttached(evt);

        let handlerMap = this.handlers.get(evt);
        if (handlerMap == undefined) {
            handlerMap = new Map();
            this.handlers.set(evt, handlerMap);
        }

        const existing = handlerMap.get(target.id);
        if (existing && existing.node !== target) {
            existing.node = target;
            existing.handlers = [];
        }

        const record = existing ?? {node: target, handlers: []};
        record.handlers.push([handler, bubble]);
        handlerMap.set(target.id, record);
    }

    reassign(target: VNode, previousId: string, nextId: string) {
        if (previousId === nextId) {
            return;
        }

        this.handlers.forEach(handlerMap => {
            const record = handlerMap.get(previousId);
            if (record) {
                handlerMap.delete(previousId);
                record.node = target;
                handlerMap.set(nextId, record);
            }
        });
    }

    private ensureAttached(evt: EvtType) {
        if (!this.$root || this.attachedEvents.has(evt)) {
            return;
        }
        this.$root.addEventListener(evt, this.boundHandler);
        this.attachedEvents.add(evt);
    }

    private dispatch(event: Event) {
        const scopedHandlers = this.handlers.get(event.type as EvtType);
        if (!scopedHandlers) {
            return;
        }

        const $target = event.target as HTMLElement;
        if (!$target) {
            return;
        }

        // Build a temporary reverse map: htmlElement -> record (scoped to this event type)
        const elementMap = new Map<HTMLElement, ListenerRecord>();
        scopedHandlers.forEach(record => {
            if (record.node.htmlElement) {
                elementMap.set(record.node.htmlElement, record);
            }
        });

        let handled = false;

        // Walk from target up through ancestors — O(depth) lookups
        let current: HTMLElement | null = $target;
        while (current && current !== this.$root?.parentElement) {
            const record = elementMap.get(current);
            if (record) {
                const bubbled = current !== $target;
                record.handlers.forEach(([fn, listenBubble]) => {
                    handled = true;
                    if (bubbled && !listenBubble) {
                        return;
                    }
                    const cont = fn(event, record.node, bubbled);
                    if (cont === false) {
                        event.preventDefault();
                    }
                    if (cont && isRouterLink(record.node.parent) && event.type === "click") {
                        (record.node.parent as RouterLink).clickFunction(event, record.node.parent);
                    }
                });
            }
            current = current.parentElement;
        }

        if (!handled) {
            this.routerLnks
                .filter(res => res.htmlElement === $target.parentNode)
                .forEach(it => {
                    event.preventDefault();
                    it.clickFunction(event, it);
                });
        }
    }
}
