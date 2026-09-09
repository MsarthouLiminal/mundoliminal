#!/bin/zsh
# ─────────────────────────────────────────────────────────────
#  Publicar mundoliminal.com  ·  doble clic y listo
#
#  Sube los cambios que tengas y le pide a GitHub que publique.
#  Si no hay cambios, igual manda a reconstruir el sitio (util
#  cuando salio un episodio nuevo y querés que aparezca ya).
#
#  NO hace falta tocar nada en Cloudflare.
#
#  Copia maestra: mundoliminal/scripts/publicar.command
#  Para reponer el acceso del Escritorio:
#    cp "$HOME/Desktop/ESCRITORIO LIMINAL/mundoliminal/scripts/publicar.command" \
#       "$HOME/Desktop/Publicar LIMINAL.command"
#    chmod +x "$HOME/Desktop/Publicar LIMINAL.command"
# ─────────────────────────────────────────────────────────────

# Finder no hereda el PATH de la Terminal: lo fijamos a mano.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PROYECTO="$HOME/Desktop/ESCRITORIO LIMINAL/mundoliminal"

linea() { printf '─%.0s' {1..52}; echo; }
fin() { echo; linea; echo "  Apreta Enter para cerrar esta ventana."; read; exit "${1:-0}"; }

clear 2>/dev/null || true
linea
echo "  PUBLICAR MUNDOLIMINAL.COM"
linea
echo

cd "$PROYECTO" 2>/dev/null || {
  echo "  ✗ No encuentro la carpeta del sitio en:"
  echo "    $PROYECTO"
  echo
  echo "  Si la moviste de lugar, avisame y ajusto este archivo."
  fin 1
}

for prog in git gh; do
  command -v "$prog" >/dev/null 2>&1 || {
    echo "  ✗ Falta '$prog', que hace falta para publicar."
    echo "    Instalalo con:  brew install $prog"
    fin 1
  }
done

# Solo archivos que ya forman parte del sitio.
# Nunca suma guiones, PDFs ni documentos sueltos de la carpeta.
git add -u

if git diff --cached --quiet; then
  echo "  No hay cambios nuevos en el sitio."
  echo "  Le pido a GitHub que lo reconstruya igual,"
  echo "  para que aparezcan los ultimos episodios."
  echo
  if gh workflow run "Publicar sitio" --ref main >/dev/null 2>&1; then
    echo "  ✓ Pedido enviado."
  else
    echo "  ✗ No se pudo. Puede que tu sesion de GitHub haya expirado."
    echo "    Corre en la Terminal:  gh auth login"
    fin 1
  fi
else
  echo "  Cambios a publicar:"
  echo
  git diff --cached --name-only | sed 's/^/    · /'
  echo
  git commit -q -m "Actualizacion $(date '+%Y-%m-%d %H:%M')"
  if git push -q origin main 2>/dev/null; then
    echo "  ✓ Cambios subidos."
  else
    echo "  ✗ No se pudieron subir."
    echo "    Puede que tu sesion de GitHub haya expirado."
    echo "    Corre en la Terminal:  gh auth login"
    fin 1
  fi
fi

echo
linea
echo "  El sitio se publica solo en 1 a 3 minutos."
echo "  No toques nada en Cloudflare."
linea
echo
echo -n "  ¿Abro mundoliminal.com para revisar? [Enter = si] "
read respuesta
case "$respuesta" in
  [nN]*) ;;
  *) echo "  Esperando 90 segundos a que termine de publicar..."
     sleep 90
     open "https://mundoliminal.com/?v=$(date +%s)" ;;
esac

fin 0
