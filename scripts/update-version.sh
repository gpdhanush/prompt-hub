#!/bin/bash

# Script to update version in .env file
# Usage: ./scripts/update-version.sh [version]
# Example: ./scripts/update-version.sh 1.2.3

# Get version from argument or prompt
VERSION=${1:-""}

if [ -z "$VERSION" ]; then
    echo "Usage: ./scripts/update-version.sh [version]"
    echo "Example: ./scripts/update-version.sh 1.2.3"
    exit 1
fi

# Validate version format (basic check)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    echo "Error: Invalid version format. Use semantic versioning (e.g., 1.2.3 or 1.2.3-beta)"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found"
    exit 1
fi

# Update or add VITE_APP_VERSION in .env file
if grep -q "^VITE_APP_VERSION=" .env; then
    # Update existing version
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/^VITE_APP_VERSION=.*/VITE_APP_VERSION=$VERSION/" .env
    else
        # Linux
        sed -i "s/^VITE_APP_VERSION=.*/VITE_APP_VERSION=$VERSION/" .env
    fi
    echo "✅ Updated VITE_APP_VERSION to $VERSION in .env"
else
    # Add new version line
    echo "" >> .env
    echo "VITE_APP_VERSION=$VERSION" >> .env
    echo "✅ Added VITE_APP_VERSION=$VERSION to .env"
fi

echo "Version updated successfully!"
