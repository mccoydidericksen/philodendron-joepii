# Philodendron Joepii 🌱

A modern houseplant care tracking application with intelligent recurring task management.

## Features

- **Plant Management** - Track all your houseplants with photos, care schedules, and notes
- **Smart Scheduling** - Recurring care tasks (watering, fertilizing, repotting) with automatic recalculation
- **Task Filtering** - View all tasks, pending tasks, or completed tasks with visual status indicators
- **Responsive Design** - Mobile-first design with botanical aesthetic
- **User Authentication** - Secure authentication with Clerk

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **Analytics**: PostHog
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Bun (recommended) or Node.js 20+
- PostgreSQL database
- Clerk account for authentication

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
- Database connection strings (Vercel Postgres or local PostgreSQL)
- Clerk API keys
- PostHog project key (optional)

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
bun run dev          # Start development server with Turbopack
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint
bun run typecheck    # Run TypeScript compiler check

# Database commands (prefix with DB_POSTGRES_URL from .env.local)
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:push      # Push schema changes
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:generate  # Generate migrations
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:migrate   # Run migrations
DB_POSTGRES_URL="$(grep DB_POSTGRES_URL= .env.local | cut -d '=' -f2 | tr -d '\"')" bun run db:studio    # Open Drizzle Studio
```

## Project Structure

```
philodendron-joepii/
├── app/                    # Next.js App Router pages and layouts
├── components/             # React components
├── lib/
│   └── db/                 # Database schema, client, and types
├── .claude/                # Planning docs (gitignored)
│   ├── docs/
│   │   ├── .claude.md      # AI assistant instructions
│   │   ├── INIT_PLAN.md    # Implementation roadmap
│   │   ├── DB-INFO.md      # Database commands & learnings
│   │   ├── PROJECT_STATUS.md
│   │   └── DATABASE_SETUP.md
│   └── settings.local.json # Claude Code settings
└── README.md               # This file
```

## Environment Variables

See `.env.example` for required environment variables.

## Deployment

This project is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

## Contributing

This is a take-home project for a job application. Contributions are not currently accepted.

## License

Private project - All rights reserved.

---

Built with 🌱 by McCoy
