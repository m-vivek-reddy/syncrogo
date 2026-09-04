"""
SyncroGo Password Reset Email Service

Uses Resend HTTPS API.

Required environment variables:

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM=SyncroGo <noreply@yourdomain.com>
"""

import html
import json
import logging
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Ensure environment is loaded if running locally
if not os.getenv("RESEND_API_KEY"):
    for _env_path in [
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path.cwd() / "backend" / ".env",
        Path.cwd() / ".env",
    ]:
        if _env_path.is_file():
            load_dotenv(dotenv_path=_env_path)
            break

RESEND_API_URL = "https://api.resend.com/emails"


def send_password_reset_email(
    user_email: str,
    user_name: str,
    reset_url: str,
) -> bool:
    """
    Send password reset email through Resend.
    """

    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    sender = (os.getenv("EMAIL_FROM") or "").strip()

    if not api_key:
        logger.error(
            "RESEND_API_KEY is not configured."
        )
        return False

    if not sender:
        logger.error(
            "EMAIL_FROM is not configured."
        )
        return False

    safe_name = html.escape(user_name or "there")
    safe_url = html.escape(
        reset_url,
        quote=True,
    )

    subject = "Reset your SyncroGo password"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">
    <title>Reset SyncroGo Password</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
">

    <div style="
        max-width:450px;
        margin:40px auto;
        padding:20px;
    ">

        <div style="
            background:#ffffff;
            border:1px solid #e2e8f0;
            border-radius:16px;
            padding:32px;
            text-align:center;
        ">

            <h1 style="
                margin:0 0 10px;
                color:#1e293b;
                font-size:26px;
            ">
                SyncroGo 🚗
            </h1>

            <p style="
                color:#64748b;
                font-size:15px;
                line-height:1.6;
            ">
                Hi {safe_name},
            </p>

            <p style="
                color:#64748b;
                font-size:14px;
                line-height:1.6;
            ">
                We received a request to reset your
                SyncroGo account password.
            </p>

            <div style="margin:30px 0;">

                <a href="{safe_url}"
                   style="
                       display:inline-block;
                       background:#4f46e5;
                       color:#ffffff;
                       text-decoration:none;
                       padding:14px 24px;
                       border-radius:10px;
                       font-size:14px;
                       font-weight:bold;
                   ">
                    Reset Password
                </a>

            </div>

            <p style="
                color:#64748b;
                font-size:12px;
                line-height:1.6;
            ">
                This password reset link will expire
                according to your SyncroGo reset-token
                configuration.
            </p>

            <p style="
                color:#94a3b8;
                font-size:11px;
                line-height:1.6;
                margin-top:25px;
            ">
                If you didn't request a password reset,
                you can safely ignore this email.
            </p>

        </div>

        <p style="
            text-align:center;
            color:#94a3b8;
            font-size:11px;
            margin-top:20px;
        ">
            © SyncroGo
        </p>

    </div>

</body>
</html>
"""

    payload = {
        "from": sender,
        "to": [user_email],
        "subject": subject,
        "html": html_body,
    }

    request = Request(
        RESEND_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            response_body = response.read().decode("utf-8")

            if 200 <= response.status < 300:
                logger.info(
                    "Password reset email accepted by Resend for %s",
                    user_email,
                )
                return True

            logger.error(
                "Resend returned HTTP %s for password reset to %s: %s",
                response.status,
                user_email,
                response_body,
            )
            return False

    except HTTPError as exc:
        try:
            error_body = exc.read().decode("utf-8")
        except Exception:
            error_body = str(exc)

        logger.error(
            "Resend HTTP error %s for password reset email to %s: %s",
            exc.code,
            user_email,
            error_body,
        )
        return False

    except URLError as exc:
        logger.error(
            "Network error connecting to Resend for password reset: %s",
            exc,
        )
        return False

    except Exception:
        logger.exception(
            "Unexpected error sending password reset email to %s",
            user_email,
        )
        return False
