/**
 * Big board de Señales en el navegador.
 *
 * Mueve la cámara, abre la ficha de cada señal, dibuja el acercamiento, hace el
 * recorrido automático y da la hora en seis capitales. Los datos llegan en el
 * <script type="application/json" data-bigboard-datos> que arma BigBoard.astro
 * a partir del JSON de la edición.
 */

type Tendencia = 'escala' | 'estable' | 'afloja';

interface SenalB {
  n: number;
  eje: string;
  ejeNombre: string;
  titulo: string;
  lugar: string;
  fecha: string;
  hecho: string;
  lectura: string;
  fuente: { nombre: string; url: string };
  analisis: { titulo: string; url: string } | null;
  tendencia: Tendencia;
  intensidad: number;
  intensidadNombre: string;
  umHasta: number | null;
  actualizado: string | null;
  tieneAnterior: boolean;
  corto: string;
  dato: string | null;
  objetivo: string;
  lat: string;
  lon: string;
  arco: { nombre: string; rumbo: number; km: number } | null;
  p: { base: [number, number]; tope: [number, number]; dx: number; cam: { tx: number; ty: number } };
}

interface Datos {
  edicion: string;
  zoom: number;
  inicial: number;
  focos: number;
  acercamientos: string;
  senales: SenalB[];
}

interface Acercamiento {
  tierra: string;
  fronteras: string;
  estados: string;
  grilla: string;
}

const VW = 1000;
const VH = 560;
const TEND: Record<Tendencia, string> = { escala: 'Escala', estable: 'Se sostiene', afloja: 'Afloja' };
const SIMB: Record<Tendencia, string> = { escala: '▲', estable: '■', afloja: '▼' };
const EJE_COD: Record<string, string> = { min: 'EJE MIN', cho: 'EJE CHK', ia: 'EJE IA', con: 'EJE CON' };
const MODO_VISTA: Record<string, string> = { min: 'GEO', cho: 'EO', ia: 'IR', con: 'SAR' };
const INTERVALO: Record<string, number> = { pagina: 9000, sala: 8000, portada: 7000 };
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const lento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n: number) => String(n).padStart(2, '0');

/** Reinicia una animación de CSS sacando y volviendo a poner la clase. */
function reanimar(el: Element | null, clase: string) {
  if (!el || lento) return;
  el.classList.remove(clase);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(clase);
}

