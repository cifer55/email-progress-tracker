# Design Document: Email-Based Progress Tracking

## Overview

The email-based progress tracking feature enables automatic tracking of feature development progress through email. Users forward meeting summaries to a central email address, and the system extracts progress information, links it to features, and displays updates in the roadmap visualizer.

This design uses a backend service architecture with email processing, natural language processing for information extraction, and frontend integration for displaying progress information.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Email Providers                          │
│              (Gmail, Outlook, Custom SMTP)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ IMAP/POP3
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Email Processing Service                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Email Poller │→ │ Email Parser │→ │ NLP Processor│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Processing Queue (Redis)                │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Emails     │  │   Updates    │  │   Features   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Frontend Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  SidePanel   │  │ Progress Tab │  │ Review Queue │     │
│  │  (Enhanced)  │  │   (New)      │  │    (New)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```
Backend Service:
├─ Email Processing Service
│  ├─ EmailPollerService
│  ├─ EmailParserService
│  ├─ NLPProcessorService
│  └─ FeatureMatcherService
├─ API Layer
│  ├─ ProgressAPI
│  ├─ EmailAPI
│  └─ ConfigurationAPI
└─ Database Layer
   ├─ EmailRepository
   ├─ UpdateRepository
   └─ FeatureRepository

Frontend Application:
├─ Services
│  ├─ ProgressService
│  └─ EmailConfigService
├─ Components
│  ├─ ProgressIndicator
│  ├─ UpdateTimeline
│  ├─ ReviewQueue
│  └─ EmailConfigDialog
└─ Enhanced Components
   ├─ SidePanel (add progress tab)
   └─ GanttChart (add status colors)
```

## Components and Interfaces

### Backend Services

#### EmailPollerService

**Responsibilities:**
- Connect to email inbox using IMAP/POP3
- Poll for new emails at configured intervals
- Download email content and attachments
- Queue emails for processing
- Handle connection errors and retries

**Interface:**
```typescript
interface EmailPollerConfig {
  provider: 'gmail' | 'outlook' | 'imap' | 'pop3';
  host: string;
  port: number;
  username: string;
  password: string; // encrypted
  pollInterval: number; // milliseconds
  ssl: boolean;
}

interface RawEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  attachments: Attachment[];
  receivedAt: Date;
}

class EmailPollerService {
  constructor(config: EmailPollerConfig);
  
  start(): Promise<void>;
  stop(): Promise<void>;
  checkForNewEmails(): Promise<RawEmail[]>;
  markAsProcessed(emailId: string): Promise<void>;
}
```

#### EmailParserService

**Responsibilities:**
- Parse email content (plain text and HTML)
- Extract structured information
- Identify feature references
- Extract progress indicators
- Clean and normalize text

**Interface:**
```typescript
interface ParsedEmail {
  id: string;
  rawEmail: RawEmail;
  featureReferences: FeatureReference[];
  progressIndicators: ProgressIndicator[];
  extractedInfo: ExtractedInfo;
  confidence: number; // 0-1
}

interface FeatureReference {
  featureName: string;
  featureId?: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'id';
}

interface ProgressIndicator {
  type: 'status' | 'percentage' | 'blocker' | 'date';
  value: string;
  confidence: number;
}

interface ExtractedInfo {
  status?: ProgressStatus;
  percentComplete?: number;
  blockers: string[];
  actionItems: string[];
  nextSteps: string[];
  dates: ExtractedDate[];
  summary: string;
}

class EmailParserService {
  parseEmail(rawEmail: RawEmail): Promise<ParsedEmail>;
  extractFeatureReferences(text: string): FeatureReference[];
  extractProgressIndicators(text: string): ProgressIndicator[];
}
```

#### NLPProcessorService

**Responsibilities:**
- Apply natural language processing to email content
- Extract entities (features, dates, people)
- Classify sentiment and urgency
- Identify blockers and issues
- Extract action items

