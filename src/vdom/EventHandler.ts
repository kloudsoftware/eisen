import {kloudAppId, VNode} from './VNode'
import {VApp} from './VApp'
import {isRouterLink, RouterLink} from '../Router';

export type EvtType =
    "click"
    | "close"
    | "complete"
    | "copy"
    | "cut"
    | "deviceorientation"
    | "DOMContentLoaded"
    | "drag"
    | "dragend"
    | "dragenter"
    | "dragleave"
    | "dragover"
    | "dragstart"
    | "drop"
    | "durationchange"
    |
    "ended"
    | "endEvent"
    | "error"
    | "focusin"
    | "keyup"
    | "focusout"
    | "fullscreenchange"
    | "fullscreenerror"
    | "input"
    | "invalid"
    | "keydown"
    | "keypress"
    | "mousedown"
    | "mouseenter"
    | "mouseleave"
    | "mousemove"
    | "mouseout"
    | "mouseover"
    |
    "mouseup"
    | "offline"
    | "online"
    | "open"
    | "orientationchange"
    | "pagehide"
    | "pageshow"
    | "paste"
    | "pause"
    | "play"
    | "playing"
    | "progress"
    | "readystatechange"
    | "reset"
    | "scroll"
    | "seeked"
    | "seeking"
    | "select"
    | "show"
    | "stalled"
    |
    "storage"
    | "submit"
    | "success"
    | "suspend"
    | "timeout"
    | "timeupdate"
    | "touchcancel"
    | "touchend"
    | "touchenter"
    | "touchleave"
    | "touchmove"
    | "touchstart"
    | "visibilitychange"
    | "volumechange"
    | "waiting"
    | "wheel"

export type EvtHandlerFunc = (ev: Event, node?: VNode, bubble?: boolean) => boolean | void;

type EventHanderFuncHolder = [EvtHandlerFunc, boolean];

export class EventHandler {
    events = ["click", "close", "complete", "copy", "cut", "deviceorientation", "DOMContentLoaded", "keyup", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "durationchange",
        "ended", "endEvent", "error", "focusin", "focusout", "fullscreenchange", "fullscreenerror", "input", "invalid", "keydown", "keypress", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover",
        "mouseup", "offline", "online", "open", "orientationchange", "pagehide", "pageshow", "paste", "pause", "play", "playing", "progress", "readystatechange", "reset", "scroll", "seeked", "seeking", "select", "show", "stalled",
        "storage", "submit", "success", "suspend", "timeout", "timeupdate", "touchcancel", "touchend", "touchenter", "touchleave", "touchmove", "touchstart", "visibilitychange", "volumechange", "waiting", "wheel"];

    handlers: Map<EvtType, Map<VNode, Array<EventHanderFuncHolder>>>;
    routerLnks = new Array<RouterLink>();


    constructor(app: VApp) {
        const $root = app.rootNode.htmlElement;
        this.events.forEach(evt => {
            $root!.addEventListener(evt, this.handleEvent(this));
        })
    }

    registerEventListener(evt: EvtType, handler: EvtHandlerFunc, target: VNode, bubble = true) {
        if (isRouterLink(target)) {
            this.routerLnks.push(target as RouterLink);
        }

        if (this.handlers == undefined) {
            this.handlers = new Map<EvtType, Map<VNode, Array<EventHanderFuncHolder>>>();
        }

        let handlerMap = this.handlers.get(evt);
        if (handlerMap == undefined) {
            handlerMap = new Map();
        }

        if (handlerMap.get(target) != undefined) {
            handlerMap.get(target).push([handler, bubble])
        } else {
            handlerMap.set(target, [[handler, bubble]]);
        }

        this.handlers.set(evt, handlerMap)
    }

    handleEvent(handler: EventHandler) {
        return (event: Event) => {
            if (handler.handlers == undefined) {
                return;
            }

            if (!(event.target instanceof HTMLElement)) return;

            const $target = event.target as HTMLElement;

            if (!$target.hasAttribute(kloudAppId)) return;

            const scopedHandlers = handler.handlers.get(event.type as EvtType);

            if (scopedHandlers == undefined) {
                return;
            }

            let bubbled = false;

            function elemOrParentsEqual(elem: HTMLElement, needle: HTMLElement): boolean {
                if (elem == needle) {
                    return true;
                }

                if (needle.parentElement != undefined) {
                    bubbled = true;
                    return elemOrParentsEqual(elem, needle.parentElement);
                }

                return false;
            }

            let handled = false;
            const result = Array.from(scopedHandlers.keys());
            result.filter(res => elemOrParentsEqual(res.htmlElement, $target)).forEach(it => {
                let evtHandlers = scopedHandlers.get(it);
                evtHandlers.forEach(func => {
                    handled = true;

                    if (!func[1]) {
                        return;
                    }

                    let cont = func[0](event, it);
                    cont = cont != undefined ? cont : false;

                    if (!cont) {
                        event.preventDefault();
                    }
                    //Handles propagation of buttons that already have click listeners
                    if (cont && isRouterLink(it.parent) && event.type == "click") {
                        (it.parent as RouterLink).clickFunction(event, it.parent);
                    }
                });
            });

            //We need to check if the direct parent of the target element is a RouterLink
            if (!handled) {
                this.routerLnks.filter(res => res.htmlElement == $target.parentNode).forEach(it => {
                    event.preventDefault();
                    it.clickFunction(event, it);
                });
            }


        }
    }
}

class Tuple<K, V> {
    k: K;
    v: V;

    constructor(k: K, v: V) {
        this.k = k;
        this.v = v;
    }
}
