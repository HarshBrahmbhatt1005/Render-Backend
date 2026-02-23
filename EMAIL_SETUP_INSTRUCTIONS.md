# Quick Email Setup Instructions

## 1. Install Dependencies

```bash
cd Render-Backend-main
npm install
```

This will install `nodemailer@^6.9.7` along with other dependencies.

## 2. Configure Environment Variables

### Local Development (.env file)

Update your `.env` file with:

```env
# Email Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
ADMIN1_EMAIL=admin1@example.com
ADMIN2_EMAIL=admin2@example.com
```

### Production (Render)

Add these to Render → Environment → Secrets:

```
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
ADMIN1_EMAIL=admin1@example.com
ADMIN2_EMAIL=admin2@example.com
```

## 3. Get Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
5. Use this as `EMAIL_PASS` (remove spaces: `abcdefghijklmnop`)

**Note:** You must have 2-Factor Authentication enabled on your Google account.

## 4. Test Locally

```bash
npm run dev
```

Create a test builder visit and check console for:
```
✅ Email sent successfully: { messageId: '...', to: '...', subject: '...' }
```

## 5. Deploy to Render

```bash
git add .
git commit -m "Add email notification system"
git push origin main
```

Render will auto-deploy. Check logs for email status.

## Email Triggers

| Event | Recipients | Duplicate Prevention |
|-------|-----------|---------------------|
| Form 1 (Builder Visit) Submission | Admin 1 | ✅ Yes |
| Form 2 (Application) Submission | Admin 1 & 2 | ✅ Yes |
| Level 2 Approval | Admin 1 & 2 | ✅ Yes |

## Troubleshooting

- **"Invalid login"** → Use App Password, not regular password
- **Emails not sending** → Check Render logs and environment variables
- **Emails in spam** → Ask recipients to whitelist sender

For detailed documentation, see `docs/email-notification-setup.md`
