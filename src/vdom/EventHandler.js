"use strict";
exports.__esModule = true;
var VNode_1 = require("./VNode");
var EventHandler = /** @class */ (function () {
    function EventHandler(app) {
        var _this = this;
        this.events = ["click", "close", "complete", "copy", "cut", "deviceorientation", "DOMContentLoaded", "keyup", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "durationchange",
            "ended", "endEvent", "error", "focusin", "focusout", "fullscreenchange", "fullscreenerror", "input", "invalid", "keydown", "keypress", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover",
            "mouseup", "offline", "online", "open", "orientationchange", "pagehide", "pageshow", "paste", "pause", "play", "playing", "progress", "readystatechange", "reset", "scroll", "seeked", "seeking", "select", "show", "stalled",
            "storage", "submit", "success", "suspend", "timeout", "timeupdate", "touchcancel", "touchend", "touchenter", "touchleave", "touchmove", "touchstart", "visibilitychange", "volumechange", "waiting", "wheel"];
        var $root = app.rootNode.htmlElement;
        this.events.forEach(function (evt) {
            $root.addEventListener(evt, _this.handleEvent(_this));
        });
    }
    EventHandler.prototype.registerEventListener = function (evt, handler, target) {
        if (this.handlers == undefined) {
            this.handlers = new Map();
        }
        var handlerMap = this.handlers.get(evt);
        if (handlerMap == undefined) {
            handlerMap = new Map();
        }
        if (handlerMap.get(target) != undefined) {
            handlerMap.get(target).push(handler);
        }
        else {
            handlerMap.set(target, Array.of(handler));
        }
        this.handlers.set(evt, handlerMap);
    };
    EventHandler.prototype.handleEvent = function (handler) {
        return function (event) {
            if (handler.handlers == undefined) {
                return;
            }
            if (!(event.target instanceof HTMLElement))
                return;
            var $target = event.target;
            if (!$target.hasAttribute(VNode_1.kloudAppId))
                return;
            var $targetAppId = $target.getAttribute(VNode_1.kloudAppId);
            var scopedHandlers = handler.handlers.get(event.type);
            if (scopedHandlers == undefined) {
                return;
            }
            ;
            var result = Array.from(scopedHandlers.keys());
            result.filter(function (res) { return res.htmlElement == $target; }).forEach(function (it) {
                var evtHandlers = scopedHandlers.get(it);
                evtHandlers.forEach(function (func) {
                    //console.log("Applying ", it, " to: ", func)
                    func(event, it);
                });
            });
            //result.filter(res => res.id == $targetAppId).map(res => new Tuple<VNode, EvtHandlerFunc[]>(res, scopedHandlers.get(res))).forEach(tp => tp.v.forEach(f => f.apply(event, tp.k)));
        };
    };
    return EventHandler;
}());
exports.EventHandler = EventHandler;
var Tuple = /** @class */ (function () {
    function Tuple(k, v) {
        this.k = k;
        this.v = v;
    }
    return Tuple;
}());
