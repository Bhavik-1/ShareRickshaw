-- Mumbai Share Auto Database Schema

-- Create database (run manually if needed)
-- CREATE DATABASE IF NOT EXISTS mumbai_share_auto;
-- USE mumbai_share_auto;

-- Table: users
-- Purpose: Store admin user accounts for authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: stands
-- Purpose: Store share auto stand locations and details
CREATE TABLE IF NOT EXISTS stands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  operating_hours VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints for Mumbai coordinates
  CHECK (latitude BETWEEN 18.8 AND 19.3),
  CHECK (longitude BETWEEN 72.7 AND 73.0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: routes
-- Purpose: Store route information for each stand
CREATE TABLE IF NOT EXISTS routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stand_id INT NOT NULL,
  destination VARCHAR(100) NOT NULL,
  fare DECIMAL(6,2) NOT NULL,
  travel_time VARCHAR(20) NOT NULL,
  destination_lat DECIMAL(10,8) NOT NULL,
  destination_lng DECIMAL(11,8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign key constraint
  CONSTRAINT fk_stand
    FOREIGN KEY (stand_id)
    REFERENCES stands(id)
    ON DELETE CASCADE,

  -- Index for faster lookups
  INDEX idx_stand_id (stand_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
