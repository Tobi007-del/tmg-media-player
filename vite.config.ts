import { defineConfig } from "vite";
import { sassPlugin } from "esbuild-sass-plugin";

export default defineConfig({
  server: {
    hmr: true,
    port: 7777,
    open: "/src/dev.html",
  },
  preview: {
    port: 7777,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    sassPlugin(),
    {
      name: "watch-and-reload",
      handleHotUpdate({ server, file: _ }) {
        // Send a full page reload signal down the socket line
        server.ws.send({ type: "full-reload", path: "*" });
        return []; // Return empty array to stop HMR from propagating
      },
    },
  ],
});
