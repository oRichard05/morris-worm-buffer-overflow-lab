#!/bin/sh
set -eu
cd "$(dirname "$0")"
make >/dev/null

normal=$(./vulnerable alice)
printf '%s\n' "$normal" | grep -q 'NEXT: RETURN'
printf '%s\n' "$normal" | grep -q 'FLOW: NORMAL'

crafted=$(./vulnerable AAAAAAAAAAAAAAAADIVERT)
printf '%s\n' "$crafted" | grep -q 'NEXT: DIVERT'
printf '%s\n' "$crafted" | grep -q 'FLOW: DIVERTED'

patched=$(./patched AAAAAAAAAAAAAAAADIVERT)
printf '%s\n' "$patched" | grep -q 'STATUS: INPUT REJECTED'
printf '%s\n' "$patched" | grep -q 'NEXT: RETURN'
printf '%s\n' "$patched" | grep -q 'FLOW: NORMAL'

printf 'All C demonstration checks passed.\n'
