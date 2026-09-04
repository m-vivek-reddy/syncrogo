import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Ensure environment is loaded if not already present
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
    """Shared SMTP sender. Returns True on success, False on failure."""
    sender_email = (os.getenv("SMTP_EMAIL") or "").strip()
    sender_password = (os.getenv("SMTP_PASSWORD") or "").strip()

    if not sender_email or not sender_password:
        logger.warning(
            "Email not sent to %s: SMTP_EMAIL/SMTP_PASSWORD are not configured.",
            to_email,
        )
        return False

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        logger.info("Email sent successfully to %s", to_email)
        return True
    except Exception:
        logger.exception("Failed to send email to %s via SMTP", to_email)
        return False


def send_otp_email(user_email: str, user_name: str, otp: str):
    logger.info("🔑 [OTP] Generating & sending verification code for %s: %s", user_email, otp)
    print(f"🔑 [OTP DISPATCH] Verification OTP for {user_email}: {otp}", flush=True)

    subject = f"{otp} is your SyncroGo Verification Code"

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
            <div style="max-width: 450px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
                <h2 style="color: #1e293b; margin-bottom: 10px;">SyncroGo 🚗</h2>
                <p style="color: #64748b; font-size: 14px;">Hi {user_name}, use the 6-digit code below to verify your email address. It will expire in 10 minutes.</p>

                <div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; margin: 25px 0; letter-spacing: 10px; font-size: 32px; font-weight: bold; color: #4f46e5;">
                    {otp}
                </div>

                <p style="color: #94a3b8; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
        </body>
    </html>
    """
    return _send_mail(user_email, subject, html_body)