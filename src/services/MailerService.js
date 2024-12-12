const nodemailer = require('nodemailer');
const { AppError } = require('../utils/AppError');

class MailerService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
        to,
        subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new AppError(500, 'EMAIL_SEND_ERROR', 'Failed to send email', error);
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `;

    await this.sendEmail(email, 'Password Reset Request', html);
  }

  async sendVerificationEmail(email, verificationToken) {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const html = `
      <h1>Verify Your Email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>If you didn't create an account, please ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    `;

    await this.sendEmail(email, 'Email Verification', html);
  }
}

const mailerService = new MailerService();
module.exports = mailerService;