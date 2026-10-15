# Zen Palette

Spotlight-style keyboard palette for Zen Browser (works in any Firefox-based browser).

Press **Alt + K** to search tabs, bookmarks, history and run tab actions.

| Prefix | Shows |
|---|---|
| `>` | Actions |
| `@` | Tabs only |
| `#` | Bookmarks |
| `!` | History |
| `~` | Recently closed |

Typing `/path` jumps to that path on the current site. **Alt + L** edits the current URL with address-bar suggestions. **Tab** cycles the filters.

Row size, environments (for *Switch Environment*) and the learned action order live in the extension's settings page.

## Develop

Load temporarily: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `manifest.json`.

## Release

1. Bump `version` in `manifest.json`.
2. `zip -r ../zen-palette.zip . -x '.*' -x 'README.md'`
3. Upload as a new version at addons.mozilla.org (unlisted / "On your own"), download the signed `.xpi`, install from `about:addons`.