**Interface:**
```typescript
interface NLPResult {
  entities: Entity[];
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
  topics: string[];
  keyPhrases: string[];
}

interface Entity {
  type: 'feature' | 'person' | 'date' | 'organization';
  value: string;
  confidence: number;
}

class NLPProcessorService {
  processText(text: string): Promise<NLPResult>;
  extractEntities(text: string): Promise<Entity[]>;
  classifySentiment(text: string): Promise<string>;
  extractKeyPhrases(text: string): Promise<string[]>;
}
```

#### FeatureMatcherService

**Responsibilities:**
- Match email content to existing features
- Handle fuzzy matching and partial names
- Calculate match confidence scores
- Suggest potential matches for review

**Interface:**
```typescript
interface FeatureMatch {
  featureId: string;
  featureName: string;
  confidence: number;
  matchReason: string;
}

class FeatureMatcherService {
  findMatches(
    featureReferences: FeatureReference[],
    existingFeatures: Feature[]
  ): Promise<FeatureMatch[]>;
  
  fuzzyMatch(
    searchTerm: string,
    candidates: string[]
  ): { match: string; score: number }[];
}
```

### API Layer

#### ProgressAPI

**Endpoints:**
```typescript
// Get progress for a feature
GET /api/progress/:featureId
Response: {
  featureId: string;
  currentStatus: ProgressStatus;
  percentComplete: number;
  lastUpdate: Update;
  updateCount: number;
}

// Get update history for a feature
GET /api/progress/:featureId/updates
Query: { startDate?, endDate?, limit?, offset? }
Response: {
  updates: Update[];
  total: number;
}

// Create manual update
POST /api/progress/:featureId/updates
Body: {
  status?: ProgressStatus;
  percentComplete?: number;
  summary: string;
  blockers?: string[];
}

// Update feature status
PATCH /api/progress/:featureId/status
Body: {
  status: ProgressStatus;
  reason?: string;
}
```

#### EmailAPI

**Endpoints:**
```typescript
// Get unmatched emails for review
GET /api/emails/unmatched
Response: {
  emails: ParsedEmail[];
  total: number;
}

// Link email to feature
POST /api/emails/:emailId/link
Body: {
  featureId: string;
}

// Get email details
GET /api/emails/:emailId
Response: ParsedEmail

// Delete email
DELETE /api/emails/:emailId
```

#### ConfigurationAPI

**Endpoints:**
```typescript
// Get email configuration
GET /api/config/email
Response: EmailPollerConfig (without password)

// Update email configuration
PUT /api/config/email
Body: EmailPollerConfig

// Test email connection
POST /api/config/email/test
Body: EmailPollerConfig
Response: { success: boolean; message: string }
```

### Frontend Services

#### ProgressService

**Interface:**
```typescript
interface Update {
  id: string;
  featureId: string;
  timestamp: Date;
  sender: string;
  summary: string;
  status?: ProgressStatus;
  percentComplete?: number;
  blockers: string[];
  actionItems: string[];
  emailId?: string;
  source: 'email' | 'manual';
}

type ProgressStatus = 
  | 'not-started'
  | 'in-progress'
  | 'blocked'
  | 'delayed'
  | 'complete'
  | 'on-hold';

class ProgressService {
  getFeatureProgress(featureId: string): Promise<FeatureProgress>;
  getUpdateHistory(featureId: string, options?: QueryOptions): Promise<Update[]>;
  createManualUpdate(featureId: string, update: Partial<Update>): Promise<Update>;
  updateFeatureStatus(featureId: string, status: ProgressStatus): Promise<void>;
}
```

### Frontend Components

#### ProgressIndicator Component

**Props:**
```typescript
interface ProgressIndicatorProps {
  status: ProgressStatus;
  percentComplete?: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}
```

**Responsibilities:**
- Display visual progress indicator (progress bar or status badge)
- Show status with appropriate colors
- Display percentage if available
- Support different sizes for different contexts

#### UpdateTimeline Component

**Props:**
```typescript
interface UpdateTimelineProps {
  featureId: string;
  updates: Update[];
  onLoadMore?: () => void;
  onViewEmail?: (emailId: string) => void;
}
```

