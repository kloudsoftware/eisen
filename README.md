# eisen

Declarative and expressive TypeScript framework for building modern web applications.

## What is eisen?

eisen [ˈaizən] is a frontend Framework used to create web applications. It is fully written in Typescript and is Dependency free.
Much like other web frameworks, eisen supports two way databinding, single page application routing, internationalization (i18n), components and a fast virtual dom.
 
### Why use eisen?
 
Because eisen is fully written in typescript, d.ts files are always available and typescript is always kept in mind while developing new features. This leads
to excellent editor integration and *typesafe* programming. 
 
eisen is also fully dependency free, this leads to a very lean and easy to understand project structure. Everything you need to know is here. First class i18n and Router support.
The framework is also very lean, coming in at only 1200(not minified) LoC while still retaining a lot of functionality.
    
# How do I use eisen?

## Installing eisen
You can install eisen easily using npm:
```
npm i @kloudsoftware/eisen
```

## Using eisen

A very basic eisen app could look like this

index.ts:
```
import { VApp, Renderer } from '@kloudsoftware/eisen';

const renderer = new Renderer();
const app = new VApp("target", renderer);
app.init();

app.createElement("h1", "Hello world!", app.rootNode);
```

index.html:
```
<body>
    <div id="target"></div>
</body>

<script src="./index.ts"></script>
```

Some notes:
  * target could be any part of the webpage, it only represents the mountpoint for the whole app. Everything will be rendered inside of this node
  * You do not need to worry about updating the DOM, as this will be handled by the app, intelligently only re-rendering what is needed and when it is needed.

Of course, this is just a basic example, if you want to build something more complex, you should consider adding a component.

## Components

In order to encapsulate and re-use your work, you should use components. eisen exposes a powerful api to realize this:

BtnCounterComponent.ts
```
import { Component, ComponentBuildFunc } from '@kloudsoftware/eisen';
import { VApp } from '@kloudsoftware/eisen';
import { VNode } from '@kloudsoftware/eisen';
import { Props } from '@kloudsoftware/eisen';

export default class BtnCounter extends Component {
    build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props) => {
            props.setProp("times", 0);
            let btn = app.createElement("button", "You have clicked me {{ times }} times!", root, undefined, props);

            btn.addEventListener("click", (ev: Event, _btn: VNode) => {
                props.setProp("times", props.getProp("times") + 1);
            }, btn)

            return {
                mounted: () => {
                    console.log("Mounted");
                },

                unmounted: () => {
                    console.log("unmounted");
                },

                remount: () => {
                    console.log("remounted");
                }
            }
        }
    }
}
```

This is a basic example of a component. Notice how the component has a build function. It will be invoked when the VApp renders your component.
It will take care of creating it and mounting it. The component really describes the way you component "should" look like, making it easily re-usable.

This example also showcases how two way databinding is done in eisen. The Properties object contains information about this component. You can use it to communicate, store information
or do two way databinding. The *times* key will be inserted into the button, incrementing the counter each time the button is clicked.

We also bypass the native eventhandler and use the eventhandler provided by eisen. It features a few extra things, such as inserting the VNode as a parameter into the eventhandler function. This should be considered best practice as it is way cheaper to do and does not require your VNode to be visible (i.e. have a real htmlElement associated with it).

### Mounting a Component

index.ts
```
import { VApp, Renderer } from '@kloudsoftware/eisen';
import { BtnCounter } from './BtnCounterComponent.ts'

const renderer = new Renderer();
const app = new VApp("target", renderer);
app.init();

app.mountComponent(new BtnCounter(), app.rootNode, new Props(app);
```

It is that easy. If you take a look at the object returned by the ComponentBuildFunc, you can see a few methods. Those are invoked for you by the VApp, notifying you about state changes.

  * mounted: Will be invoked when your component appears on the DOM and is visible to the user.  
  * unmounted: Will be invoked after your component gets removed from the DOM and is no longer visible. Use this method to clean up any unecessary items, or send of requests etc.
  * remounted: Will be invoked if your component is remounted, using the VApp.remount function.

## User input Validation and binding an input field

Often we need to validate user input in some way. eisen provides a convenient way to validate most inputs. Using the validate function on a VInputNode, you can add a function that will validate user input,
returning true if validation was successfull and false if it was not. This function takes a string as second parameter, that should correspond to a css class, it will be applied if an error is present and
removed if the error is fixed:


example: 
Assume the app is already created.

```
let userNameObj = {
    name: "";
};

let userName = app.k("input", { attrs: [id("iUserName"), cssClass("user-input")] }) as VInputNode;

userName.bindObj(userNameObj, "name");

userName.validate(() => {
    return userNameObj.name.length > 3
}, "error");

app.rootNode.appendChild(userName);
```



Notes: 
  * app.k is simply syntactic sugar around the app.createElement function, providing a convenient way to model a whole dom in typescript. Nodes created this way will "dangle", having no parents by default. This is useful as you do not trigger re-renders on every creation)
  * any node with the type "input" can be cast into VInputNode, providing you with the extra functions.
  * bindObj takes any object as a paramenter and a field that will be used to bind the value of the input field to the name key of userName. It will update in real time to the value of the input field
  * validate will be called anytime the ["blur"](https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event) event triggers on the field
    
## Routing

tbd

# Maintainers

eisen is written and maintained by: [kloudsoftware](https://github.com/orgs/kloudsoftware/people)
