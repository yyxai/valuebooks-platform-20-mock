-- Migration 004: Seed system roles
-- Creates predefined roles that match SystemRoles in the domain

-- Insert system roles with predefined IDs
-- Using ON CONFLICT to make this migration idempotent

INSERT INTO roles (id, name, description, permissions, user_types, is_system, created_at, updated_at)
VALUES
    -- Consumer roles
    (
        'system-role-buyer',
        'Buyer',
        'Can browse and purchase books',
        '["listings:read", "orders:read", "orders:write"]'::jsonb,
        '["consumer"]'::jsonb,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'system-role-seller',
        'Seller',
        'Can sell books to ValueBooks',
        '["listings:read", "purchase_requests:read", "purchase_requests:write"]'::jsonb,
        '["consumer"]'::jsonb,
        TRUE,
        NOW(),
        NOW()
    ),
    -- Business partner role
    (
        'system-role-partner',
        'Business Partner',
        'Business partner with bulk operations',
        '["listings:read", "orders:read", "orders:write", "purchase_requests:read", "purchase_requests:write", "reports:read"]'::jsonb,
        '["business_partner"]'::jsonb,
        TRUE,
        NOW(),
        NOW()
    ),
    -- Employee roles
    (
        'system-role-appraiser',
        'Appraiser',
        'Can appraise books',
        '["appraisals:read", "appraisals:write", "purchase_requests:read", "listings:read"]'::jsonb,
        '["employee"]'::jsonb,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'system-role-warehouse-operator',
        'Warehouse Operator',
        'Manages warehouse operations',
        '["orders:read", "fulfillment:read", "fulfillment:write", "listings:read"]'::jsonb,
        '["employee"]'::jsonb,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'system-role-customer-support',
        'Customer Support',
        'Handles customer inquiries',
        '["users:read", "orders:read", "orders:cancel", "purchase_requests:read", "listings:read"]'::jsonb,
        '["employee"]'::jsonb,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'system-role-admin',
        'Administrator',
        'Full system access',
        '["admin:*", "users:read", "users:write", "users:delete", "roles:read", "roles:write", "listings:*", "orders:*", "appraisals:*", "fulfillment:*", "purchase_requests:*", "reports:*"]'::jsonb,
        '["employee"]'::jsonb,
        TRUE,
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    user_types = EXCLUDED.user_types,
    updated_at = NOW();

-- Verify the seed data
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM roles WHERE is_system = TRUE) < 7 THEN
        RAISE EXCEPTION 'Failed to seed all system roles';
    END IF;
END $$;

COMMENT ON TABLE roles IS 'System roles seeded: Buyer, Seller, Partner, Appraiser, Warehouse Operator, Customer Support, Administrator';
