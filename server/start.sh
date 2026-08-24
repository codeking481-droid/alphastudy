#!/bin/bash
# Alpha Study — Server Startup Script
# Run this on the production server after deploying

set -e

echo "🚀 Starting Alpha Study server..."

# Check for required env vars
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set. Create server/.env with your database connection string."
  exit 1
fi

# Run migrations if the migrations directory exists
if [ -d "dist/db/migrations" ] || [ -d "src/db/migrations" ]; then
  echo "🔄 Running database migrations..."
  npx tsx src/db/migrate.ts 2>/dev/null || echo "⚠️  Migrations skipped (may already be applied)"
fi

# Start the server
echo "🌐 Starting API server..."
exec node dist/index.js
