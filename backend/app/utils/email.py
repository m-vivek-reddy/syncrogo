import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(user_email: str, user_name: str, otp: str):
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    
    if not sender_email or not sender_password:
        print("⚠️ Email credentials missing in .env file!")
        return

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = user_email
    msg['Subject'] = f"{otp} is your SyncroGo Verification Code"

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
    msg.attach(MIMEText(html_body, 'html'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print(f"✅ OTP email successfully sent to {user_email}")
    except Exception as e:
        print(f"❌ Failed to send OTP email: {e}")