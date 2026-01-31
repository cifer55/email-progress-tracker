# Roadmap Email Tracker - Backend Service

Backend service for email-based progress tracking in the Roadmap Visualizer application.

## Features

- Email polling and processing (IMAP/POP3)
- Natural language processing for extracting progress information
- Feature matching and linking
- Progress tracking and history
- RESTful API for frontend integration
- Authentication and authorization
- Rate limiting and security

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with appropriate values

4. Set up the database (see Database Setup below)

## Development

Start the development server with hot reload:
```bash
npm run dev
```

## Building

Build the TypeScript code:
```bash
npm run build
```

## Running in Production

```bash
npm run build
npm start
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Database Setup

The database schema will be created using migrations. Run migrations with:
```bash
# Migration commands will be added when implementing database layer
```

## API Documentation

### Health Check
- `GET /health` - Check if the server is running

### Progress API
- `GET /api/progress/:featureId` - Get progress for a feature
- `GET /api/progress/:featureId/updates` - Get update history
- `POST /api/progress/:featureId/updates` - Create manual update
- `PATCH /api/progress/:featureId/status` - Update feature status

### Email API
- `GET /api/emails/unmatched` - Get unmatched emails for review
- `POST /api/emails/:emailId/link` - Link email to feature
- `GET /api/emails/:emailId` - Get email details
- `DELETE /api/emails/:emailId` - Delete email

### Configuration API
- `GET /api/config/email` - Get email configuration
- `PUT /api/config/email` - Update email configuration
- `POST /api/config/email/test` - Test email connection

## Environment Variables

See `.env.example` for all available configuration options.

## Architecture

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── services/        # Business logic services
│   ├── repositories/    # Database access layer
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   └── index.ts         # Entry point
├── logs/                # Application logs
├── dist/                # Compiled JavaScript (generated)
└── node_modules/        # Dependencies (generated)
```

## Security

- All API endpoints are protected with JWT authentication
- Email credentials are encrypted at rest using AES-256
- Rate limiting is applied to prevent abuse
- Input validation and sanitization on all endpoints
- CORS configured for frontend origin only

## Logging

Logs are written to:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs
- Console output in development mode

## License

MIT
