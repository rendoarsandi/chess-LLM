#!/bin/bash
# Build script for Cloudflare Pages deployment

set -e

echo "Building Next.js application..."
npm run build

echo "Build completed successfully!"
