import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    solidPlugin(),
    monkey({
      entry: 'src/index.tsx',
      userscript: {
        icon: 'https://raw.githubusercontent.com/thexyno/lolpizza2/main/logo.png',
        namespace: 'github.com/thexyno/lolpizza2',
        match: ['https://*.lieferando.de/*', `${process.env.VITE_BACKEND_URL ?? "https://lolpizza.ragon.xyz/"}*`, 'http://localhost:8080/*'],
      },
    }),
  ],
});
