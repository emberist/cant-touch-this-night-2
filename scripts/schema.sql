CREATE DATABASE IF NOT EXISTS minipanel;

CREATE TABLE IF NOT EXISTS minipanel.events
(
    event_id    UUID                          DEFAULT generateUUIDv4(),
    event_name  LowCardinality(String),
    timestamp   DateTime64(3, 'UTC'),
    device_id   Nullable(String),
    user_id     Nullable(String),
    properties  String,
    ingested_at DateTime64(3, 'UTC')          DEFAULT now64()
)
ENGINE = MergeTree()
ORDER BY (timestamp, event_id)
PARTITION BY toYYYYMM(timestamp);

CREATE TABLE IF NOT EXISTS minipanel.identity_mappings
(
    device_id  String,
    user_id    String,
    created_at DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY (device_id);
