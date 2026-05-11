# LinkedIn Word Substitutor — Design Spec

**Date:** 2026-05-11
**Status:** Approved

---

## Overview

A macOS-only tool that intercepts LinkedIn's web traffic via a local HTTPS proxy and injects a JavaScript word substitutor into LinkedIn's post editor. When a user types a defined word (e.g., `"hello"`), it is automatically replaced with its configured substitute (e.g., `"goodbye"`) in real-time — without a browser extension, LinkedIn API, or keyboard hooks.

---

## Architecture

```
Browser (Chrome/Safari)
    ↓ routes all traffic through
[mitmproxy @ localhost:8080]
    ↓ intercepts HTML responses from linkedin.com
    ↓ injects <script src="substitutor.js"> into page
    ↓ forwards to browser
LinkedIn Post Editor (in browser tab)
    ↓ substitutor.js runs, watches editor with MutationObserver
    ↓ replaces "hello" → "goodbye" in real-time
```

---

## Components

### 1. `addon.py` — mitmproxy Addon
- Listens for HTTP responses from `*.linkedin.com`
- Filters for `Content-Type: text/html` responses
- Strips the `Content-Security-Policy` response header (otherwise the browser blocks injected scripts)
- Inlines `substitutor.js` content as a `<script>` tag before `</body>`

### 2. `substitutor.js` — Injected Script
- Runs inside the LinkedIn page context
- Uses a `MutationObserver` on `document.body` to detect when the post editor appears in the DOM (LinkedIn is a SPA — the editor does not exist at page load)
- Once the editor (`div[contenteditable="true"]`) is found, attaches an `input` event listener
- On each input event, scans editor text for complete word matches using a word-boundary regex (`/\bhello\b/g`)
- Replaces matched words with `"goodbye"` only when followed by a space, newline, or punctuation (prevents partial-word replacements like `"helloworld"`)
- Substitutions are hardcoded for this version

### 3. `setup.sh` — One-time Setup Script
- Installs `mitmproxy` via Homebrew if not present
- Launches `mitmproxy` briefly to generate the local CA certificate (`~/.mitmproxy/mitmproxy-ca-cert.pem`)
- Trusts the certificate in macOS Keychain (`security add-trusted-cert`)
- No system proxy settings are modified (user configures browser proxy manually or via script)

### 4. `start.sh` — Start Script
- Starts `mitmdump` (headless mitmproxy) with `addon.py` on port `8080`
- Runs in the background, logs to `proxy.log`

### 5. `stop.sh` — Stop Script
- Kills the `mitmdump` process
- Optionally resets any proxy configuration

---

## Data Flow

1. User runs `./start.sh`
2. User configures browser proxy to `localhost:8080` (one-time, or handled by `setup.sh`)
3. Browser routes all traffic through mitmproxy
4. User navigates to `linkedin.com`
5. mitmproxy receives LinkedIn's HTML response
6. `addon.py` detects the response is from `linkedin.com` with `text/html` content type
7. Addon injects `<script>` tag containing `substitutor.js` logic into the HTML
8. Browser renders LinkedIn with the injected script active
9. User opens the post editor and types `"hello"`
10. `substitutor.js` detects the input event, finds `"hello"` in the editor, replaces with `"goodbye"`

---

## Word Substitution Rules (Hardcoded v1)

| Input  | Output    |
|--------|-----------|
| hello  | goodbye   |

---

## SSL / Certificate Setup

- mitmproxy generates a local CA cert at `~/.mitmproxy/mitmproxy-ca-cert.pem` on first run
- `setup.sh` adds this cert to macOS System Keychain as trusted
- This allows mitmproxy to decrypt and re-encrypt HTTPS traffic transparently
- The browser sees a valid certificate signed by the local CA

---

## Error Handling

- If mitmproxy is not running, the browser simply connects to LinkedIn directly with no substitution — no crash, no broken LinkedIn
- If the LinkedIn editor DOM structure changes, `substitutor.js` degrades silently (no replacement occurs, no error thrown)
- If the CA cert is not trusted, the browser shows an SSL warning — user must re-run `setup.sh`

---

## Constraints & Limitations

- macOS only
- Requires one-time CA certificate trust via `setup.sh`
- User must configure browser to use `localhost:8080` as proxy (or script handles it)
- Substitutions are hardcoded — no UI for managing rules in v1
- Works in Chrome and Safari; other browsers untested

---

## Out of Scope (v1)

- User-configurable word substitution rules
- Menu bar UI
- Auto-start on login
- Support for Windows or Linux
