import logging
import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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


def send_password_reset_email(user_email: str, user_name: str, reset_url: str) -> None:
    sender_email = (os.getenv("SMTP_EMAIL") or "").strip()
    sender_password = (os.getenv("SMTP_PASSWORD") or "").strip()
    smtp_host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT") or "587")

    if smtp_host.lower() == "smtp.gmail.com":
        sender_password = re.sub(r"\s+", "", sender_password)

    if not sender_email or not sender_password:
        logger.warning(
            "Password-reset email not sent: SMTP_EMAIL/SMTP_PASSWORD are not configured."
        )
        return

    msg = MIMEMultipart()
    msg["From"], msg["To"] = sender_email, user_email
    msg["Subject"] = "Reset your SyncroGo password"
    msg.attach(MIMEText(
        f"<h2>Reset your SyncroGo password</h2><p>Hi {user_name or 'there'}, "
        f"reset your password <a href=\"{reset_url}\">here</a>.</p>"
        "<p>This link expires in 30 minutes. If you did not request it, ignore this email.</p>",
        "html",
        "utf-8",
    ))
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        logger.info("Password-reset email sent to %s", user_email)
    except Exception:
        logger.exception("Password-reset email failed for %s", user_email)
