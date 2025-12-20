# My Progress

A personal productivity and task tracking application with time logging capabilities. Built for freelancers and professionals who need to manage multiple tasks across different projects and companies.

## Features

### 📋 Task Management
- Create and track tasks with detailed information
- Task statuses: In Progress, Paused, Resumed, Completed, Cancelled
- Add progress notes and todo lists for each task
- Associate tasks with specific projects and companies
- View task history and activity

### ⏱️ Time Tracking
- Automatic time logging when working on tasks
- Track start and end timestamps for each work session
- Calculate total elapsed time per task
- View time logs and work patterns

### 🔐 User Authentication
- Secure user registration and login
- JWT-based authentication
- Password hashing for security
- Protected routes and user sessions

### 📝 Rich Text Editor
- Powered by Lexical editor
- Format progress notes and task descriptions
- Support for lists, links, tables, and code blocks

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) with App Router
- **UI Library:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI primitives
- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **Forms:** React Hook Form with Zod validation
- **Server Actions:** Next Safe Action
- **Authentication:** JWT (jsonwebtoken)
- **Icons:** Lucide React

## Prerequisites

Before running this project, make sure you have:

- **Node.js** 20.x or later
- **pnpm** 10.26.1 or later
- **Docker** and **Docker Compose** (for PostgreSQL)
- **Git**

## Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd my-progress
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Set up environment variables:**

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=my_progress
DB_PORT=5432

# Database URL for Prisma
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}

# JWT Secret (generate a secure random string)
JWT_SECRET=your_jwt_secret_key_here

# Application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. **Start PostgreSQL with Docker:**
```bash
docker-compose up -d
```

5. **Run database migrations:**
```bash
pnpm prisma migrate dev
```

6. **Generate Prisma Client:**
```bash
pnpm prisma generate
```

## Running the Project

### Development Mode

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

### Other Commands

```bash
# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type checking
pnpm typecheck

# Format code
pnpm format:write

# Check formatting
pnpm format:check

# Open Prisma Studio (database GUI)
pnpx prisma studio
```

## Database Management

### View Database
```bash
pnpx prisma studio
```

### Reset Database
```bash
pnpm prisma migrate reset
```

### Create New Migration
```bash
pnpm prisma migrate dev --name migration_name
```

## Project Structure

```
├── prisma/              # Database schema and migrations
├── src/
│   ├── actions/         # Server actions
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   ├── contexts/        # React contexts
│   ├── lib/             # Utility libraries
│   ├── schema/          # Zod validation schemas
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── public/              # Static assets
└── generated/           # Generated Prisma client
```

## Database Schema

### User
- ID, email, password (hashed)
- Name, current project, current company
- Timestamps

### Task
- ID, title, status
- Progress notes, todo list
- Project and company associations
- Timestamps
- Relation to User

### TaskTime
- ID, start time (from), end time (to)
- Relation to Task

## Contributing

Feel free to submit issues and enhancement requests!

## License

Private project - All rights reserved
