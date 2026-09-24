# ShopSphere

ShopSphere is a full-stack E-Commerce Management System built with React, Node.js, Express.js, and MySQL.

## Tech Stack

* Frontend: React, Vite, JavaScript
* Backend: Node.js, Express.js
* Database: MySQL with `mysql2/promise`
* Database management: XAMPP
* API testing: Postman
* Authentication: JWT
* Password hashing: bcryptjs

## Features

* User registration and login
* JWT authentication
* Customer and admin roles
* Product and category management
* Product search
* Shopping cart
* Checkout and order creation
* Customer order history
* Admin order management
* Order status updates
* MySQL database integration
* Responsive React frontend

## Project Structure

```text
ShopSphere/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── database/
│   └── schema.sql
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Basic Setup

1. Install Node.js and XAMPP with MySQL.
2. Start MySQL from the XAMPP Control Panel.
3. Run `database/schema.sql` using phpMyAdmin or another MySQL client.
4. Copy `backend/.env.example` to `backend/.env`.
5. Update the database configuration if required.
6. Install backend dependencies:

```bash
cd backend
npm install
```

7. Install frontend dependencies:

```bash
cd frontend
npm install
```

## Start Backend

```bash
cd backend
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

Check:

```text
GET http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Start Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

The frontend URL will be shown in the Vite terminal output.

## MySQL/XAMPP Requirement

MySQL must be running through XAMPP before using database features.

The database name used by the current project is:

```text
shopsphere
```

## API Overview

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
```

### Products

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Categories

```text
GET    /api/categories
GET    /api/categories/:id
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

### Cart

```text
GET    /api/cart
POST   /api/cart
PUT    /api/cart/:id
DELETE /api/cart/:id
DELETE /api/cart
```

### Orders

```text
POST /api/orders
GET  /api/orders
GET  /api/orders/:id
PUT  /api/orders/:id/status
```

The order status update endpoint is restricted to admin users.

## Build Frontend

```bash
cd frontend
npm run build
```

## Security

* Passwords are stored using bcrypt hashing.
* JWT authentication protects private endpoints.
* Admin-only operations use role-based authorization.
* Environment variables are excluded from Git using `.gitignore`.

## Author

Vishwanath Ballolli