**Responsibilities:**
- Display chronological list of updates
- Show update details (timestamp, sender, summary)
- Highlight status changes
- Link to original emails
- Support infinite scroll for long histories

#### ReviewQueue Component

**Props:**
```typescript
interface ReviewQueueProps {
  unmatchedEmails: ParsedEmail[];
  features: Feature[];
  onLinkEmail: (emailId: string, featureId: string) => void;
  onDismiss: (emailId: string) => void;
}
```

**Responsibilities:**
- Display list of unmatched emails
- Show suggested feature matches
- Allow manual linking to features
- Allow dismissing false positives
- Show email preview

#### EmailConfigDialog Component

**Props:**
```typescript
interface EmailConfigDialogProps {
  config?: EmailPollerConfig;
  onSave: (config: EmailPollerConfig) => void;
  onTest: (config: EmailPollerConfig) => Promise<boolean>;
  onClose: () => void;
}
```

**Responsibilities:**
- Configure email account settings
- Test email connection
- Validate configuration
- Securely handle credentials

## Data Models

### Database Schema

```typescript
// Email table
interface EmailRecord {
  id: string;
  from: string;
  subject: string;
  body: string;
  htmlBody?: string;
  receivedAt: Date;
  processedAt: Date;
  status: 'pending' | 'processed' | 'failed' | 'unmatched';
  errorMessage?: string;
}

// Update table
interface UpdateRecord {
  id: string;
  featureId: string;
  emailId?: string;
  timestamp: Date;
  sender: string;
  summary: string;
  status?: ProgressStatus;
  percentComplete?: number;
  blockers: string[];
  actionItems: string[];
  source: 'email' | 'manual';
  createdBy?: string;
}

// Feature Progress table (extends existing Feature)
interface FeatureProgressRecord {
  featureId: string;
  currentStatus: ProgressStatus;
  percentComplete: number;
  lastUpdateId: string;
  lastUpdateAt: Date;
  updateCount: number;
}
```

### Extended Feature Model

```typescript
// Extend existing Feature interface
interface Feature {
  // ... existing fields ...
  
  // New fields for progress tracking
  progress?: {
    status: ProgressStatus;
    percentComplete: number;
    lastUpdate?: Update;
    updateCount: number;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Email Processing Completeness

*For any* email received by the Email_Inbox, the email SHALL either be successfully processed and linked to a feature, or placed in the unmatched queue for manual review.

**Validates: Requirements 2.5, 10.1**

### Property 2: Feature Identification Accuracy

*For any* email containing a valid feature identifier (name or ID), the FeatureMatcherService SHALL identify at least one matching feature with confidence > 0.7.

**Validates: Requirements 3.1, 3.2, 3.6**

### Property 3: Status Update Consistency

*For any* feature, when a new update is processed, the feature's currentStatus SHALL reflect the most recent status change based on timestamp ordering.

**Validates: Requirements 5.2, 5.3**

### Property 4: Update History Preservation

*For any* feature, all Update_Entry records SHALL be preserved in chronological order and remain accessible through the update history API.

**Validates: Requirements 6.1, 6.2**

### Property 5: Credential Security

*For any* stored email credentials, the password field SHALL be encrypted using AES-256 encryption before storage.

**Validates: Requirements 11.1**

### Property 6: Processing Performance

*For any* batch of N emails (where N ≤ 100), the EmailProcessingService SHALL complete processing within N seconds.

**Validates: Requirements 12.2**

### Property 7: Notification Trigger Accuracy

*For any* feature status change to "Blocked", a notification SHALL be created and delivered to configured recipients.

**Validates: Requirements 9.1**

### Property 8: Manual Correction Audit Trail

*For any* manual correction or linking operation, an audit log entry SHALL be created with user ID, timestamp, and action details.

**Validates: Requirements 10.5**

## Error Handling

### Email Connection Errors
- **Connection timeout**: Retry with exponential backoff (max 3 attempts)
- **Authentication failure**: Log error, notify admin, disable polling until fixed
- **SSL/TLS errors**: Log error with details, suggest configuration fix

### Email Processing Errors
- **Parse failure**: Log email ID and error, move to failed queue for manual review
- **NLP service unavailable**: Queue email for retry, use fallback keyword matching
- **Database error**: Retry transaction, log error, alert admin if persistent

### Feature Matching Errors
- **No matches found**: Place in unmatched queue with suggested alternatives
- **Multiple high-confidence matches**: Place in review queue for manual selection
- **Ambiguous references**: Extract all possibilities, require manual review

### API Errors
- **Rate limit exceeded**: Return 429 status, include retry-after header
- **Invalid request**: Return 400 with detailed validation errors
- **Unauthorized**: Return 401, require authentication
- **Not found**: Return 404 with helpful message

## Testing Strategy

### Unit Tests
- Email parsing with various formats (plain text, HTML, mixed)
- Feature name matching (exact, partial, fuzzy)
- Status extraction from different phrasings
- Date extraction and parsing
- Credential encryption/decryption
- NLP entity extraction

### Integration Tests
- End-to-end email processing flow
- Database operations (create, read, update)
- API endpoint functionality
- Frontend component rendering
- Email provider connections (mocked)

### Property-Based Tests
Each correctness property will be implemented as a property-based test using fast-check:

1. **Property 1**: Generate random emails, verify all are processed or queued
2. **Property 2**: Generate emails with feature IDs, verify matching accuracy
3. **Property 3**: Generate random status updates, verify consistency
4. **Property 4**: Generate random updates, verify history preservation
5. **Property 5**: Generate random credentials, verify encryption
6. **Property 6**: Generate batches of emails, verify processing time
7. **Property 7**: Generate status changes, verify notifications
8. **Property 8**: Generate manual corrections, verify audit trail

## Security Considerations

### Authentication and Authorization
- API endpoints require JWT authentication
- Role-based access control (admin, user, viewer)
- Email credentials stored with encryption at rest
- Secure credential transmission (HTTPS only)

### Data Privacy
- Email content sanitized to prevent XSS
- Personal information redacted in logs
- Configurable data retention policies
- GDPR compliance for email storage

### Rate Limiting
- API rate limits per user/IP
- Email polling rate limits to prevent server overload
- Exponential backoff for failed requests

## Performance Optimization

### Caching
- Cache feature list for matching (refresh every 5 minutes)
- Cache NLP results for duplicate emails
- Cache user preferences and configuration

### Async Processing
- Email processing in background workers
- Queue-based architecture for scalability
- Non-blocking API responses

### Database Optimization
- Indexes on featureId, timestamp, status
- Pagination for large result sets
- Archival of old emails (>6 months)

## Deployment Architecture

### Backend Service
- Node.js/Express or Python/FastAPI
- Docker containerization
- Kubernetes for orchestration
- Redis for queue management
- PostgreSQL for data storage

### Frontend Integration
- New API service layer
- Enhanced existing components
- New progress tracking components
- WebSocket for real-time updates (optional)

### Infrastructure Requirements
- Email server access (IMAP/SMTP)
- Database server (PostgreSQL)
- Cache server (Redis)
- Application server (Node.js/Python)
- Load balancer (for scaling)

## Migration Strategy

### Phase 1: Backend Setup
1. Deploy email processing service
2. Set up database schema
3. Configure email account
4. Test email processing pipeline

### Phase 2: API Development
1. Implement REST API endpoints
2. Add authentication/authorization
3. Test API functionality
4. Document API

### Phase 3: Frontend Integration
1. Create new components
2. Enhance existing components
3. Integrate with API
4. Test UI functionality

### Phase 4: Rollout
1. Beta testing with small team
2. Gather feedback and iterate
3. Full rollout to all users
4. Monitor and optimize

## Future Enhancements

- AI-powered summary generation
- Sentiment analysis for team morale tracking
- Integration with calendar for meeting scheduling
- Slack/Teams integration for notifications
- Mobile app for on-the-go updates
- Voice-to-text for meeting notes
- Automatic action item extraction and assignment
