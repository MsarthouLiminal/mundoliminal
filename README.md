# mundoliminal.com

Sitio editorial del proyecto LIMINAL — Martín Sarthou.

## Stack

- **Astro** (salida 100% estática)
- **TypeScript** strict
- **Cloudflare Pages** (despliegue)
- Fuentes self-hosted vía `@fontsource` (Oswald variable, Space Mono 400/700)
- CSS plano con variables de diseño basadas en el Brand Kit v1.1

## Desarrollo

```sh
npm install
npm run dev
```

Local: http://localhost:4321

## Build

```sh
npm run build
npm run preview
```

Output estático en `dist/`.

## Estructura

- `src/pages/` — 9 páginas (Home, Sobre Martín, Talks, Reportes, Consultoría, Eventos, Transparencia, Contacto, Catálogo).
- `src/content/` — colecciones Markdown: `episodes/` y `columns/`, validadas con Zod.
- `src/lib/pillars.ts` — taxonomía editorial (P1–P5).
- `src/styles/tokens.css` — paleta y tipografía del Brand Kit.
- `public/brand/logos/` — variantes oficiales del logo (copia controlada del Brand Kit).
- `docs/brand-kit-v1.1.pdf` — copia interna del Documento Madre (referencia, no se publica).

## Brand Kit

Sistema visual bloqueado en **LIMINAL Brand Kit v1.1**. Para cambios, consultar el PDF en `docs/`.

## Publicar

Doble clic en `ESCRITORIO LIMINAL/Automatismos/Publicar LIMINAL.command`.
Sube los cambios y dispara la publicación en Cloudflare. Copia maestra del
script en `scripts/publicar.command`.

**Nunca usar Retry ni Rollback en el panel de Cloudflare**: reconstruyen la
línea que se toca, no la última, y republican código viejo.

## node_modules e iCloud

El proyecto vive dentro del Escritorio, que sincroniza con iCloud. Como
`node_modules` son ~39.000 archivos, está guardado como `node_modules.nosync`
con un symlink `node_modules ->  node_modules.nosync`: iCloud ignora todo lo
que termina en `.nosync`.

Si alguna vez borrás `node_modules` a mano o algo lo reemplaza por una carpeta
real, se repone así:

```sh
rm -rf node_modules
mv node_modules.nosync node_modules 2>/dev/null || npm install
mv node_modules node_modules.nosync
ln -s node_modules.nosync node_modules
```

`npm install` funciona normal a través del symlink.
