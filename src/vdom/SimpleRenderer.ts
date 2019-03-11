import { Attribute, VNode } from "./VNode";

// TODO: is object a possible type for value
type PrimitiveAttributeValue = string | boolean | object;

export class SimpleRenderer {
    private setBoolAttribute($elem: Element, name: string, value: boolean) {
        if (value) {
            $elem.setAttribute(name, String(value));
        }
        $elem[name] = value;
    }

    private removeBooleanAttribute($elem: Element, name: string) {
        $elem.removeAttribute(name);
        $elem[name] = false;
    }

    private isCustomAttribute(name) {
        return false; // TODO: Implement events
    }

    private setAttribute($elem: Element, name: string, value: PrimitiveAttributeValue) {
        if (this.isCustomAttribute(name)) return; // TODO: Implement events

        if (name == "className") {
            if (typeof value != "string") {
                console.error("Value passed as 'class' attribute is not a string: ", value, typeof value);
            }
            $elem.setAttribute("class", value as string);
        } else if (typeof value == "boolean") {
            this.setBoolAttribute($elem, name, value as boolean);
        } else {
            if (typeof value != "string") {
                console.error("Value passed as HTML attribute is not a string: ", value, typeof value);
            }
            $elem.setAttribute(name, value as string);
        }
    }

    // TODO: is object a possible type for value?
    private removeAttribute($elem: Element, name: string, value: PrimitiveAttributeValue) {
        if (this.isCustomAttribute(name)) return; // TODO: Implement events

        if (name == "className") {
            if (typeof value != "string") {
                console.error("Value passed as 'class' attribute is not a string: ", value, typeof value);
            }
            $elem.removeAttribute("class");
        } else if (typeof value == "boolean") {
            this.removeBooleanAttribute($elem, name);
        } else {
            if (typeof value != "string") {
                console.error("Value passed as HTML attribute is not a string: ", value, typeof value);
            }
            $elem.removeAttribute(name);
        }
    }

    private setAttributes($elem: HTMLElement, attrs: Attribute[]) {
        attrs.forEach(att => {
            this.setAttribute($elem, att.attrName, att.attrValue);
        });
    }



    private updateAttribute(
        $elem: Element,
        name: string,
        oldValue: PrimitiveAttributeValue,
        newValue: PrimitiveAttributeValue
    ) {
        if (newValue == undefined || (typeof newValue == "boolean" && (newValue as boolean == false))) {
            this.removeAttribute($elem, name, oldValue);
            return;
        }

        if (oldValue == undefined || newValue != oldValue) {
            this.setAttribute($elem, name, newValue);
        }
    }


    // TODO: This assumes that both Attribute lists are of the same length and order
    private updateAttributes($elem: Element, oldAttrs: Attribute[], newAttrs: Attribute[]) {
        newAttrs.forEach(attr => {
            $elem.setAttribute(attr.attrName, attr.attrValue)
        });

        oldAttrs.forEach(attr => {
            $elem.removeAttribute(attr.attrName);
        });
    }

    private performDOMelCreation(node: VNode): HTMLElement {
        let $elem = document.createElement(node.nodeName);
        node.htmlElement = $elem;
        $elem.innerHTML = node.innerHtml;
        if (node.attrs != undefined) {
            node.attrs.forEach(attr => $elem.setAttribute(attr.attrName, attr.attrValue));
        }

        node.children.forEach(child => {
            const $child = this.performDOMelCreation(child);
            $elem.appendChild($child);
        });

        return $elem;
    }

    public updateElement($parent: Element, newNode?: VNode, oldNode?: VNode, index = 0) {
        console.log("Processing: ", newNode, oldNode);
        if (oldNode == undefined) {
            const $newHtmlElement = this.performDOMelCreation(newNode);
            console.log("newHTLMElement", $newHtmlElement);
            $parent.appendChild($newHtmlElement);
            return;
        }

        if (newNode == undefined) {
            console.log("Removing");
            $parent.removeChild(
                oldNode.htmlElement
            );
            return;
        }

        if (newNode.equalsWithoutHTML(oldNode)) {
            if (oldNode.htmlElement == undefined) {
                debugger;
            }
            oldNode.htmlElement.innerHTML = newNode.innerHtml;
        } else if (!newNode.equals(oldNode)) {
            console.log(newNode, oldNode, newNode.equals(oldNode));
            console.log("Replace node")
            $parent.replaceChild(
                this.performDOMelCreation(newNode),
                $parent.childNodes[index]
            );
            return;
        }


        if (newNode.nodeName != undefined && newNode.nodeName != "") {
            console.log("TARGET")
            this.updateAttributes(
                $parent.children.item(index),
                newNode.attrs,
                oldNode == undefined ? [] : oldNode.attrs
            );
            oldNode.children.forEach((_, i) => {
                this.updateElement(
                    $parent.children[index],
                    newNode.children[i],
                    oldNode.children[i],
                    i
                );
            });
            newNode.children.slice(oldNode.children.length).forEach((_, i) => {
                this.updateElement(
                    $parent.children[index],
                    newNode.children[i],
                    oldNode.children[i],
                    i
                );
            });
        }
    }
}






