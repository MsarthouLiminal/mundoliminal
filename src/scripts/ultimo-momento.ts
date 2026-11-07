/**
 * Vencimiento de la etiqueta "Último momento" en el navegador del lector.
 *
 * El sitio se arma en el build (al publicar y cada 6 horas), así que la hora
 * del build no alcanza: la etiqueta podría quedar hasta 6 horas de más.
 * Cada etiqueta lleva en data-um-hasta el instante en que vence (24 horas
 * desde la última actualización). Pasado ese instante se oculta, aparece
 * "Actualizado el" en su lugar y la señal pierde el filete de último momento.
 */
function vencer(um: HTMLElement) {
  um.hidden = true;
  const relevo = um.parentElement?.querySelector<HTMLElement>(':scope > [data-um-relevo]');
  if (relevo) relevo.hidden = false;
  um.closest('.senal')?.classList.remove('senal--um');
}

for (const um of document.querySelectorAll<HTMLElement>('[data-um-hasta]')) {
  const resta = Number(um.dataset.umHasta) - Date.now();
  if (resta <= 0) vencer(um);
  else if (resta < 2 ** 31 - 1) setTimeout(() => vencer(um), resta);
}
