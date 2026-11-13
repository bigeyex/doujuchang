import {defineConfig} from 'vite';
export default defineConfig({build:{target:'es2022',outDir:'dist',rollupOptions:{output:{manualChunks(id){if(/node_modules\/(?:@codemirror|@lezer|style-mod|w3c-keyname)/.test(id))return 'editor';if(/node_modules\/(?:react|react-dom|scheduler)\//.test(id))return 'react';}}}},server:{host:'127.0.0.1'},esbuild:{jsx:'automatic'}});
