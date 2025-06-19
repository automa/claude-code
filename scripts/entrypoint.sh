#!/bin/bash
set -e

# Setup GCP credentials
if [ -n "$GOOGLE_CREDENTIALS" ]; then
    echo "Setting up GCP credentials..."

    # Create the default gcloud config directory
    mkdir -p ~/.config/gcloud

    # Write credentials to the default path that libraries auto-discover
    echo "$GOOGLE_CREDENTIALS" > ~/.config/gcloud/application_default_credentials.json

    echo "GCP authentication configured successfully"
else
    echo "Warning: GOOGLE_CREDENTIALS environment variable not set"
fi

# Start the Node.js application
exec node build/index.js
