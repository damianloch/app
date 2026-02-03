#!/bin/bash

# Test script for Product Recommendations API

BASE_URL="${1:-http://localhost:8080}"

echo "Testing Product Recommendations API"
echo "Base URL: $BASE_URL"
echo "===================================="
echo

# Test health endpoint
echo "1. Testing health check..."
curl -s "$BASE_URL/health" | jq '.'
echo
echo

# Test get all products
echo "2. Getting all products..."
curl -s "$BASE_URL/api/products" | jq '.products[0:3]'
echo
echo

# Test get product by ID
echo "3. Getting product by ID (1)..."
curl -s "$BASE_URL/api/products/1" | jq '.'
echo
echo

# Test search
echo "4. Searching for 'wireless'..."
curl -s -X POST "$BASE_URL/api/products/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"wireless"}' | jq '.'
echo
echo

# Test recommendations for multiple users
echo "5. Getting recommendations for user-1..."
curl -s "$BASE_URL/api/recommendations/user-1" | jq '.'
echo
echo

echo "6. Getting recommendations for user-2..."
curl -s "$BASE_URL/api/recommendations/user-2" | jq '.'
echo
echo

# Track product view
echo "7. Tracking product view (user-1, product-5)..."
curl -s -X POST "$BASE_URL/api/recommendations/track/user-1/5" | jq '.'
echo
echo

# Get cache info
echo "8. Getting cache statistics..."
curl -s "$BASE_URL/api/recommendations/debug/cache-info" | jq '.'
echo
echo

echo "===================================="
echo "Tests complete!"
echo
echo "To generate load, run:"
echo "  for i in {1..100}; do"
echo "    curl -s $BASE_URL/api/recommendations/user-\$((i % 20)) > /dev/null"
echo "    curl -s $BASE_URL/api/products/\$((i % 30)) > /dev/null"
echo "  done"
