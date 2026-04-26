#!/usr/bin/env bash
echo "🚀 Starting Deployment..."
git pull
npm install
npm run build
sudo systemctl restart life-manager
echo "✅ App updated successfully!"