#!/bin/sh
set -eu
cd "$(dirname "$0")"
make >/dev/null

normal=$(./vulnerable alice)
printf '%s\n' "$normal" | grep -q 'ROLE: GUEST'
printf '%s\n' "$normal" | grep -q 'VAULT: LOCKED'

crafted=$(./vulnerable AAAAAAAAAAAAAAAAADMIN)
printf '%s\n' "$crafted" | grep -q 'ROLE: ADMIN'
printf '%s\n' "$crafted" | grep -q 'VAULT: UNLOCKED'

patched=$(./patched AAAAAAAAAAAAAAAAADMIN)
printf '%s\n' "$patched" | grep -q 'STATUS: INPUT REJECTED'
printf '%s\n' "$patched" | grep -q 'ROLE: GUEST'
printf '%s\n' "$patched" | grep -q 'VAULT: LOCKED'

printf 'All C demonstration checks passed.\n'
