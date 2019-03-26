"use strict";
exports.__esModule = true;
function arraysEquals(arrayA, arrayB) {
    if (arrayA.length != arrayB.length) {
        return false;
    }
    for (var i = 0; i < arrayA.length; i++) {
        if (!arrayA[i].equals(arrayB[i])) {
            return false;
        }
    }
    return true;
}
exports.arraysEquals = arraysEquals;
exports.dataRegex = /{{(.*?)}}/g;
var Stringparser = /** @class */ (function () {
    function Stringparser() {
    }
    Stringparser.prototype.parse = function (str, props) {
        var _this = this;
        var parsed = exports.dataRegex.exec(str);
        if (parsed == null || parsed.length == 0) {
            return str;
        }
        var parse = str.match(exports.dataRegex);
        var currStr = "";
        parsed;
        parse.forEach(function (it) { return currStr = _this.buildStringFunc(it, props, str); });
        return currStr;
    };
    Stringparser.prototype.getFromProps = function (uncleanKey, props) {
        var key = uncleanKey.split("{{")[1].split("}}")[0].trim();
        return props.getProp(key);
    };
    Stringparser.prototype.buildStringFunc = function (splitter, props, orig) {
        var parts = orig.split(splitter);
        return parts.join(this.getFromProps(splitter, props));
    };
    return Stringparser;
}());
exports.Stringparser = Stringparser;
exports.invokeIfDefined = function (fun) {
    if (fun != undefined) {
        fun();
    }
};
