# SOS Email Notifications - Setup Guide

This guide explains how to set up the SOS email notification system for the ShareRickshaw application.

## Overview

The SOS system now sends automatic email alerts to emergency contacts when the SOS button is triggered. Each email contains:
- User's current GPS location
- Google Maps link for navigation
- Emergency message with timestamp
- Contact information

## Prerequisites

1. Gmail account for sending emails
2. Gmail App Password (not regular password)
3. Node.js dependencies installed
4. Database with emergency contacts that have email addresses

## Setup Instructions

### 1. Install New Dependencies

```bash
cd ShareRickshaw/backend
npm install nodemailer
```

### 2. Configure Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate new app password for "Mail"
   - Copy the 16-character password

### 3. Set Environment Variables

Create `.env` file in the `ShareRickshaw/backend` directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your Gmail credentials:

```env
# Email Service Configuration (Gmail SMTP)
GMAIL_EMAIL=your-gmail-account@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# Other existing variables...
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mumbai_share_auto
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Run Database Migration

Execute the migration script to add email field to emergency contacts:

```sql
-- Run this in your MySQL database
source backend/database/migrations/add_email_to_contacts.sql;
```

Or execute manually:

```sql
ALTER TABLE emergency_contacts ADD COLUMN contact_email VARCHAR(255) AFTER contact_phone;
ALTER TABLE emergency_contacts ADD INDEX idx_contact_email (contact_email);
```

### 5. Update Emergency Contacts

Users need to add email addresses to their emergency contacts:

1. Go to Profile page
2. Add emergency contacts with email addresses
3. Email field is now required for SOS functionality

### 6. Start the Server

```bash
cd ShareRickshaw/backend
npm run dev
```

## Testing the Setup

### 1. Test Email Service

```bash
# Test email configuration (development only)
curl -X POST http://localhost:3000/api/safety/test-email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"forceTest": true}'
```

### 2. Test SOS Flow

1. Add emergency contacts with email addresses to your profile
2. Go to Safety page
3. Click SOS button
4. Confirm the alert
5. Check your email for the emergency alert

### 3. Verify Email Content

Emergency emails should include:
- ✅ Subject: "🚨 EMERGENCY ALERT - [User Name] needs help!"
- ✅ User's current GPS coordinates
- ✅ Google Maps link to location
- ✅ Location accuracy information
- ✅ Timestamp of alert
- ✅ User's contact information
- ✅ Professional HTML formatting

## Troubleshooting

### Common Issues

1. **Email not sending**:
   - Verify Gmail credentials in `.env`
   - Check if app password is correct (not regular password)
   - Ensure 2-factor authentication is enabled

2. **Missing email field error**:
   - Run database migration
   - Check if emergency contacts have email addresses

3. **Location permission denied**:
   - Enable location services in browser
   - Use HTTPS or localhost for location access

4. **CORS issues**:
   - Verify frontend URL is in CORS origins
   - Check API_BASE_URL in frontend

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

### Email Service Testing

Test email service directly:

```javascript
// In backend console
const emailService = require('./services/emailService');
emailService.testConfiguration().then(console.log);
```

## Security Considerations

1. **Never commit `.env` file** to version control
2. **Use app-specific passwords** for Gmail
3. **Monitor email sending** to avoid abuse
4. **Rate limiting** is built-in (1 SOS per minute per user)
5. **All SOS triggers are logged** for audit purposes

## Features Included

### ✅ Email Service
- Gmail SMTP integration with nodemailer
- Retry logic with exponential backoff
- High priority email headers
- Professional HTML email templates

### ✅ Location Services
- High-accuracy GPS location capture
- Fallback to last known location
- Google Maps URL generation
- Location accuracy indicators

### ✅ User Experience
- Loading states during email sending
- Detailed success/error messages
- Contact count notifications
- Cooldown period to prevent spam

### ✅ Safety Features
- SOS trigger logging and audit trail
- Email validation for emergency contacts
- Duplicate email prevention
- Rate limiting and cooldowns

## Monitoring and Maintenance

- Monitor email delivery success rates
- Check SOS logs for debugging
- Update Gmail credentials if needed
- Review emergency contact data quality
- Test email service periodically

## Support

For issues with the SOS email system:

1. Check browser console for JavaScript errors
2. Review server logs for email service errors
3. Verify Gmail SMTP configuration
4. Test with different email providers
5. Check spam/junk folders for test emails