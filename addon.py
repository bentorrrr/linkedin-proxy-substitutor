import os
import re
from mitmproxy import http

_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_dir, 'substitutor.js'), 'r') as f:
    _script = f.read()

_NONCE_RE = re.compile(r'<script[^>]+\bnonce=["\']([^"\']+)["\']', re.IGNORECASE)


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

        nonce_match = _NONCE_RE.search(content)
        nonce_attr = f' nonce="{nonce_match.group(1)}"' if nonce_match else ''
        injection = f'<script{nonce_attr}>{_script}</script>'

        flow.response.content = content.replace(
            '</body>', f'{injection}</body>', 1
        ).encode('utf-8')


addons = [LinkedInSubstitutor()]
