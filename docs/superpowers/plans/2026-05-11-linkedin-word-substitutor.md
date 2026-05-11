# LinkedIn Word Substitutor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intercept LinkedIn's HTTPS traffic via a local mitmproxy server to inject a JavaScript word substitutor that replaces `"hello"` with `"goodbye"` in real-time inside the LinkedIn post editor.

**Architecture:** mitmproxy runs locally on port 8080, intercepts HTML responses from `linkedin.com`, strips the `Content-Security-Policy` header, and inlines a JavaScript substitutor before `</body>`. The injected script uses a `MutationObserver` to detect the LinkedIn post editor (which loads dynamically as a React SPA) and replaces matched words on every `input` event using word-boundary regex.

**Tech Stack:** Python 3 + mitmproxy, JavaScript (vanilla), Jest (JS unit tests), pytest (Python unit tests), Bash (shell scripts), Homebrew (macOS package manager)

---

## File Map

| File | Responsibility |
|------|---------------|
| `substitutor.js` | Pure word-substitution logic + DOM integration (MutationObserver, input listener, cursor restoration) |
| `addon.py` | mitmproxy addon — filters LinkedIn responses, strips CSP, inlines substitutor.js |
| `setup.sh` | One-time setup: installs mitmproxy, generates + trusts CA certificate |
| `start.sh` | Starts mitmdump in background, writes PID file |
| `stop.sh` | Kills mitmdump by PID file |
| `requirements.txt` | Python dependencies |
| `package.json` | Jest test runner config |
| `tests/test_addon.py` | pytest unit tests for addon.py |
| `tests/substitutor.test.js` | Jest unit tests for substitutor.js pure functions |

---

## Task 1: Project Scaffold

**Files:**
- Create: `requirements.txt`
- Create: `package.json`

- [ ] **Step 1: Create `requirements.txt`**

```
mitmproxy>=10.0.0
pytest>=7.0.0
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "linkedin-word-substitutor",
  "version": "1.0.0",
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
pip install -r requirements.txt
npm install
```

Expected output: mitmproxy and jest installed without errors.

- [ ] **Step 4: Commit**

```bash
git add requirements.txt package.json package-lock.json
git commit -m "chore: add project scaffold and dependencies"
```

---

## Task 2: substitutor.js — Pure Substitution Logic (TDD)

**Files:**
- Create: `substitutor.js`
- Create: `tests/substitutor.test.js`

- [ ] **Step 1: Write failing Jest tests**

Create `tests/substitutor.test.js`:

```javascript
const { substituteText, buildRegex, SUBSTITUTIONS } = require('../substitutor');

describe('SUBSTITUTIONS', () => {
  test('contains hello → goodbye mapping', () => {
    expect(SUBSTITUTIONS['hello']).toBe('goodbye');
  });
});

describe('buildRegex', () => {
  test('matches whole word only', () => {
    const re = buildRegex('hello');
    expect('hello world').toMatch(re);
    expect('helloworld').not.toMatch(re);
    expect('sayhello').not.toMatch(re);
  });

  test('is case-insensitive', () => {
    const re = buildRegex('hello');
    expect('Hello world').toMatch(re);
    expect('HELLO world').toMatch(re);
  });
});

describe('substituteText', () => {
  test('replaces hello with goodbye', () => {
    expect(substituteText('hello world')).toBe('goodbye world');
  });

  test('does not replace partial match helloworld', () => {
    expect(substituteText('helloworld')).toBe('helloworld');
  });

  test('does not replace sayhello', () => {
    expect(substituteText('sayhello')).toBe('sayhello');
  });

  test('replaces Hello case-insensitively', () => {
    expect(substituteText('Hello world')).toBe('goodbye world');
  });

  test('replaces multiple occurrences', () => {
    expect(substituteText('hello and hello again')).toBe('goodbye and goodbye again');
  });

  test('leaves unrelated text unchanged', () => {
    expect(substituteText('good morning')).toBe('good morning');
  });

  test('replaces hello at start of string', () => {
    expect(substituteText('hello')).toBe('goodbye');
  });

  test('replaces hello followed by punctuation', () => {
    expect(substituteText('hello, world')).toBe('goodbye, world');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest tests/substitutor.test.js
```

Expected: FAIL — `Cannot find module '../substitutor'`

- [ ] **Step 3: Implement `substitutor.js` pure functions**

Create `substitutor.js`:

