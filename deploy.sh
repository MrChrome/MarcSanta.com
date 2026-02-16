#!/bin/bash
set -e

BUCKET="s3://marcsanta.com"
DISTRIBUTION_ID="EX7GL9GU0WVAX"
REGION="us-east-1"

echo "Uploading files to S3..."
aws s3 sync . "$BUCKET" \
  --region "$REGION" \
  --exclude ".git/*" \
  --exclude ".claude/*" \
  --exclude "deploy.sh" \
  --exclude "*.zip"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --region "$REGION" \
  --query "Invalidation.Id" \
  --output text

echo "Deploy complete!"
