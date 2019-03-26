"use strict";
exports.__esModule = true;
var VNode_1 = require("./VNode");
var Props_1 = require("./Props");
var Component_1 = require("./Component");
var EventHandler_1 = require("./EventHandler");
var Common_1 = require("./Common");
exports.unmanagedNode = "__UNMANAGED__";
var VApp = /** @class */ (function () {
    function VApp(targetId, renderer, rootNode) {
        var _this = this;
        this.snapshots = [];
        this.eventListeners = [];
        this.initial = true;
        this.compProps = new Array();
        this.compsToNotifyUnmount = new Array();
        this.k = function (type, value, attrs) {
            var children = [];
            for (var _i = 3; _i < arguments.length; _i++) {
                children[_i - 3] = arguments[_i];
            }
            if (children == undefined) {
                children = [];
            }
            if (attrs == undefined) {
                attrs = [];
            }
            if (value == undefined) {
                value = "";
            }
            var cleaned = children.filter(function (child) { return child != undefined; });
            var node;
            if (type == "input") {
                node = new VNode_1.VInputNode(_this, type, cleaned, value, new Props_1.Props(_this), attrs);
            }
            else {
                node = new VNode_1.VNode(_this, type, cleaned, value, new Props_1.Props(_this), attrs);
            }
            cleaned.forEach(function (child) {
                child.parent = node;
            });
            return node;
        };
        this.targetId = targetId;
        this.renderer = renderer;
        var $root = document.getElementById(targetId);
        var $tagName = $root.tagName.toLowerCase();
        this.dirty = false;
        if (rootNode != undefined) {
            this.rootNode = rootNode.clone(undefined);
        }
        else {
            this.rootNode = new VNode_1.VNode(this, $tagName, new Array(), "", new Props_1.Props(this), [new VNode_1.Attribute("id", $root.id)], undefined);
            this.rootNode.htmlElement = $root;
        }
        this.eventHandler = new EventHandler_1.EventHandler(this);
    }
    VApp.prototype.addInitialRenderEventlistener = function (listener) {
        this.eventListeners.push(listener);
    };
    VApp.prototype.mountComponent = function (component, mount, props) {
        if (props == undefined) {
            props = new Props_1.Props(this);
        }
        var compMount = this.createElement("div", undefined, mount);
        var compProps = component.build(this)(compMount, props);
        this.compProps.push(new Component_1.ComponentEventHolder(compProps, compMount));
        return compMount;
    };
    VApp.prototype.unmountComponent = function (mount) {
        var filteredComps = this.compProps.filter(function (it) { return it.mount == mount; });
        if (filteredComps.length == 0) {
            console.error("Node is not component mount");
            return;
        }
        else if (!filteredComps[0].mount[0]) {
            console.error("Component cannot be unmounted before it was mounted");
            return;
        }
        var target = filteredComps[0];
        target.mount.parent.removeChild(target.mount);
        this.compProps.splice(this.compProps.indexOf(target), 1);
        this.compsToNotifyUnmount.push(target.unmounted);
    };
    VApp.prototype.init = function () {
        this.snapshots.push(this.clone());
        this.tick();
    };
    VApp.prototype.tick = function () {
        var _this = this;
        setInterval(function () {
            if (!_this.dirty) {
                return;
            }
            console.log("Redraw");
            var patch = _this.renderer.diffAgainstLatest(_this);
            patch.apply(_this.rootNode.htmlElement);
            _this.dirty = false;
            _this.snapshots.push(_this.clone());
            if (_this.initial) {
                _this.initial = false;
                _this.eventListeners.forEach(function (f) { return f(); });
            }
            _this.compProps.filter(function (prop) { return !prop.mounted[0]; }).forEach(function (prop) {
                Common_1.invokeIfDefined(prop.mounted[1]);
                prop.mounted[0] = true;
            });
            _this.compsToNotifyUnmount.forEach(function (f) { return Common_1.invokeIfDefined(f); });
            _this.compsToNotifyUnmount = [];
        }, 50);
    };
    VApp.prototype.notifyDirty = function () {
        this.dirty = true;
    };
    VApp.prototype.getLatestSnapshot = function () {
        if (this.snapshots.length < 1) {
            return undefined;
        }
        return this.snapshots[this.snapshots.length - 1];
    };
    VApp.prototype.getPreviousSnapshot = function () {
        if (this.snapshots.length < 2) {
            return undefined;
        }
        return this.snapshots[this.snapshots.length - 2];
    };
    VApp.prototype.clone = function () {
        return new VApp(this.targetId, this.renderer, this.rootNode);
    };
    VApp.prototype.createElement = function (tagName, content, parentNode, attrs, props) {
        if (content === void 0) { content = ""; }
        this.notifyDirty();
        if (props == undefined) {
            props = new Props_1.Props(this);
        }
        if (parentNode == undefined) {
            parentNode = this.rootNode;
        }
        var newNode;
        if (tagName == "input") {
            newNode = new VNode_1.VInputNode(this, tagName, new Array(), content, props, attrs, parentNode);
        }
        else {
            newNode = new VNode_1.VNode(this, tagName, new Array(), content, props, attrs, parentNode);
        }
        parentNode.appendChild(newNode);
        //console.log("Adding node: ", newNode)
        return newNode;
    };
    VApp.prototype.createUnmanagedNode = function (mount) {
        this.notifyDirty();
        var unmanagedNode = new VNode_1.VNode(this, "div", [], "", new Props_1.Props(this), [], mount, "__UNMANAGED__");
        mount.appendChild(unmanagedNode);
        return unmanagedNode;
    };
    return VApp;
}());
exports.VApp = VApp;
