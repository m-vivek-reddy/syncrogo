"""
SyncroGo Email Service

Uses Resend HTTPS API instead of SMTP.
This works on Render because it uses HTTPS (443),
not SMTP ports such as 587.

Required environment variables on Render:

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM=SyncroGo <noreply@yourdomain.com>

For testing, Resend may allow:
EMAIL_FROM=SyncroGo <onboarding@resend.dev>

IMPORTANT:
For production, verify your own domain in Resend
and use an address from that verified domain.
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


def _get_config() -> tuple[str, str]:
    """
    Read email configuration from environment variables.
    """

    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    sender = (os.getenv("EMAIL_FROM") or "").strip()

    if not api_key:
        logger.error(
            "RESEND_API_KEY is not configured."
        )

    if not sender:
        logger.error(
            "EMAIL_FROM is not configured."
        )

    return api_key, sender


def _send_mail(
    to_email: str,
    subject: str,
    html_body: str,
) -> bool:
    """
    Send an email through Resend HTTPS API.

    Returns:
        True  -> email accepted by Resend
        False -> email failed
    """

    api_key, sender = _get_config()

    if not api_key or not sender:
        logger.error(
            "Email not sent to %s because email configuration is missing.",
            to_email,
        )
        return False

    payload = {
        "from": sender,
        "to": [to_email],
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
                    "Email accepted by Resend for %s",
                    to_email,
                )
                return True

            logger.error(
                "Resend returned HTTP %s for %s: %s",
                response.status,
                to_email,
                response_body,
            )
            return False

    except HTTPError as exc:
        try:
            error_body = exc.read().decode("utf-8")
        except Exception:
            error_body = str(exc)

        logger.error(
            "Resend HTTP error %s while sending email to %s: %s",
            exc.code,
            to_email,
            error_body,
        )
        return False

    except URLError as exc:
        logger.error(
            "Network error while connecting to Resend for %s: %s",
            to_email,
            exc,
        )
        return False

    except Exception:
        logger.exception(
            "Unexpected error while sending email to %s",
            to_email,
        )
        return False


def send_otp_email(
    user_email: str,
    user_name: str,
    otp: str,
) -> bool:
    """
    Send SyncroGo verification OTP email.
    """

    safe_name = html.escape(user_name or "there")
    safe_otp = html.escape(otp)

    subject = f"{otp} is your SyncroGo Verification Code"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">
    <title>SyncroGo Verification Code</title>
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
                Use the verification code below to verify
                your SyncroGo email address.
            </p>

            <div style="
                margin:28px 0;
                padding:20px;
                background:#f1f5f9;
                border-radius:12px;
            ">

                <div style="
                    font-size:32px;
                    font-weight:bold;
                    letter-spacing:8px;
                    color:#4f46e5;
                ">
                    {safe_otp}
                </div>

            </div>

            <p style="
                color:#64748b;
                font-size:13px;
            ">
                This code expires in 10 minutes.
            </p>

            <p style="
                color:#94a3b8;
                font-size:12px;
                margin-top:25px;
            ">
                If you didn't request this code,
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

    return _send_mail(
        user_email,
        subject,
        html_body,
    )