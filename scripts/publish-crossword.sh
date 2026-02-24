#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <source_html> <slug> [sequence]" >&2
  exit 1
fi

source_file="$1"
raw_slug="$2"
sequence_arg="${3:-}"

if [[ ! -f "$source_file" ]]; then
  echo "Source file not found: $source_file" >&2
  exit 1
fi

slug="$(printf '%s' "$raw_slug" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g')"
if [[ -z "$slug" ]]; then
  echo "Slug is empty after normalization. Use letters/numbers/hyphens." >&2
  exit 1
fi

if [[ -n "$sequence_arg" ]]; then
  if [[ ! "$sequence_arg" =~ ^[0-9]+$ ]]; then
    echo "Sequence must be numeric: $sequence_arg" >&2
    exit 1
  fi
  sequence="$sequence_arg"
else
  max_sequence=0
  shopt -s nullglob
  for dir in */; do
    name="${dir%/}"
    if [[ "$name" =~ ^[0-9]+$ ]] && (( name > max_sequence )); then
      max_sequence=$name
    fi
  done
  sequence=$((max_sequence + 1))
fi

mkdir -p crosswords "$sequence" "$slug"

target="crosswords/${sequence}-${slug}.html"
if [[ "$source_file" != "$target" ]]; then
  cp "$source_file" "$target"
fi

write_redirect() {
  local output_file="$1"
  local target_path="$2"

  cat > "$output_file" <<HTML
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirecting...</title>
    <script>
      window.location.replace('${target_path}');
    </script>
    <noscript>
      <meta http-equiv="refresh" content="0; url=${target_path}" />
    </noscript>
  </head>
  <body>Redirecting...</body>
</html>
HTML
}

write_redirect "$sequence/index.html" "../$target"
write_redirect "$slug/index.html" "../$sequence/"
write_redirect "index.html" "./$sequence/"

if [[ "$target" != "crossword-nyt-style.html" ]]; then
  cp "$target" crossword-nyt-style.html
fi

echo "Published crossword #$sequence"
echo "Sequence URL: /$sequence/"
echo "Slug URL: /$slug/"
echo "Puzzle file: /$target"
