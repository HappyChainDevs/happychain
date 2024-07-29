import { Outlet, createRootRoute } from "@tanstack/react-router";
import { lazy } from "react";

const inProduction = import.meta.env.MODE === "production";
const inIframe = window.parent !== window.self;

const TanStackRouterDevtools =
	inProduction || inIframe
		? () => null // Render nothing in production or embedded in iframe
		: lazy(() =>
				// Lazy load in development
				import("@tanstack/router-devtools").then((res) => ({
					default: res.TanStackRouterDevtools,
					// For Embedded Mode
					// default: res.TanStackRouterDevtoolsPanel
				})),
			);

export const Route = createRootRoute({
	component: () => (
		<>
			<Outlet />
			<TanStackRouterDevtools />
		</>
	),
});
