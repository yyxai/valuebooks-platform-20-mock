-- Migration 002: Create roles and role assignments tables
-- Implements Role-Based Access Control (RBAC) for the platform

-- Create roles table
-- Note: id is VARCHAR to support both UUIDs and descriptive system role IDs
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(100) PRIMARY KEY,

    -- Role definition
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Permissions stored as JSONB array of strings (e.g., ["listings:read", "orders:write"])
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- User types this role can be assigned to (e.g., ["consumer", "employee"])
    user_types JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- System roles cannot be modified or deleted
    is_system BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT roles_name_unique UNIQUE (name)
);

-- Create role assignments table (many-to-many between users and roles)
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Assignment metadata
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Optional expiration for temporary role assignments
    expires_at TIMESTAMPTZ,

    -- Optional scope restriction (e.g., specific department or resource)
    scope VARCHAR(255),

    -- Constraints
    CONSTRAINT user_role_assignments_unique UNIQUE (user_id, role_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_expires_at ON user_role_assignments(expires_at) WHERE expires_at IS NOT NULL;

-- Apply updated_at trigger to roles table
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE roles IS 'Defines roles with permissions that can be assigned to users';
COMMENT ON COLUMN roles.permissions IS 'JSONB array of permission strings (e.g., ["listings:read", "orders:*"])';
COMMENT ON COLUMN roles.user_types IS 'JSONB array of user types this role can be assigned to';
COMMENT ON COLUMN roles.is_system IS 'System roles are predefined and cannot be modified';
COMMENT ON TABLE user_role_assignments IS 'Links users to their assigned roles';
COMMENT ON COLUMN user_role_assignments.expires_at IS 'Optional expiration for temporary role assignments';
COMMENT ON COLUMN user_role_assignments.scope IS 'Optional scope restriction for the role assignment';