/** Cartel de letras que giran hasta quedar en el texto. */
function cartel(cont: HTMLElement | null, texto: string, retraso = 0) {
  if (!cont) return;
  const t = (texto + ' '.repeat(16)).slice(0, 16);
  if (!cont.children.length) {
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.className = 'bb-flap';
      cont.appendChild(s);
    }
  }
  const celdas = [...cont.children] as HTMLElement[];
  const fijar = () => celdas.forEach((c, i) => (c.textContent = t[i] === ' ' ? ' ' : t[i]));
  if (lento) return fijar();
  const t0 = performance.now();
  const paso = (ahora: number) => {
    let quedan = false;
    celdas.forEach((c, i) => {
      if (ahora - t0 < 120 + (retraso + i) * 38) {
        quedan = true;
        c.textContent = LETRAS[Math.floor(Math.random() * LETRAS.length)];
      } else {
        c.textContent = t[i] === ' ' ? ' ' : t[i];
      }
    });
    if (quedan) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function iniciar(raiz: HTMLElement) {
  const fuenteDatos = raiz.querySelector('[data-bigboard-datos]');
  if (!fuenteDatos?.textContent) return;
  const datos = JSON.parse(fuenteDatos.textContent) as Datos;
  const modo = raiz.dataset.modo ?? 'pagina';
  const porN = new Map(datos.senales.map((s) => [s.n, s]));
  const q = <T extends Element = HTMLElement>(sel: string) => raiz.querySelector<T>(sel);
  const qa = <T extends Element = HTMLElement>(sel: string) => [...raiz.querySelectorAll<T>(sel)];
  const campo = (k: string) => q(`[data-f="${k}"]`);
  const tele = (k: string) => q(`[data-t-campo="${k}"]`);

  const camara = q<SVGGElement>('[data-camara]');
  const capa = q('[data-capa]');
  const selHaz = q<SVGPathElement>('[data-sel-haz]');
  const anilloSel = q('[data-anillo-sel]');
  const tags = qa('[data-tag]');
  const filas = qa<HTMLButtonElement>('[data-fila]');
  const rotulo = q('[data-rotulo]');
  const btnGlobal = q<HTMLButtonElement>('[data-accion="global"]');
  const btnRecorrido = q<HTMLButtonElement>('[data-accion="recorrido"]');
  const btnPantalla = q<HTMLButtonElement>('[data-accion="pantalla"]');
  const ficha = q('[data-ficha]');
  const reconMapa = q('[data-recon-mapa]');
  const reticula = q('[data-reticula]');
  const reticulaIn = q('[data-reticula-in]');
  const flecha = q('[data-flecha]');
  const relojes = qa('[data-reloj]');
  const hudFecha = q('[data-hud-fecha]');
  const titular = q<HTMLAnchorElement>('[data-titular]');

  let sel = datos.inicial;
  let acercado = false;
  let recorrido = !lento;
  let pausaHasta = 0;
  let visible = true;
  let acercamientos: Record<string, Acercamiento> | null = null;
  let pedido = false;

  function marcarRecorrido() {
    btnRecorrido?.setAttribute('aria-pressed', String(recorrido));
  }

  function mover(s: SenalB, z: boolean) {
    const Z = z ? datos.zoom : 1;
    const tx = z ? s.p.cam.tx : 0;
    const ty = z ? s.p.cam.ty : 0;
    if (camara) camara.style.transform = `translate(${tx}px, ${ty}px) scale(${Z})`;
    if (capa) capa.style.transform = `translate(${((tx / VW) * 100).toFixed(2)}%, ${((ty / VH) * 100).toFixed(2)}%) scale(${Z})`;
    raiz.style.setProperty('--z', String(Z));
    if (rotulo) rotulo.textContent = z ? `Acercamiento: ${s.lugar}` : (rotulo.dataset.base ?? '');
  }

  function pintarAcercamiento(s: SenalB) {
    if (!reconMapa) return;
    const a = acercamientos?.[String(s.n)];
    for (const capaR of ['grilla', 'tierra', 'fronteras', 'estados'] as const) {
      reconMapa.querySelector(`[data-r="${capaR}"]`)?.setAttribute('d', a ? a[capaR] : '');
    }
    reanimar(reconMapa, 'bb-adquiere');
  }

  function pedirAcercamientos() {
    if (pedido || !reconMapa) return;
    pedido = true;
    fetch(datos.acercamientos)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        acercamientos = j;
        const s = porN.get(sel);
        if (s) pintarAcercamiento(s);
      })
      .catch(() => {});
  }

  function pintarFicha(s: SenalB) {
    if (!ficha) return;
    const set = (k: string, v: string) => {
      const el = campo(k);
      if (el) el.textContent = v;
    };
    set('cab', `Señal ${pad(s.n)} / ${s.ejeNombre}`);
    const aviso = campo('aviso');
    if (aviso) {
      const um = s.umHasta !== null && Date.now() < s.umHasta;
      const texto = um ? `Último momento, ${s.actualizado ?? s.fecha}` : s.actualizado ? `Actualizado el ${s.actualizado}` : '';
      aviso.textContent = texto;
      aviso.hidden = !texto;
      aviso.classList.toggle('bb-aviso--um', um);
    }
    set('titulo', s.titulo);
    set('lugar', s.lugar);
    set('fecha', s.fecha);
    const tend = campo('tendencia');
    if (tend) {
      tend.dataset.t = s.tendencia;
      tend.textContent = `${SIMB[s.tendencia]} ${TEND[s.tendencia]} / intensidad ${s.intensidadNombre.toLowerCase()}`;
    }
    set('hecho', s.hecho);
    set('lectura', s.lectura);
    const fuente = campo('fuente') as HTMLAnchorElement | null;
    if (fuente) {
      fuente.href = s.fuente.url;
      fuente.textContent = `${s.fuente.nombre}, ${s.fecha}`;
    }
    const analisis = campo('analisis') as HTMLAnchorElement | null;
    if (analisis) {
      analisis.hidden = !s.analisis;
      if (s.analisis) {
        analisis.href = s.analisis.url;
        set('analisis-t', s.analisis.titulo);
      }
    }
    const mas = campo('mas') as HTMLAnchorElement | null;
    if (mas) {
      mas.href = `${modo === 'sala' ? '/senales/' : ''}#senal-${s.n}`;
      set('mas-t', s.tieneAnterior ? 'Ver la señal en la lista, con la versión del lunes' : 'Ver la señal en la lista');
    }
    reanimar(ficha, 'bb-entra');
  }

  function pintarTelemetria(s: SenalB) {
    const set = (k: string, v: string) => {
      const el = tele(k);
      if (el) el.textContent = v;
    };
    set('coord', `${s.lat}  ${s.lon}`);
    set('objetivo', s.objetivo);
    set('dato', s.dato ?? 'Sin dato clave');
    set('enlace', s.arco ? `${s.arco.nombre} / rumbo ${String(s.arco.rumbo).padStart(3, '0')}° / ${s.arco.km.toLocaleString('es-UY')} km` : 'Sin enlace');
    set('intensidad', s.intensidadNombre);
    const lamparas = tele('lamparas');
    if (lamparas) {
      lamparas.dataset.t = s.tendencia;
      lamparas.dataset.i = String(s.intensidad);
    }
    cartel(q('[data-flaps="1"]'), `${pad(s.n)} ${s.corto}`);
    cartel(q('[data-flaps="2"]'), `${TEND[s.tendencia]} ${s.intensidadNombre}`.toUpperCase(), 16);
    const hudEje = q('[data-hud-eje]');
    if (hudEje) hudEje.textContent = EJE_COD[s.eje] ?? '';
    const hudModo = q('[data-hud-modo]');
    if (hudModo) hudModo.textContent = MODO_VISTA[s.eje] ?? '';
    if (reticula) reticula.dataset.eje = s.eje;
    reanimar(reticulaIn, 'bb-adquiere');
    if (flecha) {
      if (s.arco) {
        const th = (s.arco.rumbo * Math.PI) / 180;
        flecha.hidden = false;
        flecha.style.left = `${(50 + 40 * Math.sin(th)).toFixed(1)}%`;
        flecha.style.top = `${(50 - 40 * Math.cos(th)).toFixed(1)}%`;
        flecha.style.transform = `translate(-50%, -50%) rotate(${s.arco.rumbo}deg)`;
      } else {
        flecha.hidden = true;
      }
    }
  }

  function elegir(n: number, opciones: { acercar?: boolean; manual?: boolean; mostrarFicha?: boolean } = {}) {
    const s = porN.get(n);
    if (!s) return;
    const { acercar = true, manual = false, mostrarFicha = false } = opciones;
    sel = n;
    acercado = acercar;
    if (manual) {
      if (modo === 'sala') pausaHasta = Date.now() + 45000;
      else recorrido = false;
      marcarRecorrido();
    }
    mover(s, acercar);
    if (selHaz) selHaz.setAttribute('d', `M${s.p.base[0]} ${s.p.base[1]}L${s.p.tope[0]} ${s.p.tope[1]}`);
    if (anilloSel) {
      anilloSel.style.left = `${((s.p.base[0] / VW) * 100).toFixed(2)}%`;
      anilloSel.style.top = `${((s.p.base[1] / VH) * 100).toFixed(2)}%`;
    }
    tags.forEach((t) => {
      const m = Number(t.dataset.tag);
      const actual = m === n;
      if (actual) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
      const otra = porN.get(m);
      if (otra) t.textContent = actual ? `${pad(m)} ${otra.corto}` : pad(m);
    });
    filas.forEach((f) => f.setAttribute('aria-pressed', String(Number(f.dataset.fila) === n)));
    if (titular) {
      titular.href = `/senales/#senal-${n}`;
      const num = titular.querySelector('[data-titular-num]');
      const t = titular.querySelector('[data-titular-t]');
      if (num) num.textContent = pad(n);
      if (t) t.textContent = s.titulo;
    }
    pintarFicha(s);
    pintarTelemetria(s);
    pintarAcercamiento(s);
    if (mostrarFicha && ficha && window.matchMedia('(max-width: 759px)').matches) {
      ficha.scrollIntoView({ behavior: lento ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function siguiente(paso = 1) {
    const orden = datos.senales.map((s) => s.n);
    const i = orden.indexOf(sel);
    return orden[(i + paso + orden.length) % orden.length];
  }

  // Controles
  tags.forEach((t) => {
    if (t.tagName === 'A') return;
    t.addEventListener('click', () => elegir(Number(t.dataset.tag), { manual: true, mostrarFicha: true }));
  });
  filas.forEach((f) => f.addEventListener('click', () => elegir(Number(f.dataset.fila), { manual: true, mostrarFicha: true })));
  btnGlobal?.addEventListener('click', () => {
    if (modo !== 'sala') recorrido = false;
    else pausaHasta = Date.now() + 45000;
    marcarRecorrido();
    acercado = false;
    const s = porN.get(sel);
    if (s) mover(s, false);
  });
  btnRecorrido?.addEventListener('click', () => {
    recorrido = !recorrido;
    pausaHasta = 0;
    marcarRecorrido();
  });
  btnPantalla?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });

  // En la sala, el control remoto de presentaciones avanza y retrocede.
  if (modo === 'sala') {
    document.addEventListener('keydown', (ev) => {
      if (['ArrowRight', 'PageDown', ' '].includes(ev.key)) {
        ev.preventDefault();
        elegir(siguiente(1), { manual: true });
      } else if (['ArrowLeft', 'PageUp'].includes(ev.key)) {
        ev.preventDefault();
        elegir(siguiente(-1), { manual: true });
      } else if (ev.key === 'Escape') {
        const s = porN.get(sel);
        if (s) mover(s, false);
      }
    });
  } else if (modo === 'pagina') {
    raiz.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && acercado) {
        acercado = false;
        const s = porN.get(sel);
        if (s) mover(s, false);
      }
    });
  }

  // Desde la lista de abajo (el número de cada tarjeta) o desde un enlace #senal-N.
  if (modo === 'pagina') {
    document.addEventListener('bigboard:elegir', (ev) => {
      const n = Number((ev as CustomEvent<number>).detail);
      if (!porN.has(n)) return;
      elegir(n, { manual: true });
      raiz.scrollIntoView({ behavior: lento ? 'auto' : 'smooth', block: 'start' });
    });
    const desdeHash = () => {
      const m = location.hash.match(/^#senal-(\d+)$/);
      if (m && porN.has(Number(m[1]))) elegir(Number(m[1]), { manual: true });
    };
    desdeHash();
    window.addEventListener('hashchange', desdeHash);
  }

  // Relojes y hora del acercamiento
  const formatos = new Map(
    relojes.map((r) => [r.dataset.reloj!, new Intl.DateTimeFormat('es-UY', { timeZone: r.dataset.reloj, hour: '2-digit', minute: '2-digit', hour12: false })]),
  );
  const fechaHud = new Intl.DateTimeFormat('es-UY', { timeZone: 'America/Montevideo', day: '2-digit', month: 'short', year: '2-digit' });
  const horaHud = new Intl.DateTimeFormat('es-UY', { timeZone: 'America/Montevideo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  function tictac() {
    if (!visible) return;
    const ahora = new Date();
    relojes.forEach((r) => (r.textContent = formatos.get(r.dataset.reloj!)?.format(ahora) ?? '--:--'));
    if (hudFecha) {
      const partes = fechaHud.formatToParts(ahora);
      const g = (k: string) => partes.find((x) => x.type === k)?.value ?? '';
      hudFecha.textContent = `${g('day')}${g('month').replace('.', '')}${g('year')} ${horaHud.format(ahora)}`.toUpperCase();
    }
  }
  tictac();
  setInterval(tictac, 1000);

  // Recorrido automático, solo mientras el tablero está a la vista.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entradas) => {
      visible = entradas.some((e) => e.isIntersecting);
      if (visible) pedirAcercamientos();
    }).observe(raiz);
  } else {
    pedirAcercamientos();
  }
  setInterval(() => {
    if (!recorrido || !visible || document.hidden || Date.now() < pausaHasta) return;
    elegir(siguiente(1), { acercar: true });
  }, INTERVALO[modo] ?? 9000);

  marcarRecorrido();
  const inicial = porN.get(sel);
  if (inicial) {
    cartel(q('[data-flaps="1"]'), `${pad(inicial.n)} ${inicial.corto}`);
    cartel(q('[data-flaps="2"]'), `${TEND[inicial.tendencia]} ${inicial.intensidadNombre}`.toUpperCase(), 16);
  }
}

document.querySelectorAll<HTMLElement>('[data-bigboard]').forEach(iniciar);
