-- Migration: Add processed_events table for durable event deduplication
-- Safe to execute repeatedly on new or existing databases.
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    client_id VARCHAR(24) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_events_client_id ON processed_events (client_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events (processed_at);

