// src/config/email.js
module.exports = {
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
};
