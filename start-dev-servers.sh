#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║         🚀 Rule8 Development Server Startup Script                    ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Kill existing processes
echo "🛑 Stopping existing processes..."
killall node 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "npx convex" 2>/dev/null
sleep 3

# Go to project directory
cd /Users/tejas.dumbre/opsy/Rule8

# Start Convex dev server in a new terminal
echo ""
echo "✅ Starting Convex Dev Server..."
echo ""
echo "   Open a NEW TERMINAL and run:"
echo "   $ cd /Users/tejas.dumbre/opsy/Rule8"
echo "   $ npx convex dev"
echo ""
echo "   Wait for it to show: ✔ Pushed 2 actions"
echo ""
echo "   Then in ANOTHER terminal, run:"
echo "   $ cd /Users/tejas.dumbre/opsy/Rule8"
echo "   $ npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Both servers must run together for full functionality!"
echo ""
echo "Dashboard: http://localhost:3002/dashboard"
echo "Convex sync: Automatic when files change"
echo ""
