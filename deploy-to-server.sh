#!/bin/bash

# Deployment Script for Vite SPA to Server
# Usage: ./deploy-to-server.sh [server-user] [server-host] [server-path]

set -e

echo "🚀 Starting deployment process..."

# Build the project
echo "📦 Building project..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found. Build failed?"
    exit 1
fi

echo "✅ Build completed successfully"

# Copy .htaccess to dist if it exists
if [ -f ".htaccess" ]; then
    echo "📋 Copying .htaccess to dist..."
    cp .htaccess dist/
fi

# Check if server details provided
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo ""
    echo "📁 Build files are ready in the 'dist' folder"
    echo ""
    echo "To deploy manually:"
    echo "1. Upload the contents of the 'dist' folder to your web server"
    echo "2. Make sure .htaccess is in the web root (for Apache)"
    echo "3. Ensure proper file permissions (755 for directories, 644 for files)"
    echo ""
    echo "Or use this script with server details:"
    echo "  ./deploy-to-server.sh user@host /var/www/html"
    echo ""
    exit 0
fi

SERVER_USER=$1
SERVER_HOST=$2
SERVER_PATH=$3

echo "📤 Uploading files to server..."
echo "   Server: $SERVER_USER@$SERVER_HOST"
echo "   Path: $SERVER_PATH"

# Upload files using rsync (recommended)
if command -v rsync &> /dev/null; then
    echo "Using rsync..."
    rsync -avz --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        dist/ \
        $SERVER_USER@$SERVER_HOST:$SERVER_PATH/
    
    echo ""
    echo "🔧 Setting file permissions on server..."
    ssh $SERVER_USER@$SERVER_HOST "chmod -R 755 $SERVER_PATH && find $SERVER_PATH -type f -exec chmod 644 {} \;"
    
    echo ""
    echo "✅ Deployment completed successfully!"
    echo "🌐 Your app should be available at: https://gp.prasowlabs.in"
else
    echo "❌ rsync not found. Please install rsync or upload files manually."
    exit 1
fi
