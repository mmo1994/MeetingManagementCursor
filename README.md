# MeetMe - Meeting Management Application

A production-ready meeting management web application built with Next.js, Express, and PostgreSQL.

![MeetMe](https://via.placeholder.com/800x400?text=MeetMe+Dashboard)

## Features

- **🔐 Custom JWT Authentication** - Secure auth with access/refresh tokens
- **📅 Meeting Management** - Create, edit, cancel meetings with participants
- **🗓️ Calendar Integration** - Interactive calendar with Google Calendar sync
- **🔔 Multi-Channel Notifications** - Email, push, and in-app notifications
- **⏰ Meeting Reminders** - Automated reminders before meetings
- **🌙 Dark/Light Mode** - Theme support with system preference detection
- **📱 Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **ShadCN UI** - Component library
- **React Query** - Data fetching and caching
- **React Big Calendar** - Calendar component

### Backend
- **Node.js + Express** - REST API
- **TypeScript** - Type safety
- **Prisma** - ORM for PostgreSQL
- **JWT** - Authentication
- **Nodemailer** - Email notifications
- **Web Push** - Browser push notifications
- **Google APIs** - Calendar integration

### Database
- **PostgreSQL** - Primary database
- **Prisma** - Schema management and migrations

## Project Structure

```
meetme/
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/# UI components
│   │   ├── contexts/  # React contexts
│   │   ├── hooks/     # Custom hooks
│   │   └── lib/       # Utilities and API client
│   └── Dockerfile
├── backend/           # Express backend API
│   ├── src/
│   │   ├── config/    # Configuration
│   │   ├── controllers/# Route handlers
│   │   ├── middlewares/# Express middlewares
│   │   ├── routes/    # API routes
│   │   ├── services/  # Business logic
│   │   ├── utils/     # Utilities
│   │   └── jobs/      # Background jobs
│   └── Dockerfile
├── prisma/            # Database schema and migrations
│   ├── schema.prisma
│   └── seed.ts
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+ (or Docker)
- npm or yarn

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/meetme?schema=public"

# JWT Secrets (generate secure random strings for production)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Backend
BACKEND_PORT=4000
CORS_ORIGIN="http://localhost:3000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (optional - notifications will log to console if not configured)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="MeetMe <noreply@meetme.app>"

# Google OAuth (optional - for Google Calendar integration)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/google/callback"

# Web Push (optional - generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:your-email@example.com"
```

### Local Development (Without Docker)

1. **Install dependencies:**
   ```bash
   # Install root dependencies
   npm install
   
   # Install all project dependencies
   cd prisma && npm install && cd ..
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

2. **Set up the database:**
   ```bash
   # Make sure PostgreSQL is running
   # Then run migrations
   cd prisma
   npx prisma migrate dev --name init
   
   # Seed the database with test data
   npx prisma db seed
   ```

3. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Prisma Studio: `npx prisma studio` (in prisma folder)

### Using Docker

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Run migrations (first time only):**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   docker-compose exec backend npx prisma db seed
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## Test Accounts

After running the seed script, you can use these test accounts:

| Email | Password |
|-------|----------|
| john@example.com | Password123! |
| jane@example.com | Password123! |
| bob@example.com | Password123! |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Meetings
- `GET /api/meetings` - List meetings (supports `?upcoming=true` or `?past=true`)
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/:id` - Get meeting details
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `PUT /api/meetings/:id/time` - Update meeting time (drag & drop)
- `POST /api/meetings/:id/cancel` - Cancel meeting
- `POST /api/meetings/:id/invite` - Invite participants
- `POST /api/meetings/:id/respond` - Respond to invitation

### Calendar
- `GET /api/calendar` - Get calendar events (MeetMe + Google)
- `POST /api/calendar/sync` - Manual sync trigger

### Notifications
- `GET /api/notifications` - List notifications
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Google Calendar
- `GET /api/google/connect-url` - Get OAuth URL
- `GET /api/google/callback` - OAuth callback
- `POST /api/google/disconnect` - Disconnect
- `GET /api/google/status` - Connection status

### Push Notifications
- `GET /api/push/public-key` - Get VAPID public key
- `POST /api/push/subscribe` - Subscribe to push
- `POST /api/push/unsubscribe` - Unsubscribe

## Google Calendar Setup

To enable Google Calendar integration:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:4000/api/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## License

MIT License - feel free to use this project for your own purposes.

