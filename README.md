# The Blue Line website

Static launch site and committed browser build for [bluelinegame.com](https://bluelinegame.com/).

## Verify

```sh
node scripts/verify-site.mjs
python3 -m http.server 4173
```

The verifier checks internal asset references, duplicate HTML IDs, manifest icons,
game bundle integrity hashes, the WASM size ceiling, the hero demo dimensions,
and common credential or local-path leaks.

## Deploy

Render publishes the repository root as a static site after checks pass on
`main`. `render.yaml` is the source of truth for the custom domain, response
headers, and immutable caching of hashed game assets.

The Rust source and reproducible WASM build live in the Blue Line game
repository. Do not edit the generated game bundle by hand.
