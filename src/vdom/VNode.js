"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Common_1 = require("./Common");
var uuid_1 = require("uuid");
var Props_1 = require("./Props");
exports.kloudAppId = "data-kloudappid";
var parser = new Common_1.Stringparser();
var VNode = /** @class */ (function () {
    function VNode(app, nodeName, children, innerHtml, props, attrs, parent, id) {
        var _this = this;
        this.dynamicContent = false;
        this.modifiedInnerHtml = false;
        this.addClass = function (name) {
            var classAttr = _this.attrs.filter(function (el) { return el.attrName == "class"; })[0];
            if (classAttr == undefined) {
                classAttr = new Attribute("class", name);
                _this.attrs.push(classAttr);
                return;
            }
            classAttr.attrValue = classAttr.attrValue + " " + name;
        };
        this.removeClass = function (name) {
            var classAttr = _this.attrs.filter(function (el) { return el.attrName == "class"; })[0];
            if (classAttr == undefined) {
                return;
            }
            classAttr.attrValue = classAttr.attrValue.replace(name, "");
        };
        if (attrs == undefined) {
            this.attrs = new Array();
        }
        else {
            this.attrs = attrs;
        }
        this.app = app;
        if (props == undefined) {
            props = new Props_1.Props(app);
        }
        this.props = props;
        this.nodeName = nodeName;
        this.innerHtml = innerHtml;
        this.parent = parent;
        this.children = children;
        if (id != undefined) {
            this.id = id;
        }
        if (innerHtml != undefined) {
            var parsed = innerHtml.match(Common_1.dataRegex);
            if (parsed != null && parsed.length != 0) {
                this.dynamicContent = true;
            }
        }
        this.attrs.push(new Attribute(exports.kloudAppId, this.id));
    }
    VNode.prototype.addFocusListener = function (func) {
        this.htmlElement.addEventListener("focus", func);
    };
    VNode.prototype.addBlurListener = function (func) {
        this.htmlElement.addEventListener("blur", func);
    };
    VNode.prototype.setAttribute = function (name, value) {
        var isSet = this.attrs.filter(function (a) { return a.attrName == name; }).length > 0;
        if (!isSet) {
            this.attrs.push(new Attribute(name, value));
            return;
        }
        this.attrs.filter(function (a) { return a.attrName == name; })[0].attrValue = value;
    };
    VNode.prototype.$getChildren = function () {
        return this.children;
    };
    VNode.prototype.setInnerHtml = function (str) {
        this.app.notifyDirty();
        this.modifiedInnerHtml = true;
        this.innerHtml = str;
    };
    VNode.prototype.getInnerHtml = function () {
        return parser.parse(this.innerHtml, this.props);
    };
    VNode.prototype.replaceChild = function (old, node) {
        this.replaceWith(old, node);
    };
    VNode.prototype.removeChild = function (toRemove) {
        this.app.notifyDirty();
        this.replaceWith(toRemove, undefined);
    };
    VNode.prototype.appendChild = function (node) {
        this.app.notifyDirty();
        node.parent = this;
        this.children.push(node);
    };
    VNode.prototype.addEventlistener = function (evt, func) {
        this.app.eventHandler.registerEventListener(evt, func, this);
    };
    VNode.prototype.replaceWith = function (toReplace, replacement) {
        this.app.notifyDirty();
        var replaceIndex = -1;
        for (var i = 0; i < this.children.length; i++) {
            if (this.children[i] == undefined)
                continue;
            if (this.children[i] == toReplace) {
                replaceIndex = i;
                break;
            }
        }
        if (replaceIndex != -1) {
            this.children[replaceIndex] = replacement;
        }
    };
    VNode.prototype.clone = function (parent) {
        var id = this.id;
        var nodeName = this.nodeName;
        var innerHtml = this.innerHtml;
        var props = Object.assign(this.props, {});
        var htmlElement = this.htmlElement;
        var attrs = this.attrs.map(function (a) { return a.clone(); });
        var clonedNode = new VNode(this.app, nodeName, [], innerHtml, props, attrs, parent, id);
        var children = [];
        this.children.forEach(function (child) {
            if (child == undefined) {
                children.push(undefined);
            }
            else {
                children.push(child.clone(clonedNode));
            }
        });
        clonedNode.children = children;
        clonedNode.htmlElement = htmlElement;
        return clonedNode;
    };
    //Sets a new id for every item
    VNode.prototype.copy = function (parent) {
        var id = uuid_1.v4();
        var nodeName = this.nodeName;
        var innerHtml = this.innerHtml;
        var props = Object.assign(this.props, {});
        var htmlElement = this.htmlElement;
        var attrs = this.attrs.map(function (a) { return a.clone(); });
        var clonedNode = new VNode(this.app, nodeName, [], innerHtml, props, attrs, parent, id);
        var children = this.children.map(function (c) { return c.copy(clonedNode); });
        clonedNode.children = children;
        clonedNode.htmlElement = htmlElement;
        return clonedNode;
    };
    VNode.prototype.equals = function (o) {
        if (o == undefined)
            return false;
        return this.nodeName == o.nodeName;
    };
    return VNode;
}());
exports.VNode = VNode;
exports.cssClass = function () {
    var classNames = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        classNames[_i] = arguments[_i];
    }
    if (classNames.length == 1) {
        return new Attribute("class", classNames[0]);
    }
    var val = classNames.reduce(function (acc, curr) { return acc + curr + " "; }, "").trim();
    return new Attribute("class", val);
};
exports.id = function (id) { return new Attribute("id", id); };
exports.labelFor = function (idFor) { return new Attribute("for", idFor); };
exports.password = function () { return new Attribute("type", "password"); };
var Attribute = /** @class */ (function () {
    function Attribute(attrName, attrValue) {
        this.attrName = attrName;
        this.attrValue = attrValue;
    }
    Attribute.prototype.clone = function () {
        return new Attribute(this.attrName, this.attrValue);
    };
    Attribute.prototype.equals = function (attribute) {
        return this.attrName == attribute.attrName && this.attrValue == attribute.attrValue;
    };
    return Attribute;
}());
exports.Attribute = Attribute;
var VInputNode = /** @class */ (function (_super) {
    __extends(VInputNode, _super);
    function VInputNode() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VInputNode.prototype.bindObject = function (obj, key) {
        this.app.eventHandler.registerEventListener("input", function (ev, node) {
            obj[key] = node.htmlElement.value;
        }, this);
    };
    VInputNode.prototype.bind = function (object, propKey) {
        this.app.eventHandler.registerEventListener("input", function (ev, node) {
            object.setProp(propKey, node.htmlElement.value);
        }, this);
    };
    return VInputNode;
}(VNode));
exports.VInputNode = VInputNode;
