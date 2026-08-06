ReBook
A complete full-stack book marketplace built with PostgreSQL, FastAPI, and React. This project emphasizes heavy use of PostgreSQL for business logic, utilizing row-level security (RLS), triggers, domains, and stored procedures.

Startup Instructions
The application runs locally. You will need three separate terminal windows to run the database setup (if needed), the backend API, and the frontend server.

1. Database Setup
If you need to initialize or reset the database with the schema and seed data, run the following from the root directory:

# 1. Create the database
psql -U $(whoami) -d postgres -c "DROP DATABASE IF EXISTS rebook; CREATE DATABASE rebook;"

# 2. Run all migrations in order
for f in db/migrations/*.sql; do psql -U $(whoami) -d rebook -f "$f"; done

# 3. Load the seed data (demo accounts and listings)
psql -U $(whoami) -d rebook -f db/seeds/seed_data.sql
2. Start the FastAPI Backend
Open a terminal, navigate to the backend directory, activate the virtual environment, and start the server:

cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
API URL: http://localhost:8000
Interactive Docs: http://localhost:8000/docs
3. Start the React Frontend
Open a new terminal, navigate to the frontend directory, and start the Vite dev server:

cd frontend
npm run dev
Frontend URL: http://localhost:5173
Demo Accounts
All seed users share the same password: password123.

Admin: admin@rebook.com
Seller: alice@seller.com (Verified) | carol@seller.com (Unverified)
Buyer: dave@buyer.com