#!/bin/bash
# Git backup script for cockpit-timeshift-dev
# Runs before any git operation that could affect history

set -euo pipefail

BACKUP_DIR="/usr/share/cockpit/timeshift-backups"
REPO_DIR="/usr/share/cockpit/timeshift-dev"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="timeshift-dev-backup-${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"

echo "=== Git Backup Started: ${TIMESTAMP} ==="

# 1. Backup the dev repository
echo "Backing up repository..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
  -C "${REPO_DIR}" \
  --exclude='.git/objects/pack/*.pack' \
  --exclude='.git/objects/pack/*.idx' \
  .

# 2. Backup the stable installation (critical - never lose this)
echo "Backing up stable installation..."
sudo tar -czf "${BACKUP_DIR}/stable-backup-${TIMESTAMP}.tar.gz" \
  -C /usr/share/cockpit \
  timeshift/

# 3. Keep only last 10 backups to save space
echo "Cleaning old backups (keeping last 10)..."
ls -1t "${BACKUP_DIR}"/timeshift-dev-backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
ls -1t "${BACKUP_DIR}"/stable-backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

echo "=== Git Backup Completed: ${TIMESTAMP} ==="
echo "Backup saved to: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Stable backup saved to: ${BACKUP_DIR}/stable-backup-${TIMESTAMP}.tar.gz"