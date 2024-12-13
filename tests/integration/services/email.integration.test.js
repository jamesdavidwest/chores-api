const MailerService = require('../../../src/services/MailerService');
const EmailQueueService = require('../../../src/services/EmailQueueService');
const { SMTPServer } = require('smtp-server');
const LoggerService = require('../../../src/services/LoggerService');

// Mock LoggerService to prevent noise in test output
jest.mock('../../../src/services/LoggerService', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

describe('Email Integration Tests', () => {
    let smtpServer;
    let receivedEmails = [];

    beforeAll(async () => {
        // Setup test SMTP server
        smtpServer = new SMTPServer({
            authOptional: true,
            onData(stream, session, callback) {
                let emailData = '';
                stream.on('data', (chunk) => {
                    emailData += chunk;
                });
                stream.on('end', () => {
                    receivedEmails.push(emailData);
                    callback();
                });
            }
        });

        await new Promise((resolve) => {
            smtpServer.listen(2525, 'localhost', resolve);
        });

        // Configure MailerService to use test server
        process.env.SMTP_HOST = 'localhost';
        process.env.SMTP_PORT = '2525';
        process.env.SMTP_SECURE = 'false';
    });

    afterAll((done) => {
        smtpServer.close(done);
    });

    beforeEach(() => {
        receivedEmails = [];
        EmailQueueService.clearQueue();
        jest.clearAllMocks();
    });

    describe('Real SMTP Communication', () => {
        it('should successfully send email through SMTP server', async () => {
            const testEmail = {
                to: 'test@example.com',
                subject: 'Integration Test',
                html: '<p>Test content</p>'
            };

            await MailerService.sendEmail(
                testEmail.to,
                testEmail.subject,
                testEmail.html
            );

            // Wait for email to be processed
            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(receivedEmails.length).toBe(1);
            expect(receivedEmails[0]).toContain(testEmail.to);
            expect(receivedEmails[0]).toContain(testEmail.subject);
            expect(LoggerService.info).toHaveBeenCalled();
        });

        it('should handle multiple simultaneous email sends', async () => {
            const emails = Array(5).fill().map((_, i) => ({
                to: `test${i}@example.com`,
                subject: `Test Email ${i}`,
                html: `<p>Content ${i}</p>`
            }));

            await Promise.all(emails.map(email => 
                MailerService.sendEmail(email.to, email.subject, email.html)
            ));

            // Wait for emails to be processed
            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(receivedEmails.length).toBe(5);
            expect(LoggerService.info).toHaveBeenCalledTimes(5);
        });

        it('should handle HTML template rendering', async () => {
            const testEmail = {
                to: 'test@example.com',
                subject: 'HTML Template Test',
                html: `
                    <div style="font-family: Arial, sans-serif;">
                        <h1>Welcome!</h1>
                        <p>This is a test of HTML template rendering.</p>
                        <ul>
                            <li>Item 1</li>
                            <li>Item 2</li>
                        </ul>
                    </div>
                `
            };

            await MailerService.sendEmail(
                testEmail.to,
                testEmail.subject,
                testEmail.html
            );

            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(receivedEmails[0]).toContain('font-family: Arial, sans-serif');
            expect(receivedEmails[0]).toContain('<h1>Welcome!</h1>');
        });
    });

    describe('Email Queue Integration', () => {
        it('should process queued emails respecting rate limits', async () => {
            // Queue more emails than rate limit allows
            const emailCount = 150; // Above rate limit
            const queueIds = [];

            for (let i = 0; i < emailCount; i++) {
                const queueId = await EmailQueueService.queueEmail({
                    to: `test${i}@example.com`,
                    subject: `Test ${i}`,
                    html: `<p>Content ${i}</p>`
                });
                queueIds.push(queueId);
            }

            // Start processing
            await EmailQueueService.processQueue();

            // Check rate limiting
            const stats = EmailQueueService.getStats();
            expect(stats.sendCount).toBeLessThanOrEqual(stats.rateLimitCount);

            // Verify remaining emails are still queued
            expect(stats.queued).toBeGreaterThan(0);
            expect(LoggerService.warn).toHaveBeenCalledWith(
                'Email rate limit exceeded, pausing queue processing',
                expect.any(Object)
            );
        });

        it('should handle retry mechanism for failed sends', async () => {
            // Temporarily make SMTP server refuse connections
            smtpServer.close();

            const queueId = await EmailQueueService.queueEmail({
                to: 'test@example.com',
                subject: 'Retry Test',
                html: '<p>Test content</p>'
            });

            // Try processing
            await EmailQueueService.processQueue();

            // Check retry status
            const status = EmailQueueService.getEmailStatus(queueId);
            expect(status.status).toBe('retry');
            expect(status.attempts).toBe(1);
            expect(status.error).toBeDefined();

            // Verify retry delay
            expect(status.nextAttempt).toBeGreaterThan(Date.now());

            // Restore SMTP server
            await new Promise((resolve) => {
                smtpServer.listen(2525, 'localhost', resolve);
            });

            expect(LoggerService.warn).toHaveBeenCalledWith(
                'Email sending failed, scheduled retry',
                expect.any(Object)
            );
        });

        it('should handle maximum retry attempts', async () => {
            // Keep SMTP server down
            smtpServer.close();

            const queueId = await EmailQueueService.queueEmail({
                to: 'test@example.com',
                subject: 'Max Retry Test',
                html: '<p>Test content</p>'
            });

            // Process multiple times to exceed max attempts
            for (let i = 0; i < 6; i++) {
                await EmailQueueService.processQueue();
                // Advance time to bypass retry delay
                jest.advanceTimersByTime(60000);
            }

            const status = EmailQueueService.getEmailStatus(queueId);
            expect(status.status).toBe('failed');
            expect(status.attempts).toBeGreaterThanOrEqual(5);

            expect(LoggerService.error).toHaveBeenCalledWith(
                'Email sending failed permanently',
                expect.any(Object)
            );

            // Restore SMTP server
            await new Promise((resolve) => {
                smtpServer.listen(2525, 'localhost', resolve);
            });
        });
    });

    describe('Template Rendering', () => {
        it('should correctly render email templates with variables', async () => {
            const testData = {
                name: 'John Doe',
                activationLink: 'http://example.com/activate'
            };

            await MailerService.sendVerificationEmail(
                'test@example.com',
                testData.activationLink
            );

            await new Promise(resolve => setTimeout(resolve, 1000));

            const sentEmail = receivedEmails[0];
            expect(sentEmail).toContain(testData.activationLink);
            expect(sentEmail).toContain('Verify Your Email');
            expect(sentEmail).toContain('expire in 24 hours');
        });

        it('should handle password reset templates', async () => {
            const resetToken = 'test-reset-token-123';
            await MailerService.sendPasswordResetEmail(
                'test@example.com',
                resetToken
            );

            await new Promise(resolve => setTimeout(resolve, 1000));

            const sentEmail = receivedEmails[0];
            expect(sentEmail).toContain(resetToken);
            expect(sentEmail).toContain('Password Reset Request');
            expect(sentEmail).toContain('expire in 1 hour');
        });
    });

    describe('Error Handling', () => {
        it('should handle SMTP connection failures gracefully', async () => {
            // Close SMTP server to simulate connection failure
            smtpServer.close();

            await expect(
                MailerService.sendEmail(
                    'test@example.com',
                    'Test',
                    '<p>Content</p>'
                )
            ).rejects.toThrow();

            expect(LoggerService.error).toHaveBeenCalled();

            // Restore SMTP server
            await new Promise((resolve) => {
                smtpServer.listen(2525, 'localhost', resolve);
            });
        });

        it('should handle invalid recipient addresses', async () => {
            await expect(
                MailerService.sendEmail(
                    'invalid-email',
                    'Test',
                    '<p>Content</p>'
                )
            ).rejects.toThrow();

            expect(LoggerService.error).toHaveBeenCalled();
        });

        it('should handle malformed HTML content', async () => {
            const malformedHtml = '<div>Unclosed div';
            
            await MailerService.sendEmail(
                'test@example.com',
                'Test',
                malformedHtml
            );

            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(receivedEmails[0]).toContain(malformedHtml);
            // Email should still send despite malformed HTML
            expect(LoggerService.warn).not.toHaveBeenCalled();
        });
    });

    describe('Performance and Load Testing', () => {
        it('should handle burst sending of emails', async () => {
            const burstSize = 20;
            const emails = Array(burstSize).fill().map((_, i) => ({
                to: `burst${i}@example.com`,
                subject: `Burst Test ${i}`,
                html: `<p>Burst content ${i}</p>`
            }));

            const startTime = Date.now();
            await Promise.all(emails.map(email =>
                MailerService.sendEmail(email.to, email.subject, email.html)
            ));
            const endTime = Date.now();

            // Wait for all emails to be processed
            await new Promise(resolve => setTimeout(resolve, 2000));

            expect(receivedEmails.length).toBe(burstSize);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should maintain email order in queue processing', async () => {
            const emailCount = 10;
            const queueIds = [];

            // Queue emails with sequence numbers
            for (let i = 0; i < emailCount; i++) {
                const queueId = await EmailQueueService.queueEmail({
                    to: `sequence${i}@example.com`,
                    subject: `Sequence ${i}`,
                    html: `<p>Sequence content ${i}</p>`
                });
                queueIds.push(queueId);
            }

            await EmailQueueService.processQueue();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify email order
            for (let i = 0; i < emailCount; i++) {
                expect(receivedEmails[i]).toContain(`Sequence ${i}`);
            }
        });
    });
});