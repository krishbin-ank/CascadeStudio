#!/bin/bash

set -euo pipefail

# Constants
TEMPLATE_FILE="/openhands/.cascade-studio/serve/cascade.conf.template"
OUTPUT_FILE="/etc/nginx/sites-available/cascade.conf"
SYMLINK_FILE="/etc/nginx/sites-enabled/cascade.conf"

# Ensure the script is run with root privileges
if [[ $EUID -ne 0 ]]; then
    echo "❌ This script must be run as root. Use 'sudo' to run it."
    exit 1
fi

# Check input
if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <port>"
    exit 1
fi

APP_PORT="$1"

# Check if the template file exists
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    echo "❌ Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Remove old output file if it exists
if [[ -f "$OUTPUT_FILE" ]]; then
    echo "ℹ️ Removing old configuration file: $OUTPUT_FILE"
    rm -f "$OUTPUT_FILE"
fi

# Replace the placeholder and write to output file
echo "ℹ️ Generating Nginx config from template..."
envsubst '${APP_PORT}' < "$TEMPLATE_FILE" > "$OUTPUT_FILE"

# Create symlink if it doesn't exist
if [[ ! -L "$SYMLINK_FILE" ]]; then
    echo "ℹ️ Creating symlink: $SYMLINK_FILE -> $OUTPUT_FILE"
    ln -s "$OUTPUT_FILE" "$SYMLINK_FILE"
fi

# Validate nginx configuration
echo "ℹ️ Validating Nginx configuration..."
nginx -t

# Reload nginx
echo "🔄 Reloading Nginx..."
nginx -s reload

echo "✅ Nginx reloaded with new port: $APP_PORT"
