# plantrot 🌱

A modern houseplant care tracking application with intelligent recurring task management and collaborative plant group features.

## Features

- **Plant Management** - Track unlimited plants with photos, videos, detailed profiles, and care schedules
- **Smart Scheduling** - Recurring care tasks (watering, fertilizing, repotting, misting, pruning) with automatic recalculation
- **Task Boards** - Kanban-style task boards with drag-and-drop organization by status or task type
- **Favorite Plants** - Quick access dashboard with up to 5 favorite plants
- **Plant Groups** - Collaborative plant care with Clerk Organizations - share plants and tasks with family or roommates
- **Bulk Import** - Import multiple plants at once via CSV for efficient setup
- **Media Gallery** - Upload and organize photos and videos with captions for each plant
- **Notifications** - In-app notifications for due and overdue tasks with customizable preferences
- **Analytics** - Visual insights and statistics about your plant collection
- **Demo Mode** - Try the app with pre-populated demo data
- **Responsive Design** - Mobile-first design with botanical aesthetic and iOS safe area support
- **User Authentication** - Secure authentication with Clerk

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui, Fredoka font
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Clerk (with Organizations support)
- **Media Storage**: Vercel Blob
- **Analytics**: PostHog
- **UI Components**: Lucide icons, Recharts for analytics, dnd-kit for drag-and-drop
- **Deployment**: Vercel
- **Testing**: Vitest with React Testing Library

## Getting Started

### Prerequisites

- Bun (recommended) or Node.js 20+
- PostgreSQL database (Neon recommended)
- Clerk account with Organizations enabled
- Vercel Blob storage (optional, for media uploads)

### Installation

1. Clone the repository
```bash
git clone https://github.com/[username]/philodendron-joepii.git
cd philodendron-joepii
```

2. Install dependencies
```bash
bun install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- Database connection strings (Neon Postgres or local PostgreSQL)
- Clerk API keys (with Organizations enabled)
- Vercel Blob token (for media uploads)
- PostHog project key (optional for analytics)

4. Set up the database
```bash
# Push schema to database (requires .env.local)
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:push
```

**Note:** See `.claude/docs/DB-INFO.md` for detailed database commands and setup.

5. Start the development server
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

```bash
# Development
bun run dev          # Start development server with Turbopack
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint
bun run typecheck    # Run TypeScript compiler check
bun run validate     # Run type checking (alias for typecheck)

# Testing
bun run test         # Run tests with Vitest
bun run test:ui      # Run tests with Vitest UI
bun run test:run     # Run tests once (CI mode)

# Database commands (prefix with DB_POSTGRES_URL from .env.local)
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:push      # Push schema changes
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:generate  # Generate migrations
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:migrate   # Run migrations
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:studio    # Open Drizzle Studio
bun run migrate:species  # Migrate species data (run once after setup)
bun run sync:demo        # Sync demo user data

# Deployment
bun run predeploy    # Type check and build
bun run deploy       # Deploy to Vercel (requires configuration)
```

## Project Structure

```
philodendron-joepii/
├── app/                           # Next.js App Router
│   ├── (main)/                    # Protected routes
│   │   ├── dashboard/             # Main dashboard with kanban board
│   │   ├── plants/                # Plant CRUD pages
│   │   ├── chores/                # Chores/tasks management
│   │   ├── groups/                # Plant groups (Organizations)
│   │   └── profile/               # User profile (Clerk)
│   ├── api/                       # API routes
│   │   ├── webhooks/clerk/        # Clerk webhook handler
│   │   └── cron/send-notifications/  # Cron job for notifications
│   ├── sign-in/                   # Clerk sign in
│   ├── sign-up/                   # Clerk sign up
│   ├── settings/                  # Settings page
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── globals.css                # Global styles with botanical theme
├── components/                    # React components
│   ├── ui/                        # shadcn/ui components
│   ├── plant-groups/              # Plant groups components
│   ├── navigation/                # Navigation components (mobile tab bar)
│   └── [feature components]       # Task boards, kanban, media, etc.
├── lib/
│   ├── db/                        # Database
│   │   ├── schema.ts              # Drizzle schema with all tables
│   │   ├── index.ts               # Database client
│   │   ├── migrate-species.ts     # Species migration script
│   │   └── sync-demo.ts           # Demo data sync script
│   └── utils.ts                   # Utility functions
├── .claude/                       # Planning docs (gitignored)
│   ├── docs/
│   │   ├── .claude.md             # AI assistant instructions
│   │   ├── INIT_PLAN.md           # Implementation roadmap
│   │   ├── DB-INFO.md             # Database commands & learnings
│   │   └── PROJECT_STATUS.md      # Project status tracking
│   └── settings.local.json        # Claude Code settings
└── README.md                      # This file
```

## Database Schema

The application uses the following main tables:
- **users** - User accounts synced with Clerk
- **plants** - Plant profiles with detailed attributes and care requirements
- **care_tasks** - Recurring and one-time care tasks with recurrence patterns
- **task_completions** - Historical record of completed tasks
- **plant_media** - Photos and videos stored in Vercel Blob
- **plant_notes** - Markdown notes for plants
- **plant_links** - External resource links (TikTok, YouTube, articles)
- **notifications** - In-app notifications for tasks
- **user_notification_preferences** - Per-user notification settings (SMS/email)
- **plant_groups** - Shared plant collections (Clerk Organizations)
- **plant_group_members** - Group membership and roles

See `lib/db/schema.ts` for complete schema details.

## Environment Variables

See `.env.example` for required environment variables.

## Deployment

This project is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

## Key Features Explained

### Kanban Task Board
The dashboard features a drag-and-drop Kanban board that can be toggled between two views:
- **By Status**: Tasks organized by upcoming, due today, and overdue
- **By Type**: Tasks organized by care type (water, fertilize, mist, etc.)

### Plant Groups (Clerk Organizations)
Plant groups allow multiple users to collaborate on plant care:
- Create groups for households, roommates, or shared spaces
- Assign plants to specific group members
- Assign tasks to specific members
- Track who's responsible for what

### Smart Recurrence
Care tasks automatically recalculate their next due date when completed:
- Daily, weekly, monthly patterns supported
- Specific days of the week for weekly tasks
- Last care dates tracked on plant records

### Demo Mode
New users can explore the app with pre-populated demo data to see all features in action before creating their own plants.

## Contributing

This is a personal project. Contributions are not currently accepted.

## License

Private project - All rights reserved.

---

Built with 🌱 by McCoy
