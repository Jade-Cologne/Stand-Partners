#!/usr/bin/env bash
# Pull production database from Railway and restore it locally.
# Usage: ./pull-prod-db.sh "postgresql://user:pass@host:port/dbname"
# Get the connection string from Railway dashboard → your PostgreSQL service → Connect.

set -e

LOCAL="postgresql://standpartners:standpartners@localhost:5432/standpartners"

if [ -z "$1" ]; then
  echo "Usage: ./pull-prod-db.sh \"<railway-connection-string>\""
  echo ""
  echo "Get the connection string from:"
  echo "  Railway dashboard → your PostgreSQL service → Connect → Connection URL"
  exit 1
fi

PROD_URL="$1"
DUMP_FILE="/tmp/standpartners-prod.dump"

echo "Dumping production database..."
/usr/lib/postgresql/18/bin/pg_dump --format=custom --no-acl --no-owner "$PROD_URL" > "$DUMP_FILE"

echo "Dropping and recreating local database..."
psql "$LOCAL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null

echo "Restoring to local database..."
/usr/lib/postgresql/18/bin/pg_restore --no-acl --no-owner --dbname "$LOCAL" "$DUMP_FILE"

rm "$DUMP_FILE"

echo ""
echo "Done. Local database now mirrors production."
