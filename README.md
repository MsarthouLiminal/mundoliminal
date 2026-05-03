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
