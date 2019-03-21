import { VNode, kloudAppId } from './VNode'
import { VApp } from './VApp'

type EvtType = "click" | "close" | "complete" | "copy" | "cut" | "deviceorientation" | "DOMContentLoaded" | "drag" | "dragend" | "dragenter" | "dragleave" | "dragover" | "dragstart" | "drop" | "durationchange" |
    "ended" | "endEvent" | "error" | "focusin" | "focusout" | "fullscreenchange" | "fullscreenerror" | "input" | "invalid" | "keydown" | "keypress" | "mousedown" | "mouseenter" | "mouseleave" | "mousemove" | "mouseout" | "mouseover" |
    "mouseup" | "offline" | "online" | "open" | "orientationchange" | "pagehide" | "pageshow" | "paste" | "pause" | "play" | "playing" | "progress" | "readystatechange" | "reset" | "scroll" | "seeked" | "seeking" | "select" | "show" | "stalled" |
    "storage" | "submit" | "success" | "suspend" | "timeout" | "timeupdate" | "touchcancel" | "touchend" | "touchenter" | "touchleave" | "touchmove" | "touchstart" | "visibilitychange" | "volumechange" | "waiting" | "wheel"

type EvtHandlerFunc = (ev: Event) => void;

export class EventHandler {
    events = ["click", "close", "complete", "copy", "cut", "deviceorientation", "DOMContentLoaded", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "durationchange",
        "ended", "endEvent", "error", "focusin", "focusout", "fullscreenchange", "fullscreenerror", "input", "invalid", "keydown", "keypress", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover",
        "mouseup", "offline", "online", "open", "orientationchange", "pagehide", "pageshow", "paste", "pause", "play", "playing", "progress", "readystatechange", "reset", "scroll", "seeked", "seeking", "select", "show", "stalled",
        "storage", "submit", "success", "suspend", "timeout", "timeupdate", "touchcancel", "touchend", "touchenter", "touchleave", "touchmove", "touchstart", "visibilitychange", "volumechange", "waiting", "wheel"];

    handlers: Map<EvtType, Map<VNode, Array<EvtHandlerFunc>>> = new Map()
    addedHandlers: Set<VNode> = new Set()


    constructor(app: VApp) {
        const $root = app.rootNode.htmlElement
        this.events.forEach(evt => {
            $root.addEventListener(evt, this.handleEvent)
        })
    }

    registerEventListener(evt: EvtType, handler: EvtHandlerFunc, target: VNode) {
        let handlerMap = this.handlers.get(evt);
        if (handlerMap == undefined) {
            handlerMap = new Map();
        }

        handlerMap.get(target) != undefined ? handlerMap.get(target).push(handler) : handlerMap.set(target, [handler]);
    }

    handleEvent(event: Event) {
        if (!(event.target instanceof HTMLElement)) return;
        const $target = event.target as HTMLElement;
        if (!$target.hasAttribute(kloudAppId)) return;
        const $targetAppId = $target.getAttribute(kloudAppId);
        const scopedHandlers = this.handlers.get(event.type as EvtType);
        let result: IteratorResult<VNode>;
        do {
            result = scopedHandlers.keys().return();
            if (result.value.id == $targetAppId) {
                scopedHandlers.get(result.value).forEach(it => it.apply(event));
            }
        } while (!result.done)
    }
}