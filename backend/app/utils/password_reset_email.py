import logging
from html import escape

from app.utils.email import _send_mail


def send_password_reset_email(user_email: str, user_name: str, reset_url: str) -> bool:
    safe_name = escape(user_name or "there")
    safe_reset_url = escape(reset_url, quote=True)
    html_body = (
        "<h2>Reset your SyncroGo password</h2>"
        f'<p>Hi {safe_name}, reset your password '
        f'<a href="{safe_reset_url}">here</a>.</p>'
        "<p>This link expires in 30 minutes. "
        "If you did not request it, ignore this email.</p>"
    )
    return _send_mail(
        user_email,
        "Reset your SyncroGo password",
        html_body,
    )
