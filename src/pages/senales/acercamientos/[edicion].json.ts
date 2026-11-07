/**
 * /senales/acercamientos/AAAA-sNN.json: las vistas de cerca del Big board,
 * una por señal, generadas en el build a partir de las coordenadas del JSON.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { edicionVigente, type Edicion } from '../../../lib/senales';
import { acercamientosEdicion } from '../../../lib/acercamientos';

// Solo la edición vigente: las archivadas no usan el tablero y así el build no se alarga.
export const getStaticPaths: GetStaticPaths = () => {
  const e = edicionVigente();
  return [{ params: { edicion: e.id }, props: { edicion: e } }];
};

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(acercamientosEdicion((props as { edicion: Edicion }).edicion)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
