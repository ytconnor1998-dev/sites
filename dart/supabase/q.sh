#!/bin/sh
# Run SQL on the DART Supabase project: ./q.sh "select 1"  or  ./q.sh -f file.sql
REF=$(echo "$SUPABASE_URL" | sed -E 's#https://([a-z0-9]+)\.supabase\.co.*#\1#')
if [ "$1" = "-f" ]; then SQL=$(cat "$2"); else SQL="$1"; fi
python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' "$SQL" | curl -sS -m 55 -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "content-type: application/json" --data @-
echo
