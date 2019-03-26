"use strict";
exports.__esModule = true;
var VApp_1 = require("./VApp");
var Renderer = /** @class */ (function () {
    function Renderer() {
    }
    //Proxy for calling
    Renderer.prototype.diffAgainstLatest = function (app) {
        var latest = app.getLatestSnapshot();
        if (latest == undefined) {
            return function (el) {
                return el;
            };
        }
        return this.diff(latest, app);
    };
    Renderer.prototype.diff = function (snapshot, vApp) {
        var patch = this.diffElement(snapshot.rootNode, vApp.rootNode);
        return patch;
    };
    Renderer.prototype.removeElement = function (parent, toRemove) {
        parent.removeChild(toRemove.htmlElement);
    };
    Renderer.prototype.diffElement = function (oldVNode, newVNode) {
        var _this = this;
        if (newVNode == undefined) {
            if (oldVNode == undefined) {
                return function (el) { return el; };
            }
            return function (el) {
                _this.removeElement(el, oldVNode);
                return el;
            };
        }
        if (oldVNode == undefined) {
            return function (el) {
                el.appendChild(_this.renderTree(newVNode));
                return el;
            };
        }
        if (newVNode.id == VApp_1.unmanagedNode) {
            return function (el) { return el; };
        }
        if (!oldVNode.equals(newVNode)) {
            return function (el) {
                el.replaceChild(_this.renderTree(newVNode), oldVNode.htmlElement);
                return el;
            };
        }
        var childPatches = [];
        oldVNode.$getChildren().forEach(function (child, i) {
            childPatches.push(_this.diffElement(child, newVNode.$getChildren()[i]));
        });
        newVNode.$getChildren().slice(oldVNode.$getChildren().length).forEach(function (child) {
            childPatches.push(function (parent) {
                parent.appendChild(_this.renderTree(child));
                return parent;
            });
        });
        var attributePatch = this.diffAttributes(oldVNode, newVNode);
        var innerHtmlPatch = this.diffInnerHtml(oldVNode, newVNode);
        return function ($node) {
            childPatches.forEach(function (patch) { return patch(newVNode.htmlElement); });
            attributePatch(newVNode.htmlElement);
            innerHtmlPatch(newVNode.htmlElement);
            return $node;
        };
    };
    Renderer.prototype.diffInnerHtml = function (oldVNode, newVNode) {
        if (newVNode.modifiedInnerHtml || newVNode.dynamicContent) {
            return function ($node) {
                //console.log($node, newVNode.getInnerHtml());
                $node.innerHTML = newVNode.getInnerHtml();
                return $node;
            };
        }
        return function ($node) { return $node; };
    };
    Renderer.prototype.diffAttributes = function (node, newVNode) {
        var patches = [];
        Array.from(newVNode.htmlElement.attributes).forEach(function (attribute) {
            patches.push(function ($node) {
                $node.removeAttribute(attribute.name);
                return $node;
            });
        });
        newVNode.attrs.forEach(function (attr) {
            patches.push(function ($node) {
                $node.setAttribute(attr.attrName, attr.attrValue);
                return $node;
            });
        });
        return function ($node) {
            patches.forEach(function (p) { return p($node); });
            return $node;
        };
    };
    Renderer.prototype.renderTree = function (node) {
        var _this = this;
        var $elem = document.createElement(node.nodeName);
        node.htmlElement = $elem;
        $elem.innerHTML = node.getInnerHtml();
        if (node.attrs != undefined) {
            node.attrs.forEach(function (attr) { return $elem.setAttribute(attr.attrName, attr.attrValue); });
        }
        node.$getChildren().forEach(function (child) {
            $elem.appendChild(_this.renderTree(child));
        });
        return $elem;
    };
    return Renderer;
}());
exports.Renderer = Renderer;
