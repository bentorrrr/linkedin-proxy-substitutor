# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

A macOS-only local HTTPS proxy (mitmproxy) that intercepts LinkedIn traffic and injects a JavaScript substitutor. As the user types in LinkedIn's post composer, words are replaced in real time (e.g. "hello" → "goodbye"). The same substitution also runs over already-rendered feed posts when the page loads.

## Commands

### First-time setup (macOS only)
```bash
./setup.sh        # installs mitmproxy via Homebrew, trusts the CA cert in System Keychain
pip3 install -r requirements.txt
npm install
```

After setup, configure your browser to use `localhost:8080` as an HTTP/HTTPS proxy.

### Run the proxy
```bash
./start.sh        # starts mitmdump in the background; logs → proxy.log; PID → .proxy.pid
./stop.sh         # stops the background proxy process
```

After restarting the proxy, do a hard reload in the browser (`Cmd+Shift+R`) so the updated script is injected into the fresh page.

### Tests
```bash
# Python (addon)
python3 -m pytest tests/test_addon.py -v

# Single Python test
python3 -m pytest tests/test_addon.py::test_strips_csp_header -v

# JavaScript (substitutor logic)
npx jest

# Single JS test
npx jest --testNamePattern "replaces hello"
```

## Architecture

There are two independent layers:

**`addon.py` — proxy layer (Python)**
Runs inside `mitmdump`. On every LinkedIn HTML response it:
1. Strips the `Content-Security-Policy` header
2. Extracts the per-request CSP nonce from any existing `<script nonce="...">` tag via `_NONCE_RE`
3. Injects `<script nonce="...">substitutor.js</script>` immediately before `</body>`

The nonce extraction is necessary because LinkedIn uses `'strict-dynamic'` CSP — stripping the header alone is insufficient if a `<meta>` CSP tag is also present; carrying the nonce ensures the injected script is trusted either way.

**`substitutor.js` — browser layer (JavaScript)**
Injected into every LinkedIn HTML page. Has two substitution paths:

- **Editor path**: attaches an `input` event listener to `div[contenteditable="true"]` elements (LinkedIn's post composer). Uses `document.execCommand('insertText')` rather than direct `textContent` mutation — this fires events that React's synthetic event system tracks, preventing React from overwriting the change on the next render cycle.
- **Feed path**: `replaceInFeedNode(root)` walks the DOM with `TreeWalker`, finds all text nodes outside `[contenteditable]` and `<script>`/`<style>` tags, and replaces matching words via `node.data =` (not `node.textContent =`, to avoid triggering `childList` MutationObserver re-entry).

On load: `replaceInFeedNode(document.body)` runs immediately for existing content. The `MutationObserver` (watching `childList: true, subtree: true`) calls `replaceInFeedNode` on each batch of newly added element nodes (e.g. feed posts that scroll in), and also attaches the editor listener to any new `contenteditable` elements.

**Adding substitutions**: edit the `SUBSTITUTIONS` object at the top of `substitutor.js`. Keys must be strings (not numbers).
