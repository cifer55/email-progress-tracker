# Email Progress Update Template

## Overview
This document provides guidelines for formatting email progress updates that will be automatically processed by the roadmap tracking system.

## Email Template Format

### Subject Line
The subject line should clearly identify the feature being updated:

```
Progress Update: [Feature Name or ID]
```

**Examples:**
- `Progress Update: User Authentication System`
- `Progress Update: Feature #123`
- `Progress Update: FEAT-456`

### Email Body Structure

```
Feature: [Feature Name or ID]
Status: [Status Keyword]
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

Additional Notes:
[Any additional context or information]
```

## Feature Identification

### Method 1: Feature ID (Recommended)
Use a feature ID in the format:
- `Feature #123`
- `FEAT-123`
- `FT-123`

**Example:**
```
Feature: Feature #456
```

### Method 2: Feature Name
Use the exact feature name in quotes:
- `"User Authentication System"`
- `"Payment Gateway Integration"`

**Example:**
```
Feature: "User Authentication System"
```

### Method 3: Feature Name in Subject
Include the feature name or ID in the subject line:
```
Subject: Progress Update: Feature #123
```

## Status Keywords

The system recognizes the following status keywords:

### Completion Status
- **Complete/Completed/Done/Finished** → Status: Complete
- **In Progress/Ongoing/Working On** → Status: In Progress
- **Not Started** → Status: Not Started

### Issue Status
- **Blocked/Stuck/Waiting** → Status: Blocked
- **Delayed/Behind Schedule** → Status: Delayed
- **On Hold/Paused** → Status: On Hold

**Example:**
```
Status: In Progress
```

## Progress Percentage

Indicate completion percentage using one of these formats:
- `Progress: 75%`
- `75% complete`
- `75% done`

**Example:**
```
Progress: 75%
```

## Blockers

List any blockers preventing progress:

```
Blockers:
- Waiting for API documentation from vendor
- Database migration pending approval
- Resource allocation needed for testing
```

Alternative formats:
```
Blocker: Waiting for API documentation
Issue: Database migration pending approval
```

## Action Items

List specific tasks or actions needed:

```
Action Items:
- Complete unit tests for authentication module
- Review security audit findings
- Update API documentation

Todo:
- Schedule code review
- Deploy to staging environment

Tasks:
- Fix bug in login flow
- Add error handling
```

## Next Steps

Outline upcoming work:

```
Next Steps:
- Begin integration testing
- Prepare for production deployment
- Schedule team demo

Next:
- Code review scheduled for Friday
- Deploy to staging next week
```

## Complete Email Examples

### Example 1: Standard Progress Update

```
Subject: Progress Update: User Authentication System

Feature: "User Authentication System"
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

Additional Notes:
The OAuth2 integration went smoothly. We're using industry-standard libraries
and following OWASP best practices for authentication.
```

### Example 2: Blocked Status Update

```
Subject: Progress Update: Feature #789 - BLOCKED

Feature: Feature #789
Status: Blocked
Progress: 45%

Summary:
Development is blocked due to missing API specifications from the vendor.
We've completed all work that can be done independently.

Blockers:
- Vendor API documentation not yet available (expected next week)
- Cannot proceed with integration testing without API access

Action Items:
- Follow up with vendor on API documentation timeline
- Prepare test data for integration testing
- Review and update existing code while waiting

Next Steps:
- Resume integration work once API docs are available
- Schedule integration testing session
- Update timeline based on vendor response
```

### Example 3: Completion Update

```
Subject: Progress Update: Payment Gateway Integration - COMPLETE

Feature: "Payment Gateway Integration"
Status: Complete
Progress: 100%

Summary:
Successfully completed the payment gateway integration. All testing has been
completed and the feature is ready for production deployment.

Accomplishments:
- Integrated Stripe payment processing
- Implemented webhook handling for payment events
- Added comprehensive error handling and logging
- Completed security audit
- All unit and integration tests passing

Next Steps:
- Deploy to production on Friday
- Monitor payment processing for first week
- Gather user feedback

Additional Notes:
The integration includes support for credit cards, ACH transfers, and digital
wallets. All PCI compliance requirements have been met.
```

### Example 4: Minimal Update

```
Subject: Progress Update: Feature #123

Feature: Feature #123
Status: In Progress
Progress: 30%

Summary:
Made good progress on the core functionality. On track for next week's milestone.

Next: Continue implementation and add tests.
```

## Tips for Effective Updates

### DO:
✅ Use clear, specific feature identifiers
✅ Include percentage completion when possible
✅ Be specific about blockers and their impact
✅ List concrete action items
✅ Keep summaries concise but informative
✅ Update regularly (weekly recommended)

### DON'T:
❌ Use vague status descriptions
❌ Forget to identify the feature
❌ Leave out critical blockers
❌ Write overly long summaries
❌ Use inconsistent feature names
❌ Include sensitive information (passwords, keys, etc.)

## Formatting Guidelines

### Plain Text vs HTML
- **Plain text emails** are preferred for simplicity
- **HTML emails** are supported but will be converted to plain text
- Avoid complex formatting (tables, images, etc.)

### Character Encoding
- Use UTF-8 encoding
- Avoid special characters that may not display correctly
- Standard punctuation and line breaks are fine

### Email Length
- Keep emails concise (under 1000 words)
- Focus on key information
- Use bullet points for lists
- Break up long paragraphs

## Automatic Processing

### What Gets Extracted
The system automatically extracts:
- Feature name or ID
- Status keywords
- Progress percentage
- Blockers
- Action items
- Next steps
- Dates mentioned in the email
- Sender information

### Confidence Scoring
The system assigns a confidence score based on:
- Clear feature identification (high confidence)
- Recognized status keywords (high confidence)
- Explicit progress percentage (high confidence)
- Vague or missing information (low confidence)

### Manual Review Queue
Emails with low confidence scores are placed in a review queue where they can be:
- Manually linked to the correct feature
- Edited for clarity
- Dismissed if not relevant

## Getting Help

### Request Template
Send an email with "HELP" in the subject line to receive this template:

```
Subject: HELP

[System will auto-reply with this template and examples]
```

### Common Issues

**Issue:** Email not processed
- **Solution:** Check that feature ID or name is clearly stated
- **Solution:** Ensure status keywords are recognized
- **Solution:** Check spam folder for auto-reply

**Issue:** Linked to wrong feature
- **Solution:** Use more specific feature identifier
- **Solution:** Include feature ID instead of name
- **Solution:** Manually correct in review queue

**Issue:** Status not detected
- **Solution:** Use recognized status keywords
- **Solution:** Place status on its own line
- **Solution:** Use format: `Status: [keyword]`

## Contact

For questions or issues with email processing:
- Check the review queue in the web interface
- Contact your system administrator
- Review this template for formatting guidelines

---

**Version:** 1.0  
**Last Updated:** 2026-01-31  
**System:** Email-Based Progress Tracking
