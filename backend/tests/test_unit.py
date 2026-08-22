"""Unit tests for pure helpers: URL safety, rate limiter, UA parsing, schemas."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from pydantic import ValidationError

from app.ratelimit import RateLimiter
from app.schemas import LinkCreate, UserCreate
from app.url_safety import is_safe_redirect_target
from app.user_agents import parse_browser, parse_device


class TestUrlSafety:
    @pytest.mark.parametrize("url", [
        "https://example.com/page",
        "http://example.com",
        "https://sub.domain.io/path?q=1#frag",
        "https://example.com:8080/x",
    ])
    def test_accepts_http_https(self, url):
        assert is_safe_redirect_target(url) is True

    @pytest.mark.parametrize("url", [
        "javascript:alert(1)",
        "JAVASCRIPT:alert(1)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "vbscript:msgbox",
        "file:///C:/Windows/system32",
        "ftp://example.com/file",
        "chrome://settings",
        "//example.com/no-scheme",
        "not a url at all",
    ])
    def test_blocks_dangerous_schemes(self, url):
        assert is_safe_redirect_target(url) is False


class TestRateLimiter:
    def test_allows_within_limit(self):
        rl = RateLimiter(max_events=3, window_seconds=60)
        assert rl.allow("ip1") and rl.allow("ip1") and rl.allow("ip1")

    def test_blocks_over_limit(self):
        rl = RateLimiter(max_events=3, window_seconds=60)
        for _ in range(3):
            rl.allow("ip1")
        assert rl.allow("ip1") is False

    def test_keys_are_independent(self):
        rl = RateLimiter(max_events=1, window_seconds=60)
        assert rl.allow("a") is True
        assert rl.allow("b") is True
        assert rl.allow("a") is False

    def test_window_expiry(self):
        rl = RateLimiter(max_events=1, window_seconds=0.2)
        assert rl.allow("ip") is True
        assert rl.allow("ip") is False
        import time
        time.sleep(0.5)
        assert rl.allow("ip") is True

    def test_reset(self):
        rl = RateLimiter(max_events=1, window_seconds=60)
        rl.allow("ip")
        rl.reset()
        assert rl.allow("ip") is True


class TestUserAgentParsing:
    def test_desktop_chrome(self):
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        assert parse_device(ua) == "Desktop"
        assert parse_browser(ua) == "Chrome"

    def test_iphone_safari(self):
        ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (Version/17.0 Mobile/15E148 Safari/604.1)"
        assert parse_device(ua) == "Mobile"
        assert parse_browser(ua) == "Safari"

    def test_ipad_tablet(self):
        ua = "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"
        assert parse_device(ua) == "Tablet"

    def test_edge_not_chrome(self):
        ua = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0"
        assert parse_browser(ua) == "Edge"

    def test_firefox(self):
        ua = "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"
        assert parse_device(ua) == "Desktop"
        assert parse_browser(ua) == "Firefox"

    def test_unknown_and_bots(self):
        assert parse_device(None) == "Unknown"
        assert parse_browser(None) == "Unknown"
        assert parse_device("Googlebot/2.1 (+http://www.google.com/bot.html)") == "Bot"


class TestSchemas:
    def test_valid_registration(self):
        user = UserCreate(username="john", email="j@x.com", password="Passw0rd123")
        assert user.password == "Passw0rd123"

    @pytest.mark.parametrize("password", [
        "short1a",          # too short
        "alllettersonly",   # no digit
        "12345678",         # no letter
        "",                 # empty
    ])
    def test_weak_passwords_rejected(self, password):
        with pytest.raises(ValidationError):
            UserCreate(username="john", email="j@x.com", password=password)

    def test_valid_link(self):
        link = LinkCreate(target_url="https://example.com", custom_slug="my-slug-1")
        assert link.custom_slug == "my-slug-1"

    @pytest.mark.parametrize("slug", [
        "ab",               # too short
        "-starts-with-dash",
        "has spaces",
        "has_underscore",
        "a" * 51,           # too long
    ])
    def test_invalid_custom_slugs_rejected(self, slug):
        with pytest.raises(ValidationError):
            LinkCreate(target_url="https://example.com", custom_slug=slug)

    def test_invalid_target_url_rejected(self):
        with pytest.raises(ValidationError):
            LinkCreate(target_url="not-a-url")
