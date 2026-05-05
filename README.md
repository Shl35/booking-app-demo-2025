# booking-app-demo-2025

## Backend: PostgreSQL + Prisma

The backend has been migrated from SQLite to PostgreSQL using Prisma ORM.

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Update `DATABASE_URL` in `backend/.env` with your PostgreSQL credentials.
3. Install backend dependencies:
   ```bash
   npm install
   ```
4. Start the local PostgreSQL container:
   ```bash
   cd backend
   docker compose up -d
   ```
5. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
6. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
7. Start the backend:
   ```bash
   npm run dev
   ```

### Notes

- Default `JWT_SECRET` is set in `.env`.
- The local PostgreSQL connection string in `.env` is a placeholder and must be updated to match your environment.
- The old `bookings.db` SQLite file has been removed.
