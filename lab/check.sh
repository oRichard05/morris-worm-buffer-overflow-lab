#!/bin/sh
set -eu
cd "$(dirname "$0")"
make >/dev/null

normal=$(./vulnerable alice)
printf '%s\n' "$normal" | grep -q 'STATUS: ACCEPTED'
printf '%s\n' "$normal" | grep -q 'CORRUPTED: NO'
printf '%s\n' "$normal" | grep -q '5A 5A 5A 5A 5A 5A 5A 5A'

crafted=$(./vulnerable AAAAAAAAAAAAAAAABBBBBB)
printf '%s\n' "$crafted" | grep -q 'CORRUPTED: YES'
printf '%s\n' "$crafted" | grep -q '42 42 42 42 42 42 00 5A'

patched=$(./patched AAAAAAAAAAAAAAAABBBBBB)
printf '%s\n' "$patched" | grep -q 'STATUS: INPUT REJECTED'
printf '%s\n' "$patched" | grep -q 'CORRUPTED: NO'
printf '%s\n' "$patched" | grep -q '5A 5A 5A 5A 5A 5A 5A 5A'

printf 'All C demonstration checks passed.\n'