```javascript
const SUBSTITUTIONS = { hello: 'goodbye' };

function buildRegex(word) {
  return new RegExp(`\\b${word}\\b`, 'gi');
}

function substituteText(text) {
  let result = text;
  for (const [word, replacement] of Object.entries(SUBSTITUTIONS)) {
    result = result.replace(buildRegex(word), replacement);
  }
  return result;
}

if (typeof document !== 'undefined') {
  function replaceInEditor(editor) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const original = node.textContent;
    const replaced = substituteText(original);
    if (replaced === original) return;

    const cursorOffset = Math.max(
      0,
      Math.min(
        range.startOffset + (replaced.length - original.length),
        replaced.length
      )
    );

    node.textContent = replaced;

    const newRange = document.createRange();
    newRange.setStart(node, cursorOffset);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  function attachToEditor(editor) {
    if (editor.dataset.subAttached) return;
    editor.dataset.subAttached = '1';
    editor.addEventListener('input', () => replaceInEditor(editor));
  }

  const observer = new MutationObserver(() => {
    document
      .querySelectorAll('div[contenteditable="true"]')
      .forEach(attachToEditor);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  document
    .querySelectorAll('div[contenteditable="true"]')
    .forEach(attachToEditor);
}

if (typeof module !== 'undefined') {
  module.exports = { SUBSTITUTIONS, buildRegex, substituteText };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest tests/substitutor.test.js
```

Expected: PASS — all 11 tests green.

- [ ] **Step 5: Commit**

```bash
git add substitutor.js tests/substitutor.test.js
git commit -m "feat: add word substitutor with DOM integration"
```

---

## Task 3: addon.py — mitmproxy Addon (TDD)

**Files:**
- Create: `addon.py`
- Create: `tests/test_addon.py`

- [ ] **Step 1: Write failing pytest tests**

Create `tests/test_addon.py`:

```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class MockHeaders(dict):
    def pop(self, key, default=None):
        # Case-insensitive pop
        for k in list(self.keys()):
            if k.lower() == key.lower():
                return super().pop(k, default)
        return default

    def __contains__(self, key):
        return any(k.lower() == key.lower() for k in self.keys())


class MockResponse:
    def __init__(self, content_type, body, extra_headers=None):
        self.headers = MockHeaders({'content-type': content_type})
        if extra_headers:
            self.headers.update(extra_headers)
        self.content = body


class MockRequest:
    def __init__(self, host):
        self.pretty_host = host


class MockFlow:
    def __init__(self, host, content_type, body, extra_headers=None):
        self.request = MockRequest(host)
        self.response = MockResponse(content_type, body, extra_headers)


def test_skips_non_linkedin_host():
    from addon import LinkedInSubstitutor
    s = LinkedInSubstitutor()
    flow = MockFlow('google.com', 'text/html', b'<html><body></body></html>')
    s.response(flow)
    assert flow.response.content == b'<html><body></body></html>'


def test_skips_non_html_content_type():
    from addon import LinkedInSubstitutor
    s = LinkedInSubstitutor()
    flow = MockFlow('www.linkedin.com', 'application/json', b'{"key": "value"}')
    s.response(flow)
    assert flow.response.content == b'{"key": "value"}'


def test_strips_csp_header():
    from addon import LinkedInSubstitutor
    s = LinkedInSubstitutor()
    flow = MockFlow(
        'www.linkedin.com', 'text/html',
        b'<html><body></body></html>',
        extra_headers={'content-security-policy': "default-src 'self'"}
    )
    s.response(flow)
    assert 'content-security-policy' not in flow.response.headers


def test_injects_script_before_body_close():
    from addon import LinkedInSubstitutor
    s = LinkedInSubstitutor()
    flow = MockFlow(
        'www.linkedin.com', 'text/html',
        b'<html><body><p>hi</p></body></html>'
    )
    s.response(flow)
    content = flow.response.content
    assert b'<script>' in content
    assert content.index(b'<script>') < content.index(b'</body>')


def test_does_not_inject_if_no_body_tag():
    from addon import LinkedInSubstitutor
    s = LinkedInSubstitutor()
    flow = MockFlow('www.linkedin.com', 'text/html', b'<html>no body tag</html>')
    original = flow.response.content
    s.response(flow)
    assert flow.response.content == original


def test_injects_substitutor_js_content():
    from addon import LinkedInSubstitutor
    s = LinkedInSubstitutor()
    flow = MockFlow(
        'www.linkedin.com', 'text/html',
        b'<html><body></body></html>'
    )
    s.response(flow)
    content = flow.response.content.decode('utf-8')
    assert 'SUBSTITUTIONS' in content
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pytest tests/test_addon.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'addon'`

- [ ] **Step 3: Implement `addon.py`**

Create `addon.py`:

