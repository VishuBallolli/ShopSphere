# ShopSphere

ShopSphere is an E-Commerce Management System.

## Tech Stack

- Frontend: React, Vite, JavaScript
- Backend: Node.js, Express.js
- Database: MySQL with `mysql2/promise`
- Database management: XAMPP
- API testing: Postman

## Basic Setup

1. Install Node.js and XAMPP with MySQL.
2. Start MySQL from the XAMPP Control Panel.
3. Run the statement in `database/schema.sql` using a MySQL client.
4. Copy `backend/.env.example` to `backend/.env` and update the database values if needed.
5. Install dependencies in both `backend` and `frontend`.

## Start Backend

```bash
cd backend
npm run dev
```

The backend runs on `http://localhost:5000` by default. Check `GET /api/health` to verify it is running.

## Start Frontend

```bash
cd frontend
npm run dev
```

The frontend URL is shown in the Vite terminal output.

## MySQL/XAMPP Requirement

MySQL must be running through XAMPP before using database features. The current setup only creates the database connection pool and health endpoint.