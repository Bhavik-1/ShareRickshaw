-- Mumbai Share Auto Seed Data
-- Run after schema.sql to populate database with initial data

-- Insert admin user
-- Password: admin123 (hashed with bcrypt, cost 10)
INSERT INTO users (username, password_hash, email) VALUES
('admin', '$2a$10$Zr7X8YqJ0YqJ0YqJ0YqJ0.K7X8YqJ0YqJ0YqJ0YqJ0YqJ0YqJ0Yq', 'admin@mumbaishare.com');

-- Note: The actual bcrypt hash for 'admin123' would be generated at runtime.
-- For development, use this placeholder. The backend should have a setup script
-- to properly hash the password. Actual bcrypt hash example:
-- $2a$10$rjYqKFZGKFZGKFZGKFZGK.eI5FZG5FZG5FZG5FZG5FZG5FZG5FZGK

-- Insert 10 share auto stands across Mumbai
INSERT INTO stands (name, latitude, longitude, operating_hours) VALUES
('Bandra Station West', 19.0544, 72.8406, '6:00 AM - 11:00 PM'),
('Andheri Station East', 19.1197, 72.8464, '5:30 AM - 11:30 PM'),
('Dadar TT (Tilak Nagar)', 19.0183, 72.8469, '5:00 AM - 12:00 AM'),
('Kurla Station West', 19.0658, 72.8792, '6:00 AM - 11:00 PM'),
('Ghatkopar Station East', 19.0865, 72.9081, '6:00 AM - 10:30 PM'),
('Chembur Colony', 19.0522, 72.8995, '6:30 AM - 10:00 PM'),
('Malad Station West', 19.1869, 72.8486, '6:00 AM - 11:00 PM'),
('Borivali Station East', 19.2307, 72.8567, '5:30 AM - 11:00 PM'),
('Powai Market', 19.1176, 72.9060, '7:00 AM - 10:00 PM'),
('Vikhroli Station West', 19.1025, 72.9250, '6:00 AM - 10:30 PM');

