# Email Notification System - Setup Guide

## Overview

This system sends automated email notifications for:
1. **Form 1 (Builder Visit) Submission** → Email to Admin 1
2. **Form 2 (Application) Submission** → Email to Admin 1 & Admin 2
3. **Level 2 Approval** → Email to Admin 1 & Admin 2

## Features

✅ Secure backend-based email sending using Nodemailer
✅ Environment variable configuration
✅ Duplicate email prevention
✅ Error handling and logging
✅ Modular and reusable code
✅ Production-ready implementation

---

## Installation

### 1. Install Nodemailer

```bash
npm install nodemailer
```

### 2. Configure Environment Variables

Add these to your `.env` file and Render Environment Secrets:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
ADMIN1_EMAIL=admin1@example.com
ADMIN2_EMAIL=admin2@example.com
```

---

## Gmail Setup (Recommended)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password
5. Use this as `EMAIL_PASS` in your environment variables

**Important:** Never use your regular Gmail password!

---

## How It Works

### 1. Form 1 (Builder Visit) Submission

**Trigger:** When a new builder visit is created via POST `/api/builder-visits`

**Email Sent To:** Admin 1 only

**Email Content:**
- Project details (name, builder, location)
- Contact information
- Executives list
- Submission timestamp
- Action required notice

**Duplicate Prevention:**
- Tracks `emailSent.submission` flag in database
- Only sends email once per submission
- Editing the form does NOT trigger another email

### 2. Form 2 (Application) Submission

**Trigger:** When a new application is created via POST `/api/applications`

**Email Sent To:** Admin 1 and Admin 2

**Email Content:**
- Applicant details
- Product and amount information
- Bank details
- Status information

### 3. Level 2 Approval

**Trigger:** When Level 2 approval is completed via PATCH `/api/builder-visits/:id/approve`

**Email Sent To:** Admin 1 and Admin 2

**Email Content:**
- Project information
- Level 1 approval details (approver, timestamp)
- Level 2 approval details (approver, timestamp, comment)
- Next steps information

**Duplicate Prevention:**
- Tracks `emailSent.level2Approval` flag in database
- Only sends email once per Level 2 approval
- Page refresh does NOT trigger another email

---

## Email Templates

All email templates are HTML-formatted with:
- Professional styling
- Responsive design
- Clear information hierarchy
- Action-required notices
- Automated footer

---

## Error Handling

### Email Sending Failures

The system handles email failures gracefully:

```javascript
// Email failure does NOT stop the main operation
if (emailResult.success) {
  // Mark as sent
} else {
  // Log error but continue
  console.error('Email failed:', emailResult.error);
}
```

**Benefits:**
- Form submissions always succeed
- Approvals always complete
- Email failures are logged for debugging
- System remains operational

### Common Issues

#### Issue 1: "Invalid login" error
**Solution:** Use App Password, not regular Gmail password

#### Issue 2: Emails not sending
**Check:**
- Environment variables are set correctly
- EMAIL_USER and EMAIL_PASS are configured
- Gmail App Password is valid
- Check Render logs for error messages

#### Issue 3: Emails going to spam
**Solution:**
- Use a verified domain email
- Add SPF and DKIM records
- Ask recipients to whitelist the sender

---

## Testing

### Local Testing

1. Set up `.env` file with valid credentials
2. Start the server: `npm run dev`
3. Create a test builder visit
4. Check console logs for email status
5. Verify email received

### Production Testing

1. Set environment variables in Render
2. Deploy the application
3. Check Render logs for email status
4. Test with a real submission

---

## Monitoring

### Check Email Status in Logs

**Success:**
```
✅ Email sent successfully: {
  messageId: '<...>',
  to: 'admin1@example.com',
  subject: 'New Builder Visit Submitted - ...'
}
```

**Failure:**
```
❌ Email sending failed: {
  error: 'Invalid login',
  to: 'admin1@example.com',
  subject: 'New Builder Visit Submitted - ...'
}
```

---

## Security Best Practices

✅ **Never commit `.env` file** - Add to `.gitignore`
✅ **Use App Passwords** - Never use regular passwords
✅ **Rotate credentials** - Change passwords periodically
✅ **Limit access** - Only authorized admins receive emails
✅ **Monitor logs** - Check for suspicious activity

---

## Customization

### Change Email Templates

Edit `services/emailService.js`:

```javascript
export const sendBuilderVisitSubmissionEmail = async (visitData, adminEmails) => {
  const subject = `Your Custom Subject`;
  const html = `Your custom HTML template`;
  // ...
};
```

### Add More Recipients

Update environment variables:

```env
ADMIN3_EMAIL=admin3@example.com
```

Update code:

```javascript
const adminEmails = [
  process.env.ADMIN1_EMAIL,
  process.env.ADMIN2_EMAIL,
  process.env.ADMIN3_EMAIL
].filter(Boolean);
```

### Change Email Service Provider

Update `createTransporter()` in `services/emailService.js`:

```javascript
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: 'smtp.your-provider.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};
```

---

## Troubleshooting

### Email Not Received

1. **Check spam folder**
2. **Verify email address** in environment variables
3. **Check Render logs** for errors
4. **Test with different email** provider

### Duplicate Emails

1. **Check database** - `emailSent` flags should be `true`
2. **Clear flags** if needed:
   ```javascript
   await BuilderVisitData.updateOne(
     { _id: visitId },
     { $set: { 'emailSent.submission': false } }
   );
   ```

### Performance Issues

- Email sending is **asynchronous** and doesn't block responses
- Failures are logged but don't affect main operations
- Consider using a queue system for high-volume scenarios

---

## API Reference

### Email Service Functions

#### `sendEmail({ to, subject, html, text })`
Core email sending function

**Parameters:**
- `to`: String or Array of email addresses
- `subject`: Email subject line
- `html`: HTML email content
- `text`: Plain text fallback

**Returns:** `{ success: boolean, messageId?: string, error?: string }`

#### `sendBuilderVisitSubmissionEmail(visitData, adminEmails)`
Sends Form 1 submission notification

#### `sendApplicationSubmissionEmail(applicationData, adminEmails)`
Sends Form 2 submission notification

#### `sendLevel2ApprovalEmail(visitData, approvalData, adminEmails)`
Sends Level 2 approval notification

---

## Support

For issues or questions:
1. Check Render logs
2. Review this documentation
3. Test with a different email provider
4. Verify environment variables are set correctly
