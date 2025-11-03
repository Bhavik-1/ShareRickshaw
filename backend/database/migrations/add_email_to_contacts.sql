-- Migration: Add email field to emergency_contacts table
-- Purpose: Add contact_email column to support email notifications for SOS alerts
-- Date: 2025-11-03

-- Check if column exists before adding (for safety)
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_name = 'emergency_contacts'
    AND column_name = 'contact_email'
    AND table_schema = DATABASE()
);

-- Add column only if it doesn't exist
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE emergency_contacts ADD COLUMN contact_email VARCHAR(255) AFTER contact_phone',
    'SELECT "Column contact_email already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on email field for faster lookups (only if index doesn't exist)
SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_name = 'emergency_contacts'
    AND index_name = 'idx_contact_email'
    AND table_schema = DATABASE()
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE emergency_contacts ADD INDEX idx_contact_email (contact_email)',
    'SELECT "Index idx_contact_email already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Set existing records to have NULL email (they're already NULL by default)
UPDATE emergency_contacts SET contact_email = NULL WHERE contact_email IS NULL;

-- Output migration completion
SELECT 'Migration completed: Added contact_email field to emergency_contacts table' AS migration_status;