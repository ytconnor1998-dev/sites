#!/usr/bin/env bash
# Build the live site and put it on https://dart-rome.expo.app, then check it really is live.
# EAS sometimes reports success while the live address still serves the old page; this deploys
# again until the live page matches the new build.
set -euo pipefail
cd "$(dirname "$0")"
[ -n "${GOOGLE_MAPS_KEY:-}" ] || echo "Warning: GOOGLE_MAPS_KEY is not set, so the live site will use the drawn map."
python3 -I app-src/build.py
cp dist/live.html mobile/dist/index.html
want=$(sha1sum mobile/dist/index.html | cut -c1-40)
export npm_config_noproxy="localhost,127.0.0.1" npm_config_https_proxy="$HTTPS_PROXY" npm_config_proxy="$HTTPS_PROXY"; unset NO_PROXY no_proxy
for try in 1 2 3; do
  (cd mobile && npx -y eas-cli@26.0.0 deploy --prod --non-interactive --export-dir dist >/dev/null 2>&1) || true
  # The host's servers switch over one by one, so wait until five fetches in a row get the new page.
  streak=0
  for wait in $(seq 1 30); do
    got=$(curl -sS "https://dart-rome.expo.app/?n=$RANDOM" | sha1sum | cut -c1-40)
    if [ "$got" = "$want" ]; then streak=$((streak+1)); else streak=0; fi
    [ "$streak" -ge 5 ] && { echo "Live: https://dart-rome.expo.app"; exit 0; }
    sleep 6
  done
  echo "Not live yet after deploy $try, deploying again."
done
echo "The live site still doesn't match the build. Check the EAS dashboard." >&2; exit 1
