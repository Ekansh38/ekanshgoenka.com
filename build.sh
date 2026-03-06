#!/bin/bash

HUGO_VERSION=0.157.0

# Download and install Hugo extended
curl -L "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz" | tar -xz

# Build
./hugo --gc --minify --baseURL "https://${VERCEL_PROJECT_PRODUCTION_URL}"
