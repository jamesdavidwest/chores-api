// src/utils/mailer.js
const nodemailer = require('nodemailer');
const config = require('../config/email');

class Mailer {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendVerificationEmail(to, token) {
    const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: config.from,
      to,
      subject: 'Verify Your Email Address',
      html: `
                <h1>Email Verification</h1>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationUrl}">Verify Email</a>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't request this verification, please ignore this email.</p>
            `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(to, token) {
    const resetUrl = `${config.appUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: config.from,
      to,
      subject: 'Password Reset Request',
      html: `
                <h1>Password Reset</h1>
                <p>You requested to reset your password. Click the link below to create a new password:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this reset, please ignore this email.</p>
            `,
    };

    return this.transporter.sendMail(mailOptions);
  }
}

module.exports = new Mailer();
