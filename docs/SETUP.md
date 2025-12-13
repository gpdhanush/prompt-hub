# Setup Instructions

## Prerequisites
- Node.js 18+ installed
- MySQL 8.0+ installed and running
- Database created (see database/schema.sql)

## Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=admin_dashboard
DB_PORT=3306
PORT=3001
NODE_ENV=development
```

4. Set up the database:
```bash
# Run the schema file to create tables
mysql -u root -p admin_dashboard < ../database/schema.sql

# Optionally seed with sample data
mysql -u root -p admin_dashboard < ../database/seed.sql
```

5. Start the backend server:
```bash
npm run dev
```

The server will run on `http://localhost:3001`

## Frontend Setup

1. Install dependencies (if not already done):
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:3001/api
```

3. Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (or the port Vite assigns)

## Testing the Connection

1. Test the database connection:
   - Visit `http://localhost:3001/api/test-db` in your browser
   - Should return `{"status":"connected","data":[{"test":1}]}`

2. Test the API:
   - Visit `http://localhost:3001/api/users` to see users list
   - Use Postman collection in `postman/` folder for full API testing

## Notes

- The backend server must be running for the frontend to work properly
- Make sure MySQL is running before starting the backend
- All CRUD operations are now connected to the database
- The Users module has been fully updated to use the API
- Other modules can be updated similarly using the API service layer in `src/lib/api.ts`
