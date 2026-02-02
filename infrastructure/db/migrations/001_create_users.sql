-- Migration 001: Create users table
-- This table stores all user accounts (consumers, employees, business partners)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    password_salt VARCHAR(255),

    -- User classification
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('consumer', 'employee', 'business_partner')),
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'apple', 'amazon', 'facebook')),
    auth_provider_external_id VARCHAR(255),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended', 'deactivated')),

    -- Profile
    profile_name VARCHAR(255) NOT NULL,
    profile_phone VARCHAR(50),

    -- Employee-specific fields
    employee_department VARCHAR(100),
    employee_title VARCHAR(100),

    -- Business partner-specific fields
    partner_company_name VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_auth_provider_external_id_unique UNIQUE (auth_provider, auth_provider_external_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider, auth_provider_external_id) WHERE auth_provider_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE users IS 'Stores all user accounts including consumers, employees, and business partners';
COMMENT ON COLUMN users.user_type IS 'Type of user: consumer, employee, or business_partner';
COMMENT ON COLUMN users.auth_provider IS 'Authentication method: email or OAuth provider';
COMMENT ON COLUMN users.status IS 'Account status: pending_verification, active, suspended, or deactivated';
