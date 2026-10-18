# Hack Club Workshop Cards

Browserless Open Graph image generation for [Hack Club Workshops](https://workshops.hackclub.com/), rendered with Vercel OG on Vercel.

The service keeps the workshop-card URL contract for text, theme, font size, brand, caption, and image parameters.

## Development

Run `bun install --frozen-lockfile` and `bun run test` to build and exercise image generation under Node, including offline cold starts, Markdown, PNG/JPEG, and concurrent requests.

`@vercel/og` is pinned to 0.8.6 because 1.0.3's bundled HarfBuzz fails during Node ESM initialization (`Dynamic require of "fs"` / missing `hb.wasm`). Verify Node rendering before upgrading it.

The Phantom Sans fonts and Hack Club logo in `api/_assets` are vendored from `https://assets.hackclub.com/fonts/Phantom_Sans_0.8/{Regular,Bold}.woff` and `https://assets.hackclub.com/icon-rounded.svg`. Vercel includes these assets in the function bundle so base cards need no remote asset requests. `vercel.json` also overrides the project's 2-second default with a 15-second rendering budget.

MIT License
