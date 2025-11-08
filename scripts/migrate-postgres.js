#!/usr/bin/env node

// PostgreSQL Migration Script
const fs = require('fs');
const path = require('path');
const { db } = require('../shared/database/postgresql');

async function runMigrations() {
  console.log('Starting PostgreSQL migrations...');
  
  try {
    await db.connect();
    
    // Create migrations table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of executed migrations
    const executedResult = await db.query('SELECT filename FROM migrations ORDER BY id');
    const executedMigrations = executedResult.rows.map(row => row.filename);
    
    // Read migration files
    const migrationsDir = path.join(__dirname, '../database/postgresql/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    for (const filename of migrationFiles) {
      if (executedMigrations.includes(filename)) {
        console.log(`Skipping already executed migration: ${filename}`);
        continue;
      }
      
      console.log(`Executing migration: ${filename}`);
      
      const migrationPath = path.join(migrationsDir, filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await db.runMigration(migrationSQL);
        
        // Record successful migration
        await db.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        
        console.log(`✓ Migration ${filename} executed successfully`);
      } catch (error) {
        console.error(`✗ Migration ${filename} failed:`, error.message);
        throw error;
      }
    }
    
    console.log('All PostgreSQL migrations completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };