# Database Migration Instructions

## Issue
The database doesn't have the new `destination_lat` and `destination_lng` columns yet.

## Solution
Run the migration script to add these columns and populate coordinate data.

---

## Option 1: Using MySQL Command Line

```bash
# Navigate to the backend/database directory
cd backend/database

# Run the migration script
mysql -u root -p < migration_add_coordinates.sql
```

---

## Option 2: Using MySQL Workbench / phpMyAdmin

1. Open your MySQL client (Workbench, phpMyAdmin, etc.)
2. Connect to your database
3. Open the file `backend/database/migration_add_coordinates.sql`
4. Execute the entire script

---

## Option 3: Using Node.js Script

If your backend is running, you can create a quick migration script:

```javascript
// backend/migrate.js
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'database', 'migration_add_coordinates.sql'),
      'utf8'
    );

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

Then run:
```bash
node backend/migrate.js
```

---

## Verification

After running the migration, verify it worked:

```sql
-- Check if columns exist
DESCRIBE routes;

-- Check if data was populated
SELECT destination, destination_lat, destination_lng FROM routes LIMIT 5;

-- Count routes with coordinates
SELECT COUNT(*) FROM routes WHERE destination_lat IS NOT NULL;
-- Should return: 32
```

---

## Alternative: Fresh Database Setup

If you prefer to start fresh:

```bash
# Drop and recreate database
mysql -u root -p -e "DROP DATABASE IF EXISTS mumbai_share_auto; CREATE DATABASE mumbai_share_auto;"

# Run schema (already has new columns)
mysql -u root -p mumbai_share_auto < backend/database/schema.sql

# Run seed data (already has coordinates)
mysql -u root -p mumbai_share_auto < backend/database/seed.sql
```

---

## After Migration

1. Restart your backend server
2. Refresh the route-finder.html page
3. The "Failed to load stands" error should be gone
4. Select a stand and search for a destination to test

---

## Troubleshooting

**Error: "Table 'routes' doesn't exist"**
- Your database needs to be created first
- Run schema.sql before the migration

**Error: "Database 'mumbai_share_auto' doesn't exist"**
- Create the database first:
  ```sql
  CREATE DATABASE mumbai_share_auto;
  ```

**Still getting "Unknown column" error?**
- Make sure you ran the migration on the correct database
- Check with: `USE mumbai_share_auto; DESCRIBE routes;`
- Restart your Node.js backend after migration
