const nodemailer = require('nodemailer');
const MailerService = require('../../../src/services/MailerService');
const { AppError } = require('../../../src/utils/AppError');

// Mock nodemailer
jest.mock('nodemailer');

describe('MailerService', () => {
  let mockTransporter;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    };
    
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    
    // Setup environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'testuser';
    process.env.SMTP_PASS = 'testpass';
    process.env.SMTP_FROM = 'test@example.com';
    process.env.FRONTEND_URL = 'https://test.com';
  });

  describe('constructor', () => {
    it('should create nodemailer transport with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: '587',
        secure: false,
        auth: {
          user: 'testuser',
          pass: 'testpass',
        },
      });
    });
  });

  describe('sendEmail', () => {
    it('should send email with correct options', async () => {
      const to = 'user@example.com';
      const subject = 'Test Email';
      const html = '<p>Test content</p>';
      
      await MailerService.sendEmail(to, subject, html);
      
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to,
        subject,
        html,
      });
    });

    it('should use default from address if not set in env', async () => {
      delete process.env.SMTP_FROM;
      
      await MailerService.sendEmail('user@example.com', 'Test', 'content');
      
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@yourdomain.com',
        })
      );
    });

    it('should throw AppError if email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));
      
      await expect(
        MailerService.sendEmail('user@example.com', 'Test', 'content')
      ).rejects.toThrow(AppError);
      
      await expect(
        MailerService.sendEmail('user@example.com', 'Test', 'content')
      ).rejects.toThrow('Failed to send email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct content', async () => {
      const email = 'user@example.com';
      const resetToken = 'test-reset-token';
      
      await MailerService.sendPasswordResetEmail(email, resetToken);
      
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Password Reset Request',
          html: expect.stringContaining(
            `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
          ),
        })
      );
    });

    it('should include necessary information in reset email', async () => {
      await MailerService.sendPasswordResetEmail('user@example.com', 'token123');
      
      const emailOptions = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(emailOptions.html).toContain('Password Reset Request');
      expect(emailOptions.html).toContain('Click the link below');
      expect(emailOptions.html).toContain('expire in 1 hour');
      expect(emailOptions.html).toContain('Reset Password');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct content', async () => {
      const email = 'user@example.com';
      const verificationToken = 'test-verify-token';
      
      await MailerService.sendVerificationEmail(email, verificationToken);
      
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Email Verification',
          html: expect.stringContaining(
            `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
          ),
        })
      );
    });

    it('should include necessary information in verification email', async () => {
      await MailerService.sendVerificationEmail('user@example.com', 'token123');
      
      const emailOptions = mockTransporter.sendMail.mock.calls[0][0];
      
      expect(emailOptions.html).toContain('Verify Your Email');
      expect(emailOptions.html).toContain('Click the link below');
      expect(emailOptions.html).toContain('expire in 24 hours');
      expect(emailOptions.html).toContain('Verify Email');
    });
  });

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      nodemailer.createTransport.mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      await expect(
        MailerService.sendEmail('test@example.com', 'Test', 'content')
      ).rejects.toThrow();
    });

    it('should handle invalid email addresses', async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error('Invalid recipient address')
      );
      
      await expect(
        MailerService.sendEmail('invalid-email', 'Test', 'content')
      ).rejects.toThrow(AppError);
    });

    it('should handle SMTP server errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP server not responding')
      );
      
      await expect(
        MailerService.sendEmail('test@example.com', 'Test', 'content')
      ).rejects.toThrow(AppError);
      
      await expect(
        MailerService.sendEmail('test@example.com', 'Test', 'content')
      ).rejects.toThrow('Failed to send email');
    });

    it('should handle authentication failures', async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error('Invalid credentials')
      );
      
      await expect(
        MailerService.sendEmail('test@example.com', 'Test', 'content')
      ).rejects.toThrow(AppError);
    });
  });
});