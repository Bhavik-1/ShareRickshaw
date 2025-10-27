-- Migration: Add roles and profile features
-- Run this migration to add user roles, autowala details, and emergency contacts

-- Step 1: Add new columns to users table
ALTER TABLE users
ADD COLUMN role ENUM('admin', 'user', 'autowala') DEFAULT 'user' NOT NULL AFTER email,
ADD COLUMN phone_number VARCHAR(15) AFTER role,
ADD COLUMN full_name VARCHAR(100) AFTER phone_number;

-- Step 2: Update existing users to be admins
UPDATE users SET role = 'admin' WHERE 1=1;

-- Step 3: Create autowala_details table
CREATE TABLE IF NOT EXISTS autowala_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  driver_name VARCHAR(100) NOT NULL,
  operating_location VARCHAR(100),
  driver_phone VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_autowala_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  contact_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(15) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_emergency_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
