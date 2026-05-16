# linkedin-proxy-substitutor

A macOS local HTTPS proxy that intercepts LinkedIn traffic and injects a JavaScript word substitutor in real time. Type in LinkedIn's post composer and words are swapped on the fly — the same substitution also runs over already-rendered feed posts on page load.

---

## How it works

```
Browser request
     │
     ▼
mitmproxy (localhost:8080)
     │  addon.py
     │  ├─ filters to linkedin.com HTML responses
     │  ├─ strips Content-Security-Policy header
     │  ├─ extracts per-request CSP nonce from existing <script> tags
     │  └─ injects <script nonce="...">substitutor.js</script> before </body>
     │
     ▼
LinkedIn page (browser)
     │  substitutor.js
     │  ├─ Editor path: listens for `input` events on contenteditable divs
     │  │   └─ uses document.execCommand('insertText') to stay compatible
     │  │      with React's synthetic event system
     │  └─ Feed path: TreeWalker scans all text nodes outside editables
     │      └─ MutationObserver re-runs scan as new feed posts scroll in
```

Two independent layers that never touch each other's code:

| Layer | File | Responsibility |
|---|---|---|
| Proxy | `addon.py` | Intercept, strip CSP, inject script |
| Browser | `substitutor.js` | DOM substitution (editor + feed) |

---

## Setup

> macOS only. Requires [Homebrew](https://brew.sh).

```bash
./setup.sh          # installs mitmproxy, trusts the CA cert in System Keychain
pip3 install -r requirements.txt
npm install
```

Then configure your browser to route through the proxy:

- **Chrome:** `chrome://settings/system` → Open proxy settings → Web Proxy: `localhost 8080`
- **Safari:** System Settings → Network → \[your network\] → Proxies → Web Proxy: `localhost 8080`

---

## Usage

```bash
./start.sh    # starts mitmdump in the background (logs → proxy.log)
./stop.sh     # stops the proxy
```

After starting or restarting the proxy, hard-reload the LinkedIn tab (`Cmd+Shift+R`) so the updated script is injected into the fresh page.

---

## Adding substitutions

Edit the `SUBSTITUTIONS` object at the top of `substitutor.js`:

```js
const SUBSTITUTIONS = {
  hello: 'goodbye',
  linkedin: 'jobbook',
  // add more word pairs here
};
```

Keys must be strings. Matching is case-insensitive and whole-word only (e.g. `hello` won't match `hello!world`).

---

## Technical highlights

- **CSP nonce propagation** — LinkedIn uses `strict-dynamic` CSP. Stripping the header alone isn't enough if a `<meta>` CSP tag is present. `addon.py` extracts the per-request nonce from an existing `<script nonce="...">` tag and carries it into the injected script tag, so the script is trusted either way.

- **React-compatible editor replacement** — Direct `textContent` mutation gets overwritten by React on its next render cycle. The substitutor instead uses `document.execCommand('insertText')`, which fires the DOM input events that React's synthetic event system tracks.

- **MutationObserver-safe feed replacement** — Text nodes are updated via `node.data =` rather than `node.textContent =`. The latter triggers a `childList` mutation that would cause the observer to re-fire and loop.

---

## Tests

```bash
# Python (proxy addon)
python3 -m pytest tests/test_addon.py -v

# JavaScript (substitutor logic)
npx jest
```

---

## Stack

- [mitmproxy](https://mitmproxy.org/) — HTTPS interception and script injection
- Vanilla JavaScript — DOM manipulation, MutationObserver, TreeWalker
- [pytest](https://pytest.org/) — Python addon tests
- [Jest](https://jestjs.io/) — JavaScript substitutor tests
