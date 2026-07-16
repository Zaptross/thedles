#!/bin/bash
set -e

# Get short commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)

# Clean and create build directory
rm -rf build
mkdir -p build/icons

# Copy static files
cp src/index.html build/
cp src/index.css build/
cp src/manifest.json build/
cp src/sw.js build/
cp src/icons/* build/icons/

# Copy index.js with commit hash replaced
sed "s/__COMMIT_HASH__/${COMMIT_HASH}/g" src/index.js > build/index.js

echo "Build complete: ${COMMIT_HASH}"
echo "Output: ./build/"
