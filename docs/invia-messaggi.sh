#!/usr/bin/env bash
# Copia negli appunti i messaggi di setup, uno alla volta.
#
#   ./docs/invia-messaggi.sh          tutti, dal primo
#   ./docs/invia-messaggi.sh 7        riparte dal settimo
#
# Per ognuno: il testo finisce negli appunti, tu incolli in Telegram con Cmd+V,
# aspetti l'"ok N/13" di Hermes e premi Invio qui per passare al successivo.

set -euo pipefail
cd "$(dirname "$0")/hermes-messaggi"

da=${1:-1}
file=(*.txt)
totale=${#file[@]}

for f in "${file[@]}"; do
  n=$((10#${f%%-*}))
  (( n < da )) && continue

  car=$(wc -m < "$f" | tr -d ' ')
  pbcopy < "$f"
  printf '\n\033[1m%2d/%d\033[0m  %s  \033[2m(%s caratteri)\033[0m\n' "$n" "$totale" "$f" "$car"
  printf '      negli appunti — incolla in Telegram, poi Invio qui (q per uscire) '

  read -r risposta </dev/tty
  [[ $risposta == q ]] && { echo "Interrotto al messaggio $n."; exit 0; }
done

printf '\n\033[1mFatto.\033[0m Il messaggio 13 chiede a Hermes di verificare e attivare /pulashock.\n'
