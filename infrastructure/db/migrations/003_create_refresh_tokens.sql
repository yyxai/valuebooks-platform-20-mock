-- Migration 003: Create refresh tokens table
-- Stores JWT refresh tokens for secure token rotation

CREATE TABLE IF NOT EXISTS refresh_tokens (
    -- JWT ID (jti claim) as primary key
    jti UUID PRIMARY KEY,

    -- Reference to user
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token lifecycle
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    -- Optional: device/session info for multi-device support
    device_info JSONB
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at) WHERE revoked_at IS NULL;

-- Index for finding active tokens for a user (not expired, not revoked)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(user_id, expires_at)
    WHERE revoked_at IS NULL;

-- Add comments
COMMENT ON TABLE refresh_tokens IS 'Stores JWT refresh tokens for secure authentication';
COMMENT ON COLUMN refresh_tokens.jti IS 'JWT ID claim, unique identifier for each token';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'NULL if active, timestamp if revoked';
COMMENT ON COLUMN refresh_tokens.device_info IS 'Optional JSON with device/session metadata';

-- Function to clean up expired tokens (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_refresh_tokens IS 'Removes refresh tokens expired more than 7 days ago';
