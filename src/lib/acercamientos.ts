/**
 * Acercamientos del Big board: la vista de cerca de cada señal.
 *
 * Para cada señal se dibujan las costas, las fronteras entre países y, en EE.UU.,
 * los límites entre estados, en un recuadro de unos 1.000 km centrado en sus
 * coordenadas (proyección azimutal equidistante, que conserva rumbos y distancias
 * desde el centro). Es cartografía de Natural Earth y del censo de EE.UU.: no hay
 * imagen satelital. Se calcula en el build y el navegador solo descarga el archivo
 * de la edición cuando alguien abre el tablero.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature, mesh } from 'topojson-client';
import { geoAzimuthalEquidistant, geoGraticule, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import type { Edicion } from './senales';

/** Medio lado del recuadro, en grados de arco (unos 500 km). */
const MEDIO_LADO = 4.5;
/** Lado del recuadro en unidades del viewBox. */
const LADO = 400;

export interface Acercamiento {
  tierra: string;
  fronteras: string;
  estados: string;
  grilla: string;
}

interface Capas {
  tierra: GeoPermissibleObjects;
  fronteras: GeoPermissibleObjects;
  estados: GeoPermissibleObjects;
}

let capas: Capas | null = null;

function cargarCapas(): Capas {
  if (capas) return capas;
  const requerir = createRequire(`${process.cwd()}/package.json`);
  const leer = (ruta: string) => JSON.parse(readFileSync(requerir.resolve(ruta), 'utf8'));
  const mundo = leer('world-atlas/land-10m.json');
  const paises = leer('world-atlas/countries-10m.json');
  const eeuu = leer('us-atlas/states-10m.json');
  capas = {
    tierra: feature(mundo, mundo.objects.land) as GeoPermissibleObjects,
    fronteras: mesh(paises, paises.objects.countries, (a, b) => a !== b) as GeoPermissibleObjects,
    estados: mesh(eeuu, eeuu.objects.states, (a, b) => a !== b) as GeoPermissibleObjects,
  };
  return capas;
}

export function acercamiento(lat: number, lon: number): Acercamiento {
  const c = cargarCapas();
  const proyeccion = geoAzimuthalEquidistant()
    .rotate([-lon, -lat])
    .scale(LADO / 2 / ((MEDIO_LADO * Math.PI) / 180))
    .translate([LADO / 2, LADO / 2])
    .clipExtent([
      [-4, -4],
      [LADO + 4, LADO + 4],
    ])
    .precision(0.3);
  const trazar = geoPath(proyeccion).digits(1);
  const grilla = geoGraticule()
    .step([1, 1])
    .extent([
      [lon - 12, lat - 8],
      [lon + 12, lat + 8],
    ]);
  return {
    tierra: trazar(c.tierra) ?? '',
    fronteras: trazar(c.fronteras) ?? '',
    estados: trazar(c.estados) ?? '',
    grilla: trazar(grilla()) ?? '',
  };
}

/** Los acercamientos de todas las señales de una edición, por número de señal. */
export function acercamientosEdicion(e: Edicion): Record<string, Acercamiento> {
  const salida: Record<string, Acercamiento> = {};
  for (const eje of e.ejes) {
    for (const s of eje.senales) salida[String(s.n)] = acercamiento(s.lat, s.lon);
  }
  return salida;
}