```python
import os
from mitmproxy import http

_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_dir, 'substitutor.js'), 'r') as f:
    _script = f.read()

_INJECTION = f'<script>{_script}</script>'


class LinkedInSubstitutor:
    def response(self, flow: http.HTTPFlow) -> None:
        if 'linkedin.com' not in flow.request.pretty_host:
            return

        content_type = flow.response.headers.get('content-type', '')
        if 'text/html' not in content_type:
            return

        flow.response.headers.pop('content-security-policy', None)

        try:
            content = flow.response.content.decode('utf-8')
        except UnicodeDecodeError:
            return

        if '</body>' not in content:
            return

        flow.response.content = content.replace(
            '</body>', f'{_INJECTION}</body>', 1
        ).encode('utf-8')


addons = [LinkedInSubstitutor()]
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pytest tests/test_addon.py -v
```

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add addon.py tests/test_addon.py
git commit -m "feat: add mitmproxy addon with CSP stripping and script injection"
```

---

## Task 4: Shell Scripts

**Files:**
- Create: `setup.sh`
- Create: `start.sh`
- Create: `stop.sh`

- [ ] **Step 1: Create `setup.sh`**

```bash
#!/bin/bash
set -e

if ! command -v brew &>/dev/null; then
  echo "Error: Homebrew is required. Install from https://brew.sh"
  exit 1
fi

if ! command -v mitmdump &>/dev/null; then
  echo "Installing mitmproxy..."
  brew install mitmproxy
fi

CERT="$HOME/.mitmproxy/mitmproxy-ca-cert.pem"

if [ ! -f "$CERT" ]; then
  echo "Generating mitmproxy CA certificate..."
  timeout 3 mitmdump --quiet 2>/dev/null || true
fi

if [ ! -f "$CERT" ]; then
  echo "Error: CA certificate not found at $CERT"
  exit 1
fi

echo "Trusting mitmproxy CA certificate (sudo required)..."
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain "$CERT"

echo ""
echo "Setup complete."
echo ""
echo "Configure your browser to use proxy: localhost:8080"
echo "  Chrome: chrome://settings/system → Open your computer proxy settings → Web Proxy: localhost 8080"
echo "  Safari: System Settings → Network → [your network] → Proxies → Web Proxy: localhost 8080"
```

- [ ] **Step 2: Create `start.sh`**

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.proxy.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Proxy already running (PID $(cat "$PID_FILE"))"
  exit 0
fi

mitmdump -s "$SCRIPT_DIR/addon.py" --listen-port 8080 --quiet \
  > "$SCRIPT_DIR/proxy.log" 2>&1 &

echo $! > "$PID_FILE"
echo "Proxy started (PID $!)"
echo "Logs: $SCRIPT_DIR/proxy.log"
```

- [ ] **Step 3: Create `stop.sh`**

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.proxy.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "Proxy is not running"
  exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  rm "$PID_FILE"
  echo "Proxy stopped"
else
  rm "$PID_FILE"
  echo "Proxy was not running (stale PID file removed)"
fi
```

- [ ] **Step 4: Make scripts executable**

```bash
chmod +x setup.sh start.sh stop.sh
```

- [ ] **Step 5: Commit**

```bash
git add setup.sh start.sh stop.sh
git commit -m "feat: add setup, start, and stop shell scripts"
```

---

## Task 5: Full Test Run + Manual Verification

- [ ] **Step 1: Run all tests**

```bash
pytest tests/test_addon.py -v && npx jest tests/substitutor.test.js
```

Expected: All tests pass.

- [ ] **Step 2: Run setup (first time only)**

```bash
./setup.sh
```

Expected: mitmproxy installed, CA cert trusted in macOS Keychain, setup complete message printed.

- [ ] **Step 3: Start the proxy**

```bash
./start.sh
```

Expected: `Proxy started (PID <number>)`

- [ ] **Step 4: Configure browser proxy**

In Chrome: go to `chrome://settings/system` → Open your computer's proxy settings → Enable **Web Proxy (HTTP)** and **Secure Web Proxy (HTTPS)** → set both to `localhost` port `8080` → OK.

- [ ] **Step 5: Verify injection on LinkedIn**

1. Open Chrome and navigate to `https://www.linkedin.com`
2. Open browser DevTools console (F12)
3. Run: `document.querySelectorAll('div[contenteditable="true"]').length`
4. Click "Start a post" on LinkedIn
5. Run the query again — count should increase by 1
6. Type `hello` followed by a space in the post editor
7. Expected: text changes to `goodbye` in real-time

- [ ] **Step 6: Stop the proxy**

```bash
./stop.sh
```

Expected: `Proxy stopped`

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: verify full integration, all tests passing"
```
