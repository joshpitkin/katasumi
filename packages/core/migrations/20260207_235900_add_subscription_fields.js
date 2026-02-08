/**
 * Migration: Add subscription_status and subscription_expires_at to users table
 * Created: 2026-02-07
 */

exports.up = async function up(db, dbType = 'sqlite') {
  const isPostgres = dbType === 'postgres';
  
  if (isPostgres) {
    // Check if users table exists
    const tableExists = await db.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableExists && tableExists[0]?.exists) {
      // Add subscription_status column if it doesn't exist
      try {
        await db.$executeRawUnsafe(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free'
        `);
        console.log('Added subscription_status column');
      } catch (e) {
        console.log('subscription_status column may already exist:', e.message);
      }
      
      // Add subscription_expires_at column if it doesn't exist
      try {
        await db.$executeRawUnsafe(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP
        `);
        console.log('Added subscription_expires_at column');
      } catch (e) {
        console.log('subscription_expires_at column may already exist:', e.message);
      }
      
      // Create index on subscription_status
      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_users_subscription_status 
        ON users(subscription_status)
      `);
      console.log('Created index on subscription_status');
    } else {
      console.log('Users table does not exist yet, skipping migration');
    }
  } else {
    // SQLite doesn't have users table in core
    console.log('SQLite: Users table not in core schema, skipping migration');
  }
};

exports.down = async function down(db, dbType = 'sqlite') {
  const isPostgres = dbType === 'postgres';
  
  if (isPostgres) {
    // Check if users table exists
    const tableExists = await db.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableExists && tableExists[0]?.exists) {
      await db.$executeRawUnsafe(`DROP INDEX IF EXISTS idx_users_subscription_status`);
      await db.$executeRawUnsafe(`ALTER TABLE users DROP COLUMN IF EXISTS subscription_expires_at`);
      await db.$executeRawUnsafe(`ALTER TABLE users DROP COLUMN IF EXISTS subscription_status`);
      console.log('Removed subscription fields and index');
    }
  }
};
