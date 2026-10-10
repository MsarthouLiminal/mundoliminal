import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Páginas que todavía no se indexan (rutas de pilares sin uso).
const SIN_INDEXAR = [/\/catalogo\/[^/]+\/?$/];

export default defineConfig({
  site: 'https://mundoliminal.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      filter: (url) => !SIN_INDEXAR.some((re) => re.test(url)),
      // Misma forma que la URL canónica: con barra final.
      serialize: (item) => ({ ...item, url: item.url.endsWith('/') ? item.url : `${item.url}/` }),
    }),
  ],
});
