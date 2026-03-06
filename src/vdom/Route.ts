import {VNode} from './VNode';
import {Component} from './Component';
import {VApp} from './VApp';
import {Props} from './Props';
import {IRouter} from '../Router';

interface RouteConfig {
    path: string;
    component: { new(app: VApp, ...args: any[]): Component };
}

/**
 * Declarative route registration. Call in your app setup:
 *
 *   const { app } = createApp(App, '#app');
 *   const router = app.useRouter(mountNode);
 *
 *   registerRoutes(router, app, [
 *       { path: '/home', component: HomePage },
 *       { path: '/about', component: AboutPage },
 *       { path: '/user/:id', component: UserPage },
 *   ]);
 *
 *   router.resolveRoute(location.pathname);
 */
export function registerRoutes(
    router: IRouter,
    app: VApp,
    routes: RouteConfig[]
): void {
    for (const route of routes) {
        const component = new route.component(app);
        router.registerRoute(route.path, component);
    }
}

/**
 * JSX-style route definition. Returns route configs for use with registerRoutes:
 *
 *   const routes = [
 *       Route('/home', HomePage),
 *       Route('/about', AboutPage),
 *       Route('/user/:id', UserPage),
 *   ];
 *   registerRoutes(router, app, routes);
 */
export function Route(path: string, component: { new(app: VApp, ...args: any[]): Component }): RouteConfig {
    return { path, component };
}
