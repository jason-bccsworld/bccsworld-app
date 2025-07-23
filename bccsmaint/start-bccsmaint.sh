#!/bin/bash

echo "🚀 Starting BCCSMaint - AI-Powered Predictive Maintenance Platform"
echo "=================================================================="

# Change to BCCSMaint directory
cd bccsmaint

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment variable for OpenAI
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"

# Start the development server
echo "🔧 Starting BCCSMaint server on port 3000..."
echo "📊 Dashboard: http://localhost:3000"
echo "🤖 AI-Powered Predictive Maintenance Intelligence Active"
echo ""

npm run dev