import logging
import os
from html import escape
from pathlib import Path
from dotenv import load_dotenv
import requests

logger = logging.getLogger(__name__)

# Ensure environment is loaded if not already present.
if not os.getenv("BREVO_API_KEY"):
    for _env_path in [
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path.cwd() / "backend" / ".env",
        Path.cwd() / ".env",
    ]:
        if _env_path.is_file():
            load_dotenv(dotenv_path=_env_path)
            break


def _send_mail(to_email: str, subject: str, html_body: str) -> bool:
    """Send transactional email through Brevo's HTTPS API."""
    api_key = (os.getenv("BREVO_API_KEY") or "").strip()
    sender_email = (os.getenv("EMAIL_FROM") or "").strip()
    sender_name = (os.getenv("EMAIL_FROM_NAME") or "SyncroGo").strip()

    if not api_key or not sender_email or not to_email:
        logger.warning(
            "Email not sent to %s: Brevo configuration is incomplete.",
            to_email,
        )
        return False

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json",
            },
            json=payload,
            timeout=20,
        )
        if 200 <= response.status_code < 300:
            logger.info("Email accepted by Brevo for %s", to_email)
            return True

        logger.error(
            "Brevo email request failed for %s: status=%s response=%s",
            to_email,
            response.status_code,
            response.text,
        )
        return False
    except requests.exceptions.RequestException:
        logger.exception("Brevo request failed for %s", to_email)
        return False
    except Exception:
        logger.exception("Unexpected Brevo email failure for %s", to_email)
        return False


def send_otp_email(user_email: str, user_name: str, otp: str):
    logger.info("Sending verification email to %s", user_email)

    subject = f"{otp} is your SyncroGo Verification Code"

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
            <div style="max-width: 450px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
                <h2 style="color: #1e293b; margin-bottom: 10px;">SyncroGo 🚗</h2>
                <p style="color: #64748b; font-size: 14px;">Hi {escape(user_name or "there")}, use the 6-digit code below to verify your email address. It will expire in 10 minutes.</p>

                <div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; margin: 25px 0; letter-spacing: 10px; font-size: 32px; font-weight: bold; color: #4f46e5;">
                    {otp}
                </div>

                <p style="color: #94a3b8; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
        </body>
    </html>
    """
    return _send_mail(user_email, subject, html_body)