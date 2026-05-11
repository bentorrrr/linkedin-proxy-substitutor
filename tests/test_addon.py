import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class MockHeaders(dict):
    def pop(self, key, default=None):
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
