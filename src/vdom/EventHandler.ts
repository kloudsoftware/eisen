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

    handlers: Map<EvtType, Map<VNode, Array<EvtHandlerFunc>>>;


    constructor(app: VApp) {
        const $root = app.rootNode.htmlElement
        this.events.forEach(evt => {
            $root.addEventListener(evt, this.handleEvent)
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
            console.log("adding handler: ", handlerMap.get(target));
        }

        this.handlers.set(evt, handlerMap)
        console.log(this.handlers);
    }

    handleEvent(event: Event) {
        if (this.handlers == undefined) {
            console.log("no handlers set");
        }
        if (event.type == "click") {
            console.log(event.type, event.target)
        }

        if (this.handlers == undefined) {
            this.handlers = new Map<EvtType, Map<VNode, Array<EvtHandlerFunc>>>();
        }

        if (!(event.target instanceof HTMLElement)) return;

        const $target = event.target as HTMLElement;

        if (!$target.hasAttribute(kloudAppId)) return;

        const $targetAppId = $target.getAttribute(kloudAppId);
        const scopedHandlers = this.handlers.get(event.type as EvtType);

        if (scopedHandlers == undefined) {
            if (event.type == "click") {
                console.log("undefined click")
                console.log(this.handlers);
            }

            return;
        };

        let result: IteratorResult<VNode>;
        do {
            result = scopedHandlers.keys().return();
            if (result.value.id == $targetAppId) {
                scopedHandlers.get(result.value).forEach(it => it.apply(event));
            }
        } while (!result.done)
    }
}