#!/bin/bash
# ─── Smart Healthcare — Quick Start Script ───────────────────────
set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║    Smart Healthcare Management System            ║"
echo "║    Quick Start Script                            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Check required tools
command -v java  >/dev/null 2>&1 || { echo "❌ Java 17+ required. Install from https://adoptium.net"; exit 1; }
command -v mvn   >/dev/null 2>&1 || { echo "❌ Maven required. Install from https://maven.apache.org"; exit 1; }
command -v node  >/dev/null 2>&1 || { echo "❌ Node.js 18+ required. Install from https://nodejs.org"; exit 1; }
command -v mysql >/dev/null 2>&1 || { echo "❌ MySQL required. Install MySQL 8.0+"; exit 1; }

echo "✅ All tools detected"
echo ""

# Database setup
read -p "MySQL root password: " -s DB_PASS
echo ""
echo "📦 Setting up database..."
mysql -u root -p"$DB_PASS" < schema.sql
echo "✅ Database ready"

# Export env variables
export DB_USERNAME=root
export DB_PASSWORD="$DB_PASS"
export NOTIFICATION_MODE=dev
export JWT_SECRET="LocalDevSecretKeyThatIsAtLeast256BitsLongForSecurity!"

read -p "Gemini API key (press Enter to skip AI): " GEMINI_KEY
if [ -n "$GEMINI_KEY" ]; then
  export GEMINI_API_KEY="$GEMINI_KEY"
  echo "✅ Gemini AI enabled"
else
  export GEMINI_API_KEY="no-key"
  echo "⚠️  Gemini key skipped — keyword fallback will be used"
fi

read -p "Razorpay Key ID (press Enter to skip): " RAZ_KEY
if [ -n "$RAZ_KEY" ]; then
  export RAZORPAY_KEY_ID="$RAZ_KEY"
  read -p "Razorpay Key Secret: " RAZ_SECRET
  export RAZORPAY_KEY_SECRET="$RAZ_SECRET"
  echo "✅ Razorpay enabled"
else
  export RAZORPAY_KEY_ID="rzp_test_placeholder"
  export RAZORPAY_KEY_SECRET="placeholder"
  echo "⚠️  Razorpay skipped — payment flows will be mocked"
fi

# Start backend in background
echo ""
echo "🚀 Starting Spring Boot backend on port 8081..."
cd backend
mvn spring-boot:run -q &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
  if curl -s http://localhost:8081/actuator/health | grep -q '"status":"UP"' 2>/dev/null; then
    break
  fi
  sleep 2
done
echo "✅ Backend ready!"

# Start frontend
echo ""
echo "🎨 Installing frontend dependencies..."
cd frontend
npm install --silent
echo ""
echo "🚀 Starting React frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Smart Healthcare is running!                    ║"
echo "║                                                      ║"
echo "║  🌐 Frontend:  http://localhost:5173                 ║"
echo "║  🔧 Backend:   http://localhost:8081                 ║"
echo "║  📖 Swagger:   http://localhost:8081/swagger-ui.html ║"
echo "║                                                      ║"
echo "║  Demo accounts (password: password123)               ║"
echo "║    Admin:   admin@healthcare.com                     ║"
echo "║    Doctor:  doctor@demo.com                          ║"
echo "║    Patient: patient@demo.com                         ║"
echo "║                                                      ║"
echo "║  Press Ctrl+C to stop all services                  ║"
echo "╚══════════════════════════════════════════════════════╝"

# Cleanup on exit
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
