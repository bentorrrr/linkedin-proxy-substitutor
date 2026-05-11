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
echo "  Chrome: chrome://settings/system → Open proxy settings → Web Proxy: localhost 8080"
echo "  Safari: System Settings → Network → [your network] → Proxies → Web Proxy: localhost 8080"
