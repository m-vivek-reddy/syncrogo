import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_password_reset_email(user_email: str, user_name: str, reset_url: str) -> None:
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    if not sender_email or not sender_password:
        print("Password-reset email not sent: SMTP_EMAIL/SMTP_PASSWORD are not configured.")
        return

    msg = MIMEMultipart()
    msg["From"], msg["To"] = sender_email, user_email
    msg["Subject"] = "Reset your SyncroGo password"
    msg.attach(MIMEText(
        f"<h2>Reset your SyncroGo password</h2><p>Hi {user_name or 'there'}, "
        f"reset your password <a href=\"{reset_url}\">here</a>.</p>"
        "<p>This link expires in 30 minutes. If you did not request it, ignore this email.</p>",
        "html",
    ))
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
    except Exception as error:
        print(f"Password-reset email failed: {error}")
