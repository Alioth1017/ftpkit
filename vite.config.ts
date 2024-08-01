import { defineConfig } from "vite";
import { resolve } from "path";
import babel from "@rollup/plugin-babel";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "library",
      fileName: (format) => `library.${format}.js`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
      plugins: [
        babel({
          babelHelpers: "runtime",
          extensions: [".js", ".ts"],
        }),
      ],
    },
  },
});
