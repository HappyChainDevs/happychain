import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		nodePolyfills({ globals: { Buffer: true } }), // required for web3Auth
		TanStackRouterVite(),
		react({
			// Crashes :(
			// plugins: [
			// 	["@swc-jotai/debug-label", {}],
			// 	["@swc-jotai/react-refresh", {}],
			// ],
		}),
	],
	define: { global: "globalThis" }, // required for web3Auth
});
