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

## Dónde vive el proyecto

`~/Sitios/mundoliminal` — **fuera de iCloud a propósito**.

El Escritorio, Documentos y Descargas de este Mac sincronizan con iCloud, y
eso ya habia dañado el repo: 484 carpetas duplicadas de conflicto en
`node_modules` y cuatro refs rotos dentro de `.git` (`main 2`, `main 3`).
No devolver el proyecto a ninguna de esas tres carpetas.

El acceso rapido esta en `Escritorio/ESCRITORIO LIMINAL/Automatismos/`.
