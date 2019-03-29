import { Component, ComponentBuildFunc } from "../../vdom/Component";
import { VApp } from "../../vdom/VApp";
import { VNode, id } from "../../vdom/VNode";
import { Props } from "../../vdom/Props";
import { HttpClient } from "../../HttpClient";
import { parseStrIntoVNode, parseIntoUnmanaged } from "../../vdom/Common";
import { blog1 } from "./DummyBlog";
import { css } from "./blogcss"

export class BlogViewComponent extends Component {
    build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props) => {

            const scopedCss = app.k("style", { value: css })
            const http = app.get<HttpClient>("http");


            root.appendChild(scopedCss);
            //TODO get blogposts
            //TODO translate response into Props
            const blogMount = app.k("div", { attrs: [id("blogMount")] })
            const blogEntries = [blog1];
            const posts: Props[] = blogEntries.map(entry => {
                const map = new Map();
                map.set("htmlString", entry);
                return map;
            }).map(entry => new Props(app, entry));

            return {
                mounted: () => {
                    console.log("Mounted");
                    root.appendChild(blogMount);
                    posts.forEach(prop => {
                        app.mountComponent(new BlogPostViewComponent(), blogMount, prop);
                    });

                },

                unmounted: () => {
                    console.log("unmounted");
                },
                remount: () => {
                }
            }
        }
    }
}

export class BlogPostViewComponent extends Component {
    build(app: VApp): ComponentBuildFunc {
        return (root: VNode, props: Props) => {

            let containerdiv = app.k("div")
            containerdiv.addClass("card container blogPostContainer");



            const http = app.get<HttpClient>("http");
            parseIntoUnmanaged(props.getProp("htmlString"), containerdiv);
            root.appendChild(containerdiv);


            return {
                mounted: () => {
                    console.log("Mounted blogpost");
                },

                unmounted: () => {
                    console.log("unmounted");
                },
                remount: () => {
                }
            }
        }
    }
}
