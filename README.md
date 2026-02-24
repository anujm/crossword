# crossword

## Routes

- `/1/` -> crossword sequence 1 (original generated puzzle)
- `/2/` -> crossword sequence 2 (Harry Potter theme)
- `/original-generated/` -> alias for `/1/`
- `/harry-potter/` -> alias for `/2/`
- `/` -> redirects to latest sequence

## Publishing Pattern

Use the helper script to publish a new puzzle with both sequence and slug URLs:

```bash
./scripts/publish-crossword.sh <source_html> <slug> [sequence]
```

Examples:

```bash
./scripts/publish-crossword.sh crosswords/2-harry-potter.html chamber-of-secrets
./scripts/publish-crossword.sh my-new-puzzle.html goblet-of-fire 3
```

The script will:

- copy the source to `crosswords/<sequence>-<slug>.html`
- create `/sequence/` and `/slug/` routes
- point `/` to the new sequence
- copy the latest to `crossword-nyt-style.html`
