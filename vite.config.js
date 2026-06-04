import { defineConfig } from 'vite';
import { resolve } from 'path';

// Two previews share the same assets in /public:
//   index.html            — V1 (gradient slide-deck)
//   FootageX/index.html   — V2 (video-footage backgrounds)
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        footagex: resolve(__dirname, 'FootageX/index.html'),
      },
    },
  },
});
