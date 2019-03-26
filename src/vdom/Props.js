"use strict";
exports.__esModule = true;
var Props = /** @class */ (function () {
    function Props(app, props) {
        if (props == undefined) {
            props = new Map();
        }
        this.props = props;
        this.app = app;
    }
    Props.prototype.setProp = function (key, value) {
        this.app.notifyDirty();
        this.props.set(key, value);
    };
    Props.prototype.clone = function () {
        var _this = this;
        var clone = new Props(this.app);
        Array.from(this.props.keys()).forEach(function (it) {
            var value = _this.props.get(it);
            if (typeof value == 'string' || typeof value == 'number') {
                clone.setProp(it, value);
            }
            else {
                clone.setProp(it, value.clone());
            }
        });
        return clone;
    };
    Props.prototype.getProp = function (key) {
        var value = this.props.get(key);
        if (typeof value == 'string' || typeof value == 'number') {
            return value;
        }
        return value.clone();
    };
    return Props;
}());
exports.Props = Props;
