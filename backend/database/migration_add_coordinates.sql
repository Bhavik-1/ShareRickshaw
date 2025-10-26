-- Migration: Add destination coordinates to routes table
-- Run this script to update existing database

USE mumbai_share_auto;

-- Add new columns to routes table
ALTER TABLE routes
ADD COLUMN destination_lat DECIMAL(10,8),
ADD COLUMN destination_lng DECIMAL(11,8);

-- Update existing routes with coordinate data
-- Stand 1: Bandra Station West
UPDATE routes SET destination_lat = 19.05960000, destination_lng = 72.82950000 WHERE stand_id = 1 AND destination = 'Linking Road';
UPDATE routes SET destination_lat = 19.04500000, destination_lng = 72.82200000 WHERE stand_id = 1 AND destination = 'Bandra Reclamation';
UPDATE routes SET destination_lat = 19.06300000, destination_lng = 72.82900000 WHERE stand_id = 1 AND destination = 'Pali Hill';

-- Stand 2: Andheri Station East
UPDATE routes SET destination_lat = 19.12030000, destination_lng = 72.86800000 WHERE stand_id = 2 AND destination = 'MIDC';
UPDATE routes SET destination_lat = 19.11000000, destination_lng = 72.87000000 WHERE stand_id = 2 AND destination = 'Marol Naka';
UPDATE routes SET destination_lat = 19.11500000, destination_lng = 72.86000000 WHERE stand_id = 2 AND destination = 'Chakala';

-- Stand 3: Dadar TT
UPDATE routes SET destination_lat = 19.03000000, destination_lng = 72.83700000 WHERE stand_id = 3 AND destination = 'Shivaji Park';
UPDATE routes SET destination_lat = 19.01300000, destination_lng = 72.84000000 WHERE stand_id = 3 AND destination = 'Parel';
UPDATE routes SET destination_lat = 19.04100000, destination_lng = 72.84100000 WHERE stand_id = 3 AND destination = 'Mahim';
UPDATE routes SET destination_lat = 19.01700000, destination_lng = 72.85800000 WHERE stand_id = 3 AND destination = 'Wadala';

-- Stand 4: Kurla Station West
UPDATE routes SET destination_lat = 19.07100000, destination_lng = 72.88200000 WHERE stand_id = 4 AND destination = 'Kurla Market';
UPDATE routes SET destination_lat = 19.07800000, destination_lng = 72.88800000 WHERE stand_id = 4 AND destination = 'Nehru Nagar';
UPDATE routes SET destination_lat = 19.06250000, destination_lng = 72.86830000 WHERE stand_id = 4 AND destination = 'Bandra Kurla Complex';

-- Stand 5: Ghatkopar Station East
UPDATE routes SET destination_lat = 19.08000000, destination_lng = 72.91500000 WHERE stand_id = 5 AND destination = 'Asalpha';
UPDATE routes SET destination_lat = 19.07300000, destination_lng = 72.91200000 WHERE stand_id = 5 AND destination = 'Pant Nagar';
UPDATE routes SET destination_lat = 19.10250000, destination_lng = 72.92500000 WHERE stand_id = 5 AND destination = 'Vikhroli';

-- Stand 6: Chembur Colony
UPDATE routes SET destination_lat = 19.05800000, destination_lng = 72.89800000 WHERE stand_id = 6 AND destination = 'Chembur Naka';
UPDATE routes SET destination_lat = 19.04700000, destination_lng = 72.90500000 WHERE stand_id = 6 AND destination = 'Tilak Nagar';
UPDATE routes SET destination_lat = 19.04500000, destination_lng = 72.91200000 WHERE stand_id = 6 AND destination = 'Govandi';

-- Stand 7: Malad Station West
UPDATE routes SET destination_lat = 19.19000000, destination_lng = 72.84200000 WHERE stand_id = 7 AND destination = 'Orlem';
UPDATE routes SET destination_lat = 19.18600000, destination_lng = 72.85000000 WHERE stand_id = 7 AND destination = 'Malad Market';
UPDATE routes SET destination_lat = 19.17000000, destination_lng = 72.85000000 WHERE stand_id = 7 AND destination = 'Goregaon Link Road';

-- Stand 8: Borivali Station East
UPDATE routes SET destination_lat = 19.22000000, destination_lng = 72.84700000 WHERE stand_id = 8 AND destination = 'Shimpoli';
UPDATE routes SET destination_lat = 19.22800000, destination_lng = 72.86200000 WHERE stand_id = 8 AND destination = 'Poisar';
UPDATE routes SET destination_lat = 19.24000000, destination_lng = 72.85800000 WHERE stand_id = 8 AND destination = 'Mandpeshwar';

-- Stand 9: Powai Market
UPDATE routes SET destination_lat = 19.11700000, destination_lng = 72.91400000 WHERE stand_id = 9 AND destination = 'Hiranandani';
UPDATE routes SET destination_lat = 19.13340000, destination_lng = 72.91330000 WHERE stand_id = 9 AND destination = 'IIT Bombay';
UPDATE routes SET destination_lat = 19.10600000, destination_lng = 72.89600000 WHERE stand_id = 9 AND destination = 'Chandivali';

-- Stand 10: Vikhroli Station West
UPDATE routes SET destination_lat = 19.11500000, destination_lng = 72.93500000 WHERE stand_id = 10 AND destination = 'Kannamwar Nagar';
UPDATE routes SET destination_lat = 19.09500000, destination_lng = 72.92800000 WHERE stand_id = 10 AND destination = 'Vikhroli Park Site';
UPDATE routes SET destination_lat = 19.12800000, destination_lng = 72.93800000 WHERE stand_id = 10 AND destination = 'Kanjurmarg';

-- Make columns NOT NULL after populating data
ALTER TABLE routes
MODIFY COLUMN destination_lat DECIMAL(10,8) NOT NULL,
MODIFY COLUMN destination_lng DECIMAL(11,8) NOT NULL;

-- Verify the migration
SELECT 'Migration completed successfully!' AS status;
SELECT COUNT(*) as routes_with_coordinates FROM routes WHERE destination_lat IS NOT NULL AND destination_lng IS NOT NULL;
