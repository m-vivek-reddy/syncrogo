ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ride_id INTEGER REFERENCES rides(id);
CREATE INDEX IF NOT EXISTS ix_bookings_ride_id ON bookings (ride_id);
