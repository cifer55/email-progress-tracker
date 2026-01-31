# Email-Based Progress Tracking Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Email Formatting Guidelines](#email-formatting-guidelines)
4. [Feature Identification](#feature-identification)
5. [Status Updates](#status-updates)
6. [Examples](#examples)
7. [Review Queue](#review-queue)
8. [FAQ](#faq)
9. [Troubleshooting](#troubleshooting)

## Introduction

The Email-Based Progress Tracking system allows you to update feature progress by simply sending an email. The system automatically processes your emails, extracts progress information, and updates the roadmap visualization.

### Benefits
- **Simple:** Just send an email - no need to log into a separate system
- **Fast:** Updates appear in the roadmap within minutes
- **Flexible:** Works with your existing email workflow
- **Automatic:** Natural language processing extracts key information
- **Reliable:** Manual review queue catches any processing issues

### How It Works
1. You send a progress update email to the designated address
2. The system receives and processes the email
3. Natural language processing extracts feature, status, and progress information
4. The roadmap is automatically updated
5. If confidence is low, the email goes to a review queue for manual linking

## Getting Started

### Step 1: Get the Email Address
Contact your system administrator to get the designated email address for progress updates.

**Example:** `roadmap-updates@yourcompany.com`

### Step 2: Identify Your Features
Know the feature name or ID you're updating. You can find these in the roadmap visualization.

**Feature IDs:** `Feature #123`, `FEAT-456`, `FT-789`  
**Feature Names:** `"User Authentication System"`, `"Payment Gateway Integration"`

### Step 3: Send Your First Update
Use the [email template](./email-template.md) to format your update and send it to the designated address.

### Step 4: Verify the Update
Check the roadmap visualization to see your update reflected. If it doesn't appear, check the review queue.

## Email Formatting Guidelines

### Subject Line Format
```
Progress Update: [Feature Name or ID]
```

**Good Examples:**
- ✅ `Progress Update: User Authentication System`
- ✅ `Progress Update: Feature #123`
- ✅ `Progress Update: FEAT-456 - API Integration`

**Bad Examples:**
- ❌ `Update` (too vague)
- ❌ `Status` (no feature identification)
- ❌ `Re: Meeting notes` (unclear purpose)

### Body Structure
Use clear sections with labels:

```
Feature: [Feature identifier]
Status: [Status keyword]
Progress: [Percentage]%

Summary:
[Brief description]

Blockers:
- [List blockers]

Action Items:
- [List action items]

Next Steps:
- [List next steps]
```

### Key Principles
1. **Be Specific:** Clearly identify the feature
2. **Be Concise:** Keep summaries brief and focused
3. **Be Consistent:** Use the same feature identifier each time
4. **Be Regular:** Send updates weekly or at key milestones

## Feature Identification

### Method 1: Feature ID (Recommended)
Use the feature ID from the roadmap system:

```
Feature: Feature #123
```

**Advantages:**
- Unambiguous identification
- High confidence matching
- Works even if feature name changes

**Formats Recognized:**
- `Feature #123`
- `FEAT-123`
- `FT-123`
- `#123` (in subject line)

### Method 2: Feature Name
Use the exact feature name in quotes:

```
Feature: "User Authentication System"
```

**Advantages:**
- Human-readable
- Easy to remember

**Disadvantages:**
- Must match exactly
- Case-sensitive
- May match multiple features

### Method 3: Subject Line
Include the identifier in the subject:

```
Subject: Progress Update: Feature #123
```

**Advantages:**
- Quick and easy
- Works with minimal email body

## Status Updates

### Status Keywords

#### Completion Status
| Keyword | Meaning | Use When |
|---------|---------|----------|
| **Complete, Completed, Done, Finished** | Work is 100% complete | Feature is ready for production |
| **In Progress, Ongoing, Working On** | Actively working | Development is underway |
| **Not Started** | No work begun | Feature is planned but not started |

#### Issue Status
| Keyword | Meaning | Use When |
|---------|---------|----------|
| **Blocked, Stuck, Waiting** | Cannot proceed | External dependency or blocker |
| **Delayed, Behind Schedule** | Running late | Timeline needs adjustment |
| **On Hold, Paused** | Temporarily stopped | Work paused for strategic reasons |

### Progress Percentage

Indicate completion percentage:

```
Progress: 75%
```

**Alternative Formats:**
- `75% complete`
- `75% done`
- `75% finished`

**Guidelines:**
- Use realistic estimates
- Update regularly
- Consider all aspects (code, tests, docs, review)

### Blockers

List anything preventing progress:

```
Blockers:
- Waiting for API documentation from vendor
- Database migration pending approval
- Resource allocation needed for testing
```

**Tips:**
- Be specific about what's blocking you
- Include expected resolution timeline if known
- Mention who can help unblock

### Action Items

List concrete next steps:

```
Action Items:
- Complete unit tests for authentication module
- Review security audit findings
- Update API documentation
```

**Tips:**
- Make items actionable and specific
- Include owner if multiple people involved
- Set realistic timelines

## Examples

### Example 1: Weekly Progress Update

```
Subject: Progress Update: Feature #456

Feature: Feature #456
Status: In Progress
Progress: 60%

Summary:
This week we completed the database schema design and implemented the core
CRUD operations. Started work on the API endpoints.

Accomplishments:
- Designed and reviewed database schema
- Implemented data models and repositories
- Created 15 unit tests (all passing)
- Set up CI/CD pipeline for automated testing

Blockers:
- None currently

Action Items:
- Complete REST API endpoints (3 days)
- Add integration tests (2 days)
- Update API documentation (1 day)

Next Steps:
- Begin frontend integration next week
- Schedule code review for Friday
- Plan user acceptance testing

Timeline:
On track for end-of-month delivery.
```

### Example 2: Blocked Status

```
Subject: Progress Update: Payment Gateway - BLOCKED

Feature: "Payment Gateway Integration"
Status: Blocked
Progress: 45%

Summary:
Development is blocked waiting for vendor API credentials. We've completed
all preparatory work and are ready to proceed once credentials are received.

Completed:
- Payment processing logic implemented
- Error handling and logging added
- Unit tests written (pending API access to run)
- Documentation drafted

Blockers:
- Vendor API credentials not yet received (requested 2 weeks ago)
- Cannot test integration without API access
- Timeline at risk if credentials delayed further

Action Items:
- Escalate credential request with vendor (TODAY)
- Prepare test scenarios for immediate execution once unblocked
- Review and optimize existing code while waiting

Impact:
If credentials not received by Friday, we'll miss the sprint deadline.
Recommend contingency planning.

Next Steps:
- Daily follow-up with vendor
- Resume integration work immediately upon receiving credentials
- Compress testing timeline if needed
```

### Example 3: Completion Announcement

```
Subject: Progress Update: User Dashboard - COMPLETE ✓

Feature: Feature #789
Status: Complete
Progress: 100%

Summary:
The user dashboard feature is complete and ready for production deployment.
All acceptance criteria met, testing complete, and documentation updated.

Deliverables:
✓ Dashboard UI with 5 widget types
✓ Real-time data updates via WebSocket
✓ Responsive design (mobile, tablet, desktop)
✓ Accessibility compliance (WCAG 2.1 AA)
✓ 95% code coverage with unit and integration tests
✓ Performance testing passed (< 2s load time)
✓ Security review completed
✓ User documentation published

Metrics:
- 2,500 lines of code
- 150 unit tests
- 25 integration tests
- 3 weeks development time
- Zero critical bugs in QA

Next Steps:
- Deploy to production on Friday, Feb 2
- Monitor performance and user feedback
- Plan Phase 2 enhancements based on usage data

Lessons Learned:
Early user feedback was invaluable. The iterative design process helped us
avoid major rework and delivered a better product.
```

### Example 4: Quick Status Update

```
Subject: Progress Update: Feature #321

Feature: Feature #321
Status: In Progress
Progress: 80%

Summary:
Good progress this week. Core functionality complete, working on polish and testing.

Next: Finish testing and documentation by Friday.
```

## Review Queue

### What Is the Review Queue?

The review queue is a web interface where emails with low confidence scores are held for manual review. This ensures no updates are lost or misattributed.

### When Emails Go to Review Queue

Emails are queued for review when:
- Feature identification is unclear or ambiguous
- Multiple features match the description
- Status keywords are not recognized
- Email format is non-standard
- Confidence score is below threshold (< 70%)

### How to Use the Review Queue

1. **Access:** Log into the roadmap system and navigate to "Review Queue"
2. **Review:** See list of unmatched emails with suggested feature matches
3. **Link:** Manually link email to correct feature
4. **Dismiss:** Dismiss emails that aren't progress updates
5. **Edit:** Edit email content if needed for clarity

### Best Practices

- Check review queue weekly
- Link emails promptly to keep roadmap current
- Provide feedback on why emails were queued
- Update your email format to avoid future queuing

## FAQ

### General Questions

**Q: How often should I send updates?**  
A: Weekly updates are recommended, or whenever there's a significant status change (blocked, completed, etc.).

**Q: Can I update multiple features in one email?**  
A: No, send separate emails for each feature to ensure accurate processing.

**Q: What if I make a mistake in an email?**  
A: Send a corrected update or use the review queue to manually correct the information.

**Q: Can I include attachments?**  
A: Attachments are not processed. Include relevant information in the email body.

**Q: Is there a character limit?**  
A: Keep emails under 1000 words for best processing. Focus on key information.

### Technical Questions

**Q: What email clients are supported?**  
A: All standard email clients (Gmail, Outlook, Apple Mail, etc.) are supported.

**Q: Can I use HTML formatting?**  
A: Yes, but HTML is converted to plain text. Use simple formatting only.

**Q: How long does processing take?**  
A: Usually under 1 minute. Check the roadmap or review queue if it takes longer.

**Q: What if the system is down?**  
A: Emails are queued and processed when the system comes back online.

**Q: Can I automate email sending?**  
A: Yes, you can script email sending, but ensure proper formatting is maintained.

### Privacy and Security

**Q: Who can see my email updates?**  
A: Anyone with access to the roadmap system can see progress updates.

**Q: Should I include sensitive information?**  
A: No, never include passwords, API keys, or confidential data in emails.

**Q: Are emails stored permanently?**  
A: Emails are stored for audit purposes. Check your organization's retention policy.

**Q: Can I delete an update?**  
A: Contact your system administrator to remove updates if needed.

## Troubleshooting

### Email Not Processed

**Symptoms:**
- Update doesn't appear in roadmap
- No entry in review queue
- No confirmation received

**Solutions:**
1. Check spam/junk folder for auto-replies
2. Verify you sent to correct email address
3. Ensure email wasn't blocked by firewall
4. Check system status with administrator
5. Resend email with clearer formatting

### Wrong Feature Linked

**Symptoms:**
- Update appears on wrong feature
- Multiple features updated

**Solutions:**
1. Use feature ID instead of name
2. Be more specific in feature identification
3. Check review queue and manually correct
4. Send correction email with clear feature ID

### Status Not Detected

**Symptoms:**
- Status shows as "Unknown"
- Progress percentage missing

**Solutions:**
1. Use recognized status keywords
2. Put status on its own line: `Status: In Progress`
3. Use standard format: `Progress: 75%`
4. Check email template for correct format

### Low Confidence Score

**Symptoms:**
- Email goes to review queue
- System can't match feature

**Solutions:**
1. Use feature ID for unambiguous matching
2. Include status keywords explicitly
3. Follow email template format
4. Be more specific in descriptions
5. Manually link in review queue

### Formatting Issues

**Symptoms:**
- Information extracted incorrectly
- Blockers or action items missing

**Solutions:**
1. Use clear section labels (Blockers:, Action Items:)
2. Use bullet points for lists
3. Keep formatting simple
4. Avoid complex HTML or tables
5. Review email template for examples

## Additional Resources

- [Email Template](./email-template.md) - Detailed template with examples
- [System Architecture](./architecture.md) - How the system works
- [API Documentation](./api-docs.md) - For programmatic access
- [Admin Guide](./admin-guide.md) - For system administrators

## Support

For additional help:
- **Email:** support@yourcompany.com
- **Documentation:** https://docs.yourcompany.com/roadmap
- **System Status:** https://status.yourcompany.com
- **Administrator:** Contact your team's system administrator

---

**Version:** 1.0  
**Last Updated:** 2026-01-31  
**Feedback:** Send suggestions to roadmap-feedback@yourcompany.com
