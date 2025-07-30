-- Aurora (Postgres) schema for incidents table used in semantic search
CREATE TABLE incidents (
    id UUID PRIMARY KEY, -- Unique identifier for the incident
    title TEXT NOT NULL, -- Incident title
    description TEXT, -- Incident description
    severity TEXT, -- Severity level (e.g., low, medium, high)
    status TEXT, -- Status (e.g., open, closed)
    assignee TEXT, -- Assigned user
    alert_count INTEGER, -- Number of alerts associated
    tags TEXT[], -- Array of tags
    created_at TIMESTAMPTZ DEFAULT now(), -- Creation timestamp
    updated_at TIMESTAMPTZ DEFAULT now()  -- Last update timestamp
);

-- Index for faster lookup by status or assignee (optional)
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_assignee ON incidents(assignee);