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
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(1, 'Linking Road', 15.00, '10 mins'),
(1, 'Bandra Reclamation', 20.00, '15 mins'),
(1, 'Pali Hill', 25.00, '12 mins');

-- Stand 2: Andheri Station East (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(2, 'MIDC', 20.00, '15 mins'),
(2, 'Marol Naka', 15.00, '10 mins'),
(2, 'Chakala', 25.00, '18 mins');

-- Stand 3: Dadar TT (4 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(3, 'Shivaji Park', 15.00, '12 mins'),
(3, 'Parel', 20.00, '15 mins'),
(3, 'Mahim', 15.00, '10 mins'),
(3, 'Wadala', 20.00, '15 mins');

-- Stand 4: Kurla Station West (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(4, 'Kurla Market', 10.00, '8 mins'),
(4, 'Nehru Nagar', 15.00, '12 mins'),
(4, 'Bandra Kurla Complex', 25.00, '20 mins');

-- Stand 5: Ghatkopar Station East (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(5, 'Asalpha', 15.00, '12 mins'),
(5, 'Pant Nagar', 20.00, '15 mins'),
(5, 'Vikhroli', 25.00, '20 mins');

-- Stand 6: Chembur Colony (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(6, 'Chembur Naka', 10.00, '8 mins'),
(6, 'Tilak Nagar', 20.00, '15 mins'),
(6, 'Govandi', 15.00, '12 mins');

-- Stand 7: Malad Station West (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(7, 'Orlem', 15.00, '10 mins'),
(7, 'Malad Market', 10.00, '8 mins'),
(7, 'Goregaon Link Road', 20.00, '15 mins');

-- Stand 8: Borivali Station East (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(8, 'Shimpoli', 15.00, '12 mins'),
(8, 'Poisar', 20.00, '15 mins'),
(8, 'Mandpeshwar', 15.00, '10 mins');

-- Stand 9: Powai Market (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(9, 'Hiranandani', 15.00, '10 mins'),
(9, 'IIT Bombay', 20.00, '12 mins'),
(9, 'Chandivali', 25.00, '15 mins');

-- Stand 10: Vikhroli Station West (3 routes)
INSERT INTO routes (stand_id, destination, fare, travel_time) VALUES
(10, 'Kannamwar Nagar', 15.00, '12 mins'),
(10, 'Vikhroli Park Site', 20.00, '15 mins'),
(10, 'Kanjurmarg', 25.00, '18 mins');

-- Verification queries (optional, for testing)
-- SELECT COUNT(*) as user_count FROM users; -- Should return 1
-- SELECT COUNT(*) as stand_count FROM stands; -- Should return 10
-- SELECT COUNT(*) as route_count FROM routes; -- Should return 32
-- SELECT s.name, COUNT(r.id) as route_count FROM stands s LEFT JOIN routes r ON s.id = r.stand_id GROUP BY s.id;
