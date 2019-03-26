"use strict";
exports.__esModule = true;
var Component = /** @class */ (function () {
    function Component() {
    }
    return Component;
}());
exports.Component = Component;
var ComponentEventHolder = /** @class */ (function () {
    function ComponentEventHolder(props, mount) {
        this.mounted = [false, props.mounted];
        this.unmounted = props.unmounted;
        this.mount = mount;
    }
    return ComponentEventHolder;
}());
exports.ComponentEventHolder = ComponentEventHolder;
