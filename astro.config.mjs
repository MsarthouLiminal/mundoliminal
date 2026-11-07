import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Páginas que no se indexan: rutas de pilares sin uso y la vista de sala del Big board.
const SIN_INDEXAR = [/\/catalogo\/[^/]+\/?$/, /\/senales\/sala\/?$/];

export default defineConfig({
  site: 'https://mundoliminal.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (url) => !SIN_INDEXAR.some((re) => re.test(url)),
      // Misma forma que la URL canónica: con barra final.
      serialize: (item) => ({ ...item, url: item.url.endsWith('/') ? item.url : `${item.url}/` }),
    }),
  ],
});
