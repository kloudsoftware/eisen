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
var Component_1 = require("../../vdom/Component");
var navbarcss_1 = require("./navbarcss");
var Navbar = /** @class */ (function (_super) {
    __extends(Navbar, _super);
    function Navbar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Navbar.prototype.build = function (app) {
        return function (root, props) {
            app.createElement("style", navbarcss_1.css, root);
            var div = app.k("fjskkajfk", undefined, undefined, app.k("h1", "Foooooooo"));
            root.appendChild(div);
            return {};
        };
    };
    return Navbar;
}(Component_1.Component));
exports.Navbar = Navbar;
