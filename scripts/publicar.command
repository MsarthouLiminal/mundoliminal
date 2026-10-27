#!/bin/zsh
# ─────────────────────────────────────────────────────────────
#  Publicar mundoliminal.com  ·  doble clic y listo
#
#  Primero trae lo que haya nuevo en GitHub (las sesiones de
#  Claude en la nube suben cambios directo ahí, por ejemplo las
#  ediciones de Señales). Después sube los cambios que tengas y
#  le pide a GitHub que publique. Si no hay cambios, igual manda
#  a reconstruir el sitio (util cuando salio un episodio nuevo y
#  querés que aparezca ya).
#
#  NO hace falta tocar nada en Cloudflare.
#
#  Copia maestra: mundoliminal/scripts/publicar.command
#  Para reponer el acceso del Escritorio:
#    cp "$HOME/Sitios/mundoliminal/scripts/publicar.command" \
#       "$HOME/Desktop/ESCRITORIO LIMINAL/Automatismos/Publicar LIMINAL.command"
#    chmod +x "$HOME/Desktop/ESCRITORIO LIMINAL/Automatismos/Publicar LIMINAL.command"
# ─────────────────────────────────────────────────────────────

# Finder no hereda el PATH de la Terminal: lo fijamos a mano.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PROYECTO="$HOME/Sitios/mundoliminal"

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

# ── 1. Ponerse al día con GitHub ─────────────────────────────
# Si esta Mac quedó atrás, publicar desde acá fallaría. Solo se
# avanza si no hay nada que mezclar; si lo hay, se frena sin
# tocar ningún archivo.

rama=$(git branch --show-current)
if [[ "$rama" != "main" ]]; then
  echo "  ✗ La carpeta del sitio está en la rama '$rama', no en 'main'."
  echo "    No publiqué nada ni toqué tus archivos."
  echo "    Avisale a Claude para volver a 'main'."
  fin 1
fi

echo "  Revisando si hay cambios nuevos en GitHub..."
if ! git fetch -q origin main 2>/dev/null; then
  echo "  ✗ No pude conectarme con GitHub. No publiqué nada."
  echo "    Revisá que tengas internet. Si anda, puede que tu"
  echo "    sesion de GitHub haya vencido. Corre en la Terminal:"
  echo "    gh auth login"
  fin 1
fi

atras=$(git rev-list --count HEAD..origin/main)
adelante=$(git rev-list --count origin/main..HEAD)

if (( atras > 0 )); then
  if (( adelante > 0 )); then
    echo "  ✗ Esta Mac y GitHub tienen cambios distintos que hay"
    echo "    que combinar, y eso no lo hago solo."
    echo "    No publiqué nada ni toqué tus archivos."
    echo "    Avisale a Claude: \"la Mac y GitHub tienen cambios distintos\"."
    fin 1
  fi
  if git merge -q --ff-only origin/main >/dev/null 2>&1; then
    echo "  ✓ Esta Mac estaba atrasada: traje $atras cambio(s) de GitHub."
  else
    echo "  ✗ GitHub tiene cambios nuevos en los mismos archivos que"
    echo "    modificaste en esta Mac, y no los puedo combinar solo."
    echo "    No publiqué nada ni toqué tus archivos."
    echo "    Avisale a Claude para combinarlos."
    fin 1
  fi
else
  echo "  ✓ Esta Mac ya estaba al día con GitHub."
fi
echo

# ── 2. Subir los cambios de esta Mac ─────────────────────────

# Solo archivos que ya forman parte del sitio.
# Nunca suma guiones, PDFs ni documentos sueltos de la carpeta.
git add -u

commit_nuevo=""
if ! git diff --cached --quiet; then
  git commit -q -m "Actualizacion $(date '+%Y-%m-%d %H:%M')"
  commit_nuevo=1
fi

if [[ -z "$(git rev-list origin/main..HEAD)" ]]; then
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
  git diff --name-only origin/main..HEAD | sed 's/^/    · /'
  echo
  if git push -q origin main 2>/dev/null; then
    echo "  ✓ Cambios subidos."
  else
    # Deshace el commit de recien para que la Mac no quede con un
    # cambio que GitHub no tiene. Los archivos quedan como estaban.
    [[ -n "$commit_nuevo" ]] && git reset -q HEAD~1
    if git fetch -q origin main 2>/dev/null && [[ -n "$(git rev-list HEAD..origin/main)" ]]; then
      echo "  ✗ No se subieron: GitHub recibió otros cambios mientras"
      echo "    publicabas. Tus cambios siguen en esta Mac, no se perdió nada."
      echo "    Volvé a hacer doble clic: el script se pone al día solo."
    elif ! gh auth status >/dev/null 2>&1; then
      echo "  ✗ No se subieron: tu sesion de GitHub venció."
      echo "    Tus cambios siguen en esta Mac, no se perdió nada."
      echo "    Corre en la Terminal:  gh auth login"
      echo "    y después volvé a hacer doble clic."
    else
      echo "  ✗ No se subieron y no encuentro la causa (¿se cortó internet?)."
      echo "    Tus cambios siguen en esta Mac, no se perdió nada."
      echo "    Probá de nuevo en un rato. Si se repite, avisale a Claude."
    fi
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
