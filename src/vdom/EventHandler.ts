import { VNode, kloudAppId } from './VNode'
import { VApp } from './VApp'

type EvtType = "click" | "close" | "complete" | "copy" | "cut" | "deviceorientation" | "DOMContentLoaded" | "drag" | "dragend" | "dragenter" | "dragleave" | "dragover" | "dragstart" | "drop" | "durationchange" |
    "ended" | "endEvent" | "error" | "focusin" | "keyup" | "focusout" | "fullscreenchange" | "fullscreenerror" | "input" | "invalid" | "keydown" | "keypress" | "mousedown" | "mouseenter" | "mouseleave" | "mousemove" | "mouseout" | "mouseover" |
    "mouseup" | "offline" | "online" | "open" | "orientationchange" | "pagehide" | "pageshow" | "paste" | "pause" | "play" | "playing" | "progress" | "readystatechange" | "reset" | "scroll" | "seeked" | "seeking" | "select" | "show" | "stalled" |
    "storage" | "submit" | "success" | "suspend" | "timeout" | "timeupdate" | "touchcancel" | "touchend" | "touchenter" | "touchleave" | "touchmove" | "touchstart" | "visibilitychange" | "volumechange" | "waiting" | "wheel"

type EvtHandlerFunc = (ev: Event, node?: VNode) => void;

export class EventHandler {
    events = ["click", "close", "complete", "copy", "cut", "deviceorientation", "DOMContentLoaded", "keyup", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "durationchange",
        "ended", "endEvent", "error", "focusin", "focusout", "fullscreenchange", "fullscreenerror", "input", "invalid", "keydown", "keypress", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover",
        "mouseup", "offline", "online", "open", "orientationchange", "pagehide", "pageshow", "paste", "pause", "play", "playing", "progress", "readystatechange", "reset", "scroll", "seeked", "seeking", "select", "show", "stalled",
        "storage", "submit", "success", "suspend", "timeout", "timeupdate", "touchcancel", "touchend", "touchenter", "touchleave", "touchmove", "touchstart", "visibilitychange", "volumechange", "waiting", "wheel"];

    handlers: Map<EvtType, Map<VNode, Array<EvtHandlerFunc>>>;


    constructor(app: VApp) {
        const $root = app.rootNode.htmlElement
        this.events.forEach(evt => {
            $root.addEventListener(evt, this.handleEvent(this));
        })
    }

    registerEventListener(evt: EvtType, handler: EvtHandlerFunc, target: VNode) {
        if (this.handlers == undefined) {
            this.handlers = new Map<EvtType, Map<VNode, Array<EvtHandlerFunc>>>();
        }

        let handlerMap = this.handlers.get(evt);
        if (handlerMap == undefined) {
            handlerMap = new Map();
        }

        if (handlerMap.get(target) != undefined) {
            handlerMap.get(target).push(handler)
        } else {
            handlerMap.set(target, Array.of(handler));
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

            const $targetAppId = $target.getAttribute(kloudAppId);
            const scopedHandlers = handler.handlers.get(event.type as EvtType);

            if (scopedHandlers == undefined) {
                return;
            };

            const result = Array.from(scopedHandlers.keys());
            result.filter(res => res.htmlElement == $target).forEach(it => {
                let evtHandlers = scopedHandlers.get(it);
                evtHandlers.forEach(func => {
                    //console.log("Applying ", it, " to: ", func)
                    func(event, it)
                });
            })
            //result.filter(res => res.id == $targetAppId).map(res => new Tuple<VNode, EvtHandlerFunc[]>(res, scopedHandlers.get(res))).forEach(tp => tp.v.forEach(f => f.apply(event, tp.k)));
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