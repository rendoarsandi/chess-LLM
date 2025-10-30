#!/bin/bash
# Build script for Cloudflare Worker fullstack deployment

set -e

echo "Building Next.js application for Cloudflare Workers..."
npm run build:worker

echo "Build completed successfully!"
echo "Output directory: .vercel/output/static"
