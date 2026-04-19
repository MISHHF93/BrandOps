# Restoring `options_page` in the extension manifest

The Chrome MV3 template (`public/manifest.template.json`) intentionally **omits** `"options_page": "options.html"` so the extension does not register a dedicated Options document in the formation (Chrome’s extension management UI still lists the extension; users open **Settings** from in-app navigation where wired).

`options.html` remains in the repository and build output (`dist/options.html`). To restore the classic Chrome **Extension options** entry:

1. Open `public/manifest.template.json`.
2. Inside the top-level object, add after `"background"` (or next to other top-level keys):

```json
  "options_page": "options.html",
```

3. Rebuild (`npm run build`) and reload the unpacked extension.

No other code changes are required; `chrome.runtime.openOptionsPage()` will work again when `options_page` is present.