-- Insert routes for each stand
-- Stand 1: Bandra Station West (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(1, 'Linking Road', 15.00, '10 mins', 19.05960000, 72.82950000),
(1, 'Bandra Reclamation', 20.00, '15 mins', 19.04500000, 72.82200000),
(1, 'Pali Hill', 25.00, '12 mins', 19.06300000, 72.82900000);

-- Stand 2: Andheri Station East (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(2, 'MIDC', 20.00, '15 mins', 19.12030000, 72.86800000),
(2, 'Marol Naka', 15.00, '10 mins', 19.11000000, 72.87000000),
(2, 'Chakala', 25.00, '18 mins', 19.11500000, 72.86000000);

-- Stand 3: Dadar TT (4 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(3, 'Shivaji Park', 15.00, '12 mins', 19.03000000, 72.83700000),
(3, 'Parel', 20.00, '15 mins', 19.01300000, 72.84000000),
(3, 'Mahim', 15.00, '10 mins', 19.04100000, 72.84100000),
(3, 'Wadala', 20.00, '15 mins', 19.01700000, 72.85800000);

-- Stand 4: Kurla Station West (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(4, 'Kurla Market', 10.00, '8 mins', 19.07100000, 72.88200000),
(4, 'Nehru Nagar', 15.00, '12 mins', 19.07800000, 72.88800000),
(4, 'Bandra Kurla Complex', 25.00, '20 mins', 19.06250000, 72.86830000);

-- Stand 5: Ghatkopar Station East (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(5, 'Asalpha', 15.00, '12 mins', 19.08000000, 72.91500000),
(5, 'Pant Nagar', 20.00, '15 mins', 19.07300000, 72.91200000),
(5, 'Vikhroli', 25.00, '20 mins', 19.10250000, 72.92500000);

-- Stand 6: Chembur Colony (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(6, 'Chembur Naka', 10.00, '8 mins', 19.05800000, 72.89800000),
(6, 'Tilak Nagar', 20.00, '15 mins', 19.04700000, 72.90500000),
(6, 'Govandi', 15.00, '12 mins', 19.04500000, 72.91200000);

-- Stand 7: Malad Station West (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(7, 'Orlem', 15.00, '10 mins', 19.19000000, 72.84200000),
(7, 'Malad Market', 10.00, '8 mins', 19.18600000, 72.85000000),
(7, 'Goregaon Link Road', 20.00, '15 mins', 19.17000000, 72.85000000);

-- Stand 8: Borivali Station East (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(8, 'Shimpoli', 15.00, '12 mins', 19.22000000, 72.84700000),
(8, 'Poisar', 20.00, '15 mins', 19.22800000, 72.86200000),
(8, 'Mandpeshwar', 15.00, '10 mins', 19.24000000, 72.85800000);

-- Stand 9: Powai Market (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(9, 'Hiranandani', 15.00, '10 mins', 19.11700000, 72.91400000),
(9, 'IIT Bombay', 20.00, '12 mins', 19.13340000, 72.91330000),
(9, 'Chandivali', 25.00, '15 mins', 19.10600000, 72.89600000);

-- Stand 10: Vikhroli Station West (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time, destination_lat, destination_lng) VALUES
(10, 'Kannamwar Nagar', 15.00, '12 mins', 19.11500000, 72.93500000),
(10, 'Vikhroli Park Site', 20.00, '15 mins', 19.09500000, 72.92800000),
(10, 'Kanjurmarg', 25.00, '18 mins', 19.12800000, 72.93800000);

-- Insert Western Line train stations
INSERT INTO train_stations (name, latitude, longitude, line) VALUES
('Churchgate', 18.9337, 72.8263, 'Western'),
('Marine Lines', 18.9433, 72.8256, 'Western'),
('Charni Road', 18.9560, 72.8236, 'Western'),
('Grant Road', 18.9645, 72.8213, 'Western'),
('Mumbai Central', 18.9718, 72.8197, 'Western'),
('Dadar', 19.0182, 72.8427, 'Western'),
('Bandra', 19.0596, 72.8295, 'Western'),
('Khar Road', 19.0726, 72.8322, 'Western'),
('Santacruz', 19.0808, 72.8344, 'Western'),
('Vile Parle', 19.0990, 72.8372, 'Western'),
('Andheri', 19.1195, 72.8468, 'Western'),
('Goregaon', 19.1664, 72.8570, 'Western'),
('Borivali', 19.2307, 72.8567, 'Western'),
('Dahisar', 19.4509, 72.8650, 'Western');

-- Insert sample stand connections for hybrid routing
-- These connections represent known direct routes between stands
INSERT INTO stand_connections (from_stand_id, to_stand_id, distance_km, fare, travel_time_minutes, connection_type) VALUES
-- Bandra to nearby stands
(1, 4, 4.2, 35.00, 12, 'direct'), -- Bandra Station West to Kurla Station West
(1, 3, 3.8, 30.00, 10, 'direct'), -- Bandra Station West to Dadar TT

-- Andheri to nearby stands
(2, 7, 8.5, 50.00, 20, 'direct'), -- Andheri Station East to Malad Station West
(2, 9, 6.2, 40.00, 15, 'direct'), -- Andheri Station East to Powai Market

-- Dadar connections
(3, 1, 3.8, 30.00, 10, 'direct'), -- Dadar TT to Bandra Station West
(3, 4, 5.1, 40.00, 12, 'direct'), -- Dadar TT to Kurla Station West
(3, 5, 8.9, 60.00, 18, 'direct'), -- Dadar TT to Ghatkopar Station East

-- Cross connections
(4, 5, 4.5, 35.00, 11, 'direct'), -- Kurla Station West to Ghatkopar Station East
(5, 6, 7.2, 45.00, 16, 'direct'), -- Ghatkopar Station East to Chembur Colony
(7, 8, 5.8, 40.00, 13, 'direct'), -- Malad Station West to Borivali Station East
(9, 10, 8.1, 55.00, 19, 'direct'); -- Powai Market to Vikhroli Station West

-- Verification queries (optional, for testing)
-- SELECT COUNT(*) as user_count FROM users; -- Should return 1
-- SELECT COUNT(*) as stand_count FROM stands; -- Should return 10
-- SELECT COUNT(*) as route_count FROM routes; -- Should return 32
-- SELECT COUNT(*) as train_station_count FROM train_stations; -- Should return 14
-- SELECT COUNT(*) as stand_connection_count FROM stand_connections; -- Should return 10
-- SELECT s.name, COUNT(r.id) as route_count FROM stands s LEFT JOIN routes r ON s.id = r.stand_id GROUP BY s.id;
