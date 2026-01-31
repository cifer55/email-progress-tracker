/**
 * Help Email Service
 * Handles automatic replies to help requests
 * Requirements: 8.4
 */

import logger from '../config/logger';
import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class HelpEmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config?: EmailConfig) {
    if (config) {
      this.initializeTransporter();
    }
  }

  /**
   * Initialize email transporter for sending replies
   */
  private initializeTransporter(): void {
    if (!this.config) {
      logger.warn('Email config not provided, help emails will not be sent');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
      });

      logger.info('Help email transporter initialized');
    } catch (error) {
      logger.error('Failed to initialize help email transporter', error);
    }
  }

  /**
   * Check if an email is a help request
   */
  isHelpRequest(subject: string): boolean {
    const helpKeywords = /\b(help|template|guide|how to|instructions|format)\b/i;
    return helpKeywords.test(subject);
  }

  /**
   * Generate help email content
   */
  private generateHelpContent(): string {
    return `
Thank you for your interest in the Email-Based Progress Tracking system!

This automated system processes your progress update emails and updates the roadmap visualization.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 EMAIL TEMPLATE

Subject: Progress Update: [Feature Name or ID]

Feature: [Feature identifier]
Status: [Status keyword]
Progress: [Percentage]%

Summary:
[Brief description of progress made]

Blockers:
- [Blocker 1]
- [Blocker 2]

Action Items:
- [Action item 1]
- [Action item 2]

Next Steps:
- [Next step 1]
- [Next step 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 FEATURE IDENTIFICATION

Use one of these methods to identify your feature:

1. Feature ID (Recommended):
   Feature: Feature #123
   Feature: FEAT-456
   Feature: FT-789

2. Feature Name (in quotes):
   Feature: "User Authentication System"
   Feature: "Payment Gateway Integration"

3. Subject Line:
   Subject: Progress Update: Feature #123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STATUS KEYWORDS

Completion Status:
• Complete, Completed, Done, Finished → Complete
• In Progress, Ongoing, Working On → In Progress
• Not Started → Not Started

Issue Status:
• Blocked, Stuck, Waiting → Blocked
• Delayed, Behind Schedule → Delayed
• On Hold, Paused → On Hold

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 EXAMPLE EMAIL

Subject: Progress Update: Feature #456

Feature: Feature #456
Status: In Progress
Progress: 60%

Summary:
Completed the OAuth2 integration and basic login flow. Currently working on 
password reset functionality and multi-factor authentication.

Blockers:
- Waiting for security team review of authentication flow
- Need clarification on password policy requirements

Action Items:
- Complete password reset implementation
- Add unit tests for OAuth2 flow
- Update API documentation

Next Steps:
- Begin MFA implementation next week
- Schedule security review
- Prepare demo for stakeholders

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 TIPS FOR SUCCESS

✅ DO:
• Use clear, specific feature identifiers
• Include percentage completion when possible
• Be specific about blockers and their impact
• List concrete action items
• Keep summaries concise but informative
• Update regularly (weekly recommended)

❌ DON'T:
• Use vague status descriptions
• Forget to identify the feature
• Leave out critical blockers
• Write overly long summaries
• Use inconsistent feature names
• Include sensitive information (passwords, keys, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 TROUBLESHOOTING

Email not processed?
→ Check that feature ID or name is clearly stated
→ Ensure status keywords are recognized
→ Check the review queue in the web interface

Linked to wrong feature?
→ Use feature ID instead of name for accuracy
→ Manually correct in the review queue

Status not detected?
→ Use recognized status keywords
→ Place status on its own line: "Status: In Progress"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 ADDITIONAL RESOURCES

For more detailed information, visit:
• Full Documentation: [Your documentation URL]
• Email Template: [Template URL]
• FAQ: [FAQ URL]
• Support: [Support email]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Contact your system administrator or reply to this email.

Happy tracking! 🚀

---
This is an automated response from the Email-Based Progress Tracking system.
`;
  }

  /**
   * Send help email to requester
   */
  async sendHelpEmail(toAddress: string, originalSubject: string): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Cannot send help email: transporter not initialized');
      return false;
    }

    try {
      const helpContent = this.generateHelpContent();

      await this.transporter.sendMail({
        from: this.config!.auth.user,
        to: toAddress,
        subject: `Re: ${originalSubject} - Progress Tracking Help`,
        text: helpContent,
      });

      logger.info(`Help email sent to ${toAddress}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send help email to ${toAddress}`, error);
      return false;
    }
  }

  /**
   * Process incoming email and send help if requested
   */
  async processEmail(email: {
    from: string;
    subject: string;
  }): Promise<boolean> {
    if (this.isHelpRequest(email.subject)) {
      logger.info(`Help request detected from ${email.from}`);
      return await this.sendHelpEmail(email.from, email.subject);
    }
    return false;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Help email service connection verified');
      return true;
    } catch (error) {
      logger.error('Help email service connection failed', error);
      return false;
    }
  }
}
