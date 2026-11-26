/**
 * Recorrido de Señales en el navegador: el globo de puntos y la lectura guiada.
 *
 * Sirve a dos bloques, los dos con la clase .rec:
 *  - data-modo="recorrido" (/senales): al leer, cada paso que llega a la línea
 *    de lectura se vuelve el activo y el globo gira hacia su lugar.
 *  - data-modo="portada" (hero de la home): el globo gira solo; al pasar por un
 *    eje o por un número muestra esa señal.
 * El globo es cobe (WebGL). Si el navegador no tiene WebGL, el bloque queda sin
 * globo y la lectura funciona igual.
 */
import createGlobe from 'cobe';

type Tendencia = 'escala' | 'afloja' | 'estable';
interface SenalGlobo {
  n: number;
  lat: number;
  lon: number;
  t: Tendencia;
  eje: string;
  corto: string;
  lugar: string;
  arco: { lat: number; lon: number; nombre: string } | null;
}
interface Datos {
  semana: number | string;
  ejes: { id: string; nombre: string; slug: string }[];
  senales: SenalGlobo[];
  focos: { nombre: string; lat: number; lon: number }[];
}
interface Vista {
  tipo: 'inicio' | 'eje' | 'radar' | 'focos' | 'senal';
  eje?: string;
  n?: number;
}
interface Marca {
  el: HTMLElement;
  clic: boolean;
  p: [number, number, number];
  esChip: boolean;
  punto: string;
  prio: number;
  radio: number;
  sep: number;
  pref: string;
}
type Color = [number, number, number];

const { PI, sin, cos, asin, atan2, hypot, min, max, abs } = Math;
const RADIO = 0.8;
const ELEV = 0.012;
const LADOS = ['arriba', 'abajo', 'der', 'izq'];

const v3 = (lat: number, lon: number): [number, number, number] => {
  const r = (lat * PI) / 180;
  const a = (lon * PI) / 180 - PI;
  const o = cos(r);
  return [-o * cos(a), sin(r), o * sin(a)];
};
const aLatLon = (v: number[]): [number, number] => {
  const n = hypot(v[0], v[1], v[2]) || 1;
  const lat = (asin(v[1] / n) * 180) / PI;
  let lon = ((atan2(v[2], -v[0]) + PI) * 180) / PI;
  if (lon > 180) lon -= 360;
  return [lat, lon];
};
/** Punto medio sobre la esfera, con pesos. */
const centro = (puntos: [number, number, number?][]): [number, number] => {
  const s = [0, 0, 0];
  for (const [lat, lon, peso = 1] of puntos) {
    const v = v3(lat, lon);
    s[0] += v[0] * peso;
    s[1] += v[1] * peso;
    s[2] += v[2] * peso;
  }
  return hypot(s[0], s[1], s[2]) < 0.05 ? [puntos[0][0], puntos[0][1]] : aLatLon(s);
};
const dos = (n: number) => String(n).padStart(2, '0');

function hayWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function montar(raiz: HTMLElement) {
  const fuente = raiz.querySelector('[data-rec-datos]');
  const escena = raiz.querySelector<HTMLElement>('.escena');
  const caja = raiz.querySelector<HTMLElement>('.globo');
  const canvas = raiz.querySelector<HTMLCanvasElement>('.globo canvas');
  const capa = raiz.querySelector<HTMLElement>('.globo__capa');
  if (!fuente || !escena || !caja || !canvas || !capa) return;

  const datos: Datos = JSON.parse(fuente.textContent || '{}');
  const SEN = datos.senales;
  const FOCOS = datos.focos;
  const enPortada = raiz.dataset.modo === 'portada';
  /** Adónde llevan los números del globo: en la portada, a la señal en /senales. */
  const base = enPortada ? '/senales/' : '';
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esCelular = () => matchMedia('(max-width: 860px)').matches;

  const pasos = [...raiz.querySelectorAll<HTMLElement>('.paso')];
  const lugarMeta = raiz.querySelector<HTMLElement>('[data-rec-meta]');
  const lugarNombre = raiz.querySelector<HTMLElement>('[data-rec-nombre]');
  const casillas = [...raiz.querySelectorAll<HTMLAnchorElement>('.riel__nums a')];
  const grupos = [...raiz.querySelectorAll<HTMLElement>('.riel__grupo')];

  /* Colores: los mismos tokens que la hoja de estilos. */
  const estilo = getComputedStyle(raiz);
  const hex = (nombre: string, respaldo: string): Color => {
    const leido = estilo.getPropertyValue(nombre).trim().replace('#', '');
    const v = /^[0-9a-f]{6}$/i.test(leido) ? leido : respaldo;
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as Color;
  };
  const FONDO = hex('--vacio', '060c08');
  const COLOR: Record<Tendencia | 'foco', Color> = {
    escala: hex('--escala', 'ff7a1a'),
    afloja: hex('--afloja', '0fba94'),
    estable: hex('--estable', 'a9a69c'),
    foco: hex('--foco', 'c6b8db'),
  };
  const VAR: Record<Tendencia, string> = { escala: 'var(--escala)', afloja: 'var(--afloja)', estable: 'var(--estable)' };
  const apagar = (c: Color, f: number): Color => c.map((v, i) => FONDO[i] + (v - FONDO[i]) * f) as Color;

  const cur = { phi: 4.2, theta: 0.25, scale: 1 };
  const tgt = { phi: 4.2, theta: 0.25, scale: 1 };
  let globo: ReturnType<typeof createGlobe> | null = null;
  let pendiente = true;
  let corriendo = false;
  let aLaVista = true;
  let girar = true;
  let arrastrando = false;
  let lado = 0;
  let marcas: Marca[] = [];

  function apuntar(lat: number, lon: number, escala: number) {
    const deseado = (3 * PI) / 2 - (lon * PI) / 180;
    let d = (deseado - cur.phi) % (2 * PI);
    if (d > PI) d -= 2 * PI;
    if (d < -PI) d += 2 * PI;
    tgt.phi = cur.phi + d;
    tgt.theta = max(-1.1, min(1.1, ((lat * PI) / 180) * 0.85));
    tgt.scale = escala;
  }

  /** Dónde cae un punto del globo en la caja, en píxeles (la misma proyección que usa cobe). */
  function enPantalla(t: number[], o: typeof cur): [number, number, number] {
    const ct = cos(o.theta), st = sin(o.theta), cp = cos(o.phi), sp = sin(o.phi);
    const x = cp * t[0] + sp * t[2];
    const y = sp * st * t[0] + ct * t[1] - cp * st * t[2];
    const z = -sp * ct * t[0] + st * t[1] + cp * ct * t[2];
    return [((x * o.scale + 1) / 2) * lado, ((-y * o.scale + 1) / 2) * lado, z];
  }

  function colocar() {
    if (!lado) return;
    for (const m of marcas) {
      const [x, y, z] = enPantalla(m.p, cur);
      const visible = z >= 0.02;
      m.el.style.setProperty('--x', x.toFixed(1) + 'px');
      m.el.style.setProperty('--y', y.toFixed(1) + 'px');
      m.el.style.opacity = visible ? '' : '0';
      m.el.style.pointerEvents = visible && m.clic ? 'auto' : 'none';
    }
  }

  /* Las etiquetas no se pisan: cada una prueba arriba, abajo y a los lados del
     punto, en la vista a la que va a llegar el globo. */
  function cajaDe(m: Marca, pos: string, g: number): number[] {
    const [x, y] = enPantalla(m.p, tgt);
    const w = m.el.offsetWidth, h = m.el.offsetHeight;
    if (pos === 'arriba') return [x - w / 2, y - h - g, w, h];
    if (pos === 'abajo') return [x - w / 2, y + g, w, h];
    if (pos === 'der') return [x + g, y - h / 2, w, h];
    return [x - w - g, y - h / 2, w, h];
  }
  const seTocan = (a: number[], b: number[]) =>
    a[0] < b[0] + b[2] + 3 && b[0] < a[0] + a[2] + 3 && a[1] < b[1] + b[3] + 3 && b[1] < a[1] + a[3] + 3;
  function acomodar() {
    if (!lado) return;
    const ocupado = marcas
      .filter((m) => m.radio)
      .map((m) => {
        const [x, y] = enPantalla(m.p, tgt);
        return { de: m, caja: [x - m.radio, y - m.radio, m.radio * 2, m.radio * 2] };
      });
    const etiquetas = marcas.filter((m) => m.esChip).sort((a, b) => b.prio - a.prio);
    for (const m of etiquetas) {
      const lados = [m.pref, ...LADOS.filter((l) => l !== m.pref)];
      /* primero pegada al punto; si no entra, un poco más lejos */
      const opciones = [m.sep, m.sep + 20].flatMap((g) => lados.map((pos) => [pos, g] as [string, number]));
      const [pos, g] =
        opciones.find(([p, d]) => !ocupado.some((o) => o.de.punto !== m.punto && seTocan(cajaDe(m, p, d), o.caja))) || opciones[0];
      m.el.dataset.pos = pos;
      m.el.style.setProperty('--sep', g + 'px');
      ocupado.push({ de: m, caja: cajaDe(m, pos, g) });
    }
  }

  /* ---------- Qué muestra el globo en cada vista ---------- */
  function armar(vista: Vista) {
    const { tipo, eje, n } = vista;
    const puntos: { location: [number, number]; size: number; color: Color }[] = [];
    const arcos: { from: [number, number]; to: [number, number]; color: Color }[] = [];
    const etiquetas: {
      lat: number; lon: number; clase: string; texto?: string; color?: string;
      n?: number; prio?: number; radio?: number; sep?: number; pref?: string;
    }[] = [];
    const delEje = SEN.filter((s) => s.eje === eje);
    const nombreEje = datos.ejes.find((e) => e.id === eje)?.nombre ?? '';
    const activa = tipo === 'senal' ? SEN.find((x) => x.n === n) : undefined;
    let meta = 'Teatro global';
    let nombre = `${SEN.length} señales`;
    girar = false;

    const punto = (s: SenalGlobo, tam: number, fuerza: number) =>
      puntos.push({ location: [s.lat, s.lon], size: tam, color: apagar(COLOR[s.t], fuerza) });
    const chip = (s: SenalGlobo, clase: string, texto: string, extra = {}) =>
      etiquetas.push({ lat: s.lat, lon: s.lon, clase, texto, color: VAR[s.t], n: s.n, prio: 1, radio: 6, ...extra });

    if (activa) {
      const s = activa;
      SEN.forEach((x) => {
        if (x.n === s.n) punto(x, 0.085, 1);
        else if (x.eje === s.eje) punto(x, 0.04, 0.85);
        else punto(x, 0.025, 0.3);
      });
      SEN.filter((x) => x.eje === s.eje && x.n !== s.n).forEach((x) => chip(x, 'chip', dos(x.n)));
      etiquetas.push({ lat: s.lat, lon: s.lon, clase: 'anillo', color: VAR[s.t] });
      chip(s, 'chip chip--activo', `${dos(s.n)} ${s.corto}`, { prio: 3, radio: 13, sep: 17 });
      if (s.arco) {
        arcos.push({ from: [s.arco.lat, s.arco.lon], to: [s.lat, s.lon], color: COLOR[s.t] });
        puntos.push({ location: [s.arco.lat, s.arco.lon], size: 0.04, color: COLOR[s.t] });
        etiquetas.push({ lat: s.arco.lat, lon: s.arco.lon, clase: 'chip chip--extremo', texto: s.arco.nombre, prio: 2, radio: 6, pref: 'abajo' });
        const [lat, lon] = centro([[s.lat, s.lon, 0.62], [s.arco.lat, s.arco.lon, 0.38]]);
        apuntar(lat, lon, 1.08);
      } else {
        apuntar(s.lat, s.lon, 1.15);
      }
      meta = `Señal ${dos(s.n)}, ${datos.ejes.find((e) => e.id === s.eje)?.nombre ?? ''}`;
      nombre = s.lugar;
    } else if (tipo === 'focos' && FOCOS.length) {
      SEN.forEach((s) => punto(s, 0.025, 0.3));
      FOCOS.forEach((f) => {
        puntos.push({ location: [f.lat, f.lon], size: 0.05, color: COLOR.foco });
        etiquetas.push({ lat: f.lat, lon: f.lon, clase: 'chip chip--foco', texto: f.nombre, prio: 1, radio: 7 });
      });
      const [lat, lon] = centro(FOCOS.map((f) => [f.lat, f.lon]));
      apuntar(lat, lon, 1.15);
      meta = nombreEje;
      nombre = 'Focos en observación';
    } else if ((tipo === 'eje' || tipo === 'radar' || tipo === 'focos') && delEje.length) {
      SEN.forEach((x) => (x.eje === eje ? punto(x, 0.055, 1) : punto(x, 0.025, 0.3)));
      delEje.forEach((x) => chip(x, 'chip', dos(x.n)));
      const [lat, lon] = centro(delEje.map((x) => [x.lat, x.lon]));
      apuntar(lat, lon, 1);
      meta = tipo === 'eje' ? 'Eje' : nombreEje;
      nombre = tipo === 'eje' ? nombreEje : 'También en el radar';
    } else {
      SEN.forEach((s) => punto(s, 0.045, 1));
      girar = true;
      tgt.theta = 0.25;
      tgt.scale = 1;
    }

    if (lugarMeta) lugarMeta.textContent = meta;
    if (lugarNombre) lugarNombre.textContent = nombre;

    capa!.textContent = '';
    marcas = etiquetas.map((e) => {
      const clic = e.n !== undefined && e.clase.includes('chip');
      const el = document.createElement(clic ? 'a' : 'span');
      el.className = e.clase;
      if (e.texto) el.textContent = e.texto;
      if (e.color) el.style.setProperty('--c', e.color);
      if (clic) {
        (el as HTMLAnchorElement).href = `${base}#senal-${e.n}`;
        el.setAttribute('aria-label', `Ir a la señal ${e.n}`);
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
      capa!.append(el);
      const v = v3(e.lat, e.lon);
      const r = RADIO + ELEV;
      return {
        el, clic, p: [v[0] * r, v[1] * r, v[2] * r] as [number, number, number],
        esChip: e.clase.includes('chip'), punto: `${e.lat},${e.lon}`,
        prio: e.prio || 0, radio: e.radio || 0, sep: e.sep || 9, pref: e.pref || 'arriba',
      };
    });

    if (globo) globo.update({ markers: puntos, arcs: arcos });
    pendiente = true;
    if (sinMovimiento) Object.assign(cur, tgt);
    acomodar();
    colocar();
  }

  let vistaActual: Vista = { tipo: 'inicio' };
  function mostrar(vista: Vista) {
    vistaActual = vista;
    casillas.forEach((a) => {
      const es = vista.tipo === 'senal' && Number(a.dataset.n) === vista.n;
      a.classList.toggle('on', es);
      if (es && !enPortada) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    const ejeActivo = vista.tipo === 'senal' ? SEN.find((s) => s.n === vista.n)?.eje : vista.eje;
    grupos.forEach((g) => g.classList.toggle('on', g.dataset.eje === ejeActivo));
    armar(vista);
  }

  /* ---------- Recorrido: el paso que llega a la línea de lectura es el activo ---------- */
  function medirEscena() {
    const fija = !enPortada && esCelular();
    raiz.style.setProperty('--escena-h', (fija ? Math.round(escena!.getBoundingClientRect().height) : 0) + 'px');
  }

  if (enPortada) {
    /* En la portada no hay pasos: pasar por un eje o un número lo muestra en el globo. */
    const volver = () => mostrar({ tipo: 'inicio' });
    const escuchar = (el: HTMLElement, vista: Vista) => {
      el.addEventListener('pointerenter', (e) => { if ((e as PointerEvent).pointerType === 'mouse') mostrar(vista); });
      el.addEventListener('pointerleave', (e) => { if ((e as PointerEvent).pointerType === 'mouse') volver(); });
      el.addEventListener('focus', () => mostrar(vista));
      el.addEventListener('blur', volver);
    };
    casillas.forEach((a) => escuchar(a, { tipo: 'senal', n: Number(a.dataset.n) }));
    raiz.querySelectorAll<HTMLElement>('.eje-pulso[data-eje]').forEach((a) => escuchar(a, { tipo: 'eje', eje: a.dataset.eje }));
    mostrar({ tipo: 'inicio' });
  } else {
    let activo = -1;
    const activar = (i: number) => {
      if (i === activo || !pasos[i]) return;
      activo = i;
      const paso = pasos[i];
      pasos.forEach((p, j) => p.classList.toggle('activo', j === i));
      mostrar({ tipo: (paso.dataset.tipo as Vista['tipo']) || 'inicio', eje: paso.dataset.eje, n: Number(paso.dataset.n) || undefined });
    };
    /* La línea de lectura: a qué altura de la pantalla un paso pasa a ser el activo. */
    const linea = () => {
      const alto = window.innerHeight || 1;
      if (!esCelular()) return 0.4;
      const fijo = escena.getBoundingClientRect().height;
      return min(0.9, (fijo + (alto - fijo) * 0.45) / alto);
    };
    let observador: IntersectionObserver | null = null;
    const observar = () => {
      observador?.disconnect();
      const l = linea();
      observador = new IntersectionObserver(
        (entradas) => entradas.forEach((e) => { if (e.isIntersecting) activar(pasos.indexOf(e.target as HTMLElement)); }),
        { rootMargin: `-${(l * 100).toFixed(1)}% 0px -${((1 - l) * 100 - 0.2).toFixed(1)}% 0px` },
      );
      pasos.forEach((p) => observador!.observe(p));
    };
    medirEscena();
    raiz.classList.add('rec--activo');
    /* Si se llega con un enlace a una señal (#senal-16), en celular el globo fijo
       la taparía: ya medido su alto, se vuelve a ubicar la señal debajo. */
    const destino = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (destino && raiz.contains(destino)) destino.scrollIntoView({ block: 'start', behavior: 'instant' });
    observar();
    if (activo < 0) activar(0);
    let espera = 0;
    window.addEventListener('resize', () => {
      clearTimeout(espera);
      espera = window.setTimeout(() => { medirEscena(); observar(); }, 150);
    });
  }

  /* ---------- El globo ---------- */
  function cuadro() {
    if (!corriendo || !globo) return;
    if (girar && !arrastrando && !sinMovimiento) tgt.phi += 0.0016;
    const falta = abs(tgt.phi - cur.phi) + abs(tgt.theta - cur.theta) + abs(tgt.scale - cur.scale);
    /* Si el globo ya llegó y nadie lo mueve, no se vuelve a dibujar */
    if (falta > 0.0004 || arrastrando || pendiente) {
      const k = sinMovimiento ? 1 : 0.07;
      cur.phi += (tgt.phi - cur.phi) * k;
      cur.theta += (tgt.theta - cur.theta) * k;
      cur.scale += (tgt.scale - cur.scale) * k;
      globo.update({ phi: cur.phi, theta: cur.theta, scale: cur.scale });
      colocar();
      pendiente = false;
    }
    requestAnimationFrame(cuadro);
  }
  function revisarMarcha() {
    const debe = Boolean(globo) && aLaVista && !document.hidden;
    if (debe && !corriendo) { corriendo = true; requestAnimationFrame(cuadro); }
    if (!debe) corriendo = false;
  }
  const sinGlobo = () => { raiz.classList.add('rec--sin-globo'); medirEscena(); };

  if (!hayWebGL()) return sinGlobo();
  lado = caja.clientWidth;
  try {
    globo = createGlobe(canvas, {
      devicePixelRatio: min(window.devicePixelRatio || 1, 2),
      width: lado,
      height: lado,
      phi: cur.phi,
      theta: cur.theta,
      scale: cur.scale,
      dark: 1,
      diffuse: 1.25,
      mapSamples: 20000,
      mapBrightness: 5,
      mapBaseBrightness: 0.04,
      baseColor: [0.36, 0.52, 0.44],
      glowColor: [0.07, 0.24, 0.17],
      markerColor: COLOR.escala,
      arcColor: COLOR.escala,
      arcWidth: 0.55,
      arcHeight: 0.22,
      markerElevation: ELEV,
      markers: [],
      arcs: [],
    });
  } catch {
    globo = null;
  }
  if (!globo) return sinGlobo();

  new ResizeObserver(() => {
    const w = caja.clientWidth;
    if (!w || w === lado) return;
    lado = w;
    globo!.update({ width: w, height: w });
    pendiente = true;
    acomodar();
    colocar();
  }).observe(caja);
  new IntersectionObserver((e) => { aLaVista = e[0].isIntersecting; revisarMarcha(); }).observe(escena);
  document.addEventListener('visibilitychange', revisarMarcha);

  /* Arrastrar para girar. En pantallas táctiles solo de lado, para no trabar el scroll. */
  let previo = [0, 0];
  canvas.addEventListener('pointerdown', (e) => {
    arrastrando = true;
    previo = [e.clientX, e.clientY];
    canvas.classList.add('agarrado');
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const dx = e.clientX - previo[0];
    const dy = e.clientY - previo[1];
    previo = [e.clientX, e.clientY];
    tgt.phi = cur.phi = cur.phi + dx * 0.006;
    if (e.pointerType === 'mouse') tgt.theta = cur.theta = max(-1.1, min(1.1, cur.theta + dy * 0.006));
  });
  const soltar = () => { arrastrando = false; canvas.classList.remove('agarrado'); };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);

  armar(vistaActual);
  medirEscena();
  revisarMarcha();
  /* Cuando terminan de cargar las tipografías cambian los anchos: se reacomodan las etiquetas. */
  document.fonts?.ready.then(() => { acomodar(); colocar(); });
}

document.querySelectorAll<HTMLElement>('[data-rec]').forEach(montar);
