import logging
import os
import re
import smtplib
from html import escape
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Ensure environment is loaded if not already present.
if not os.getenv("SMTP_EMAIL") or not os.getenv("SMTP_PASSWORD"):
    for _env_path in [
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path.cwd() / "backend" / ".env",
        Path.cwd() / ".env",
    ]:
        if _env_path.is_file():
            load_dotenv(dotenv_path=_env_path)
            break


def _send_mail(to_email: str, subject: str, html_body: str) -> bool:
    """Send transactional email through Gmail SMTP."""
    sender_email = (os.getenv("SMTP_EMAIL") or "").strip()
    sender_password = (os.getenv("SMTP_PASSWORD") or "").strip()
    smtp_host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()

    try:
        smtp_port = int(os.getenv("SMTP_PORT") or "587")
    except ValueError:
        logger.warning(
            "Email not sent to %s: SMTP_PORT must be a number.",
            to_email,
        )
        return False

    if not sender_email or not sender_password:
        logger.warning(
            "Email not sent to %s: SMTP_EMAIL/SMTP_PASSWORD are not configured.",
            to_email,
        )
        return False

    # Gmail displays app passwords in groups, but SMTP expects the value
    # without formatting spaces.
    if smtp_host.lower() == "smtp.gmail.com":
        sender_password = re.sub(r"\s+", "", sender_password)

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(message)
        logger.info("Email sent successfully to %s via SMTP", to_email)
        return True
    except Exception:
        logger.exception("Failed to send email to %s via SMTP", to_email)
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