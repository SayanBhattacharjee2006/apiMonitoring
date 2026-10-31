CREATE TABLE IF NOT EXISTS endpoint_metrics (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(24) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    time_bucket TIMESTAMP NOT NULL,
    total_hits INTEGER DEFAULT 0,
    error_hits INTEGER DEFAULT 0,
    avg_latency NUMERIC(10,3) DEFAULT 0.000,
    min_latency NUMERIC(10,3) DEFAULT 0.000,
    max_latency NUMERIC(10,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, service_name, endpoint, method, time_bucket) 
);


CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_client_id ON endpoint_metrics (client_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_metrics_service ON endpoint_metrics (client_id, service_name);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_time ON endpoint_metrics (time_bucket);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_endpoint ON endpoint_metrics (client_id, service_name, endpoint);

-- Table: processed_events (Durable Event-Level Deduplication Ledger)
-- Tracks successfully processed/aggregated event IDs to prevent duplicate metrics aggregation.
-- Retention note: Records in this ledger must be retained for at least the message TTL / DLQ replay
-- window (e.g. 7-30 days) to prevent duplicate processing on queue replay.
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    client_id VARCHAR(24) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_events_client_id ON processed_events (client_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events (processed_at);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_endpoint_metrics_updated_at ON endpoint_metrics;
CREATE TRIGGER update_endpoint_metrics_updated_at
BEFORE UPDATE ON endpoint_metrics
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


