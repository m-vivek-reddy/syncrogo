import logging
import os
from html import escape
from pathlib import Path
from dotenv import load_dotenv
import resend

logger = logging.getLogger(__name__)

# Ensure environment is loaded if not already present.
if not os.getenv("RESEND_API_KEY"):
    for _env_path in [
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path.cwd() / "backend" / ".env",
        Path.cwd() / ".env",
    ]:
        if _env_path.is_file():
            load_dotenv(dotenv_path=_env_path)
            break


def _send_mail(to_email: str, subject: str, html_body: str) -> bool:
    """Send transactional email through Resend's HTTPS API."""
    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    sender = (os.getenv("EMAIL_FROM") or "").strip()

    if not api_key:
        logger.warning(
            "Email not sent to %s: RESEND_API_KEY is not configured.",
            to_email,
        )
        return False

    if not sender:
        logger.warning(
            "Email not sent to %s: EMAIL_FROM is not configured.",
            to_email,
        )
        return False

    try:
        resend.api_key = api_key
        response = resend.Emails.send({
            "from": sender,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        })
        logger.info("Email accepted for %s via Resend: %s", to_email, response)
        return True
    except Exception:
        logger.exception("Failed to send email to %s via Resend", to_email)
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