#!/bin/bash

# Script to setup PostgreSQL database for GrowUp
# This script creates the database if it doesn't exist

set -e

echo "🔧 Setting up PostgreSQL database..."

# Database configuration from .env
DB_NAME="growup"
DB_USER="postgres"
DB_PASSWORD="root123"
CONTAINER_NAME="postgresql"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ PostgreSQL container is not running!"
    echo "Please start the container with: docker compose up -d"
    exit 1
fi

# Check if database exists
DB_EXISTS=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "📦 Creating database '$DB_NAME'..."
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
        echo "❌ Failed to create database"
        exit 1
    }
    echo "✅ Database '$DB_NAME' created successfully"
fi

# Run migrations if schema file exists
if [ -f "database/postgresql/schema.sql" ]; then
    echo "🔄 Running database schema..."
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < database/postgresql/schema.sql
    echo "✅ Schema applied successfully"
fi

# Run migrations
if [ -d "database/postgresql/migrations" ]; then
    echo "🔄 Running migrations..."
    for migration in database/postgresql/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "  Applying $(basename "$migration")..."
            docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$migration"
        fi
    done
    echo "✅ Migrations completed"
fi

echo ""
echo "🎉 PostgreSQL setup completed!"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: localhost"
echo "Port: 5432"
