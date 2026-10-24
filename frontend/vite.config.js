const { defineConfig } = require("vite");
const path = require("path");

module.exports = defineConfig({
  root: __dirname,
  server: {
    proxy: {
      "/api": "http://localhost:3000"
    }
  },
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true
  }
});
