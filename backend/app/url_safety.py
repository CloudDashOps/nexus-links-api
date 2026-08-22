"""URL safety helpers shared by link creation and redirection."""

from urllib.parse import urlparse

ALLOWED_SCHEMES = {"http", "https"}


def is_safe_redirect_target(url: str) -> bool:
    """Only absolute http(s) URLs may be redirected to.

    Blocks javascript:, data:, vbscript:, file: and other scheme-based
    injection vectors that could be abused through the redirect endpoint.
    """
    try:
        parsed = urlparse(url)
    except ValueError:
        return False

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        return False

    # A redirect target without a hostname is not a usable absolute URL
    if not parsed.netloc:
        return False

    return True
