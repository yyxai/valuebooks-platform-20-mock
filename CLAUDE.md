# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ValueBooks Platform 2.0** - E-commerce platform for a used bookstore with buying, appraising, listing, and selling workflows.

## Commands

```bash
# Development
npm install                           # Install all workspace dependencies
npm run dev                           # Start all apps in dev mode
npm run dev -w apps/b2c               # Start specific app
npm run build                         # Build all packages

# Testing
npm run test                          # Run all tests
npm run test:watch                    # Watch mode
npx vitest run path/to/file.test.ts  # Single test file
npx vitest run -t "test name"         # Run tests matching pattern

# Code quality
npm run lint                          # ESLint
npm run format                        # Prettier
npm run typecheck                     # TypeScript checking

# Workspace-specific commands
npm run test -w packages/listing      # Test specific package
npm run build -w packages/shared      # Build specific package
```

## Architecture

### Domain Bounded Contexts

```
Purchase Intake → Appraisal → Listing → Order Management → Fulfillment
```

Each domain is a separate package under `packages/` with its own business logic isolated from infrastructure concerns.

**Domain responsibilities:**
- **purchase-intake**: Accept customer book submissions, coordinate carrier pickup
- **appraisal**: Evaluate book condition, determine grade and offer price
- **listing**: Manage e-commerce product listings from appraised inventory
- **order-management**: Handle customer purchases and order lifecycle
- **fulfillment**: Process shipments and tracking

### Application Layer

Apps under `apps/` consume domain packages:
- **b2c** (Next.js): Customer storefront for buying books
- **b2b** (Next.js): Business partner portal
- **b2e** (Electron): Employee desktop app for appraisal/warehouse operations
- **admin** (Next.js): Internal administration

### Inter-Domain Communication

Domains communicate via events, not direct imports. Only `packages/shared` types may be imported across domain boundaries.

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **Monorepo**: npm workspaces
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Frameworks**: Next.js (web apps), Electron (desktop), Hono (API services)

## Key Domain Entities

- **Book**: ISBN, title, author, condition, price
- **PurchaseRequest**: Customer submission for selling books
- **Appraisal**: Valuation record with grade and offer price
- **Order**: Customer purchase with line items
- **Shipment**: Fulfillment tracking

## Design System

[ValueBooks Design System (Figma)](https://www.figma.com/make/cAcRLRVH7E4zg59EX6Dfkm/Design-System-Website?t=jcxR8VsO9sREplp5-1)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure database connection
3. Set API keys for carrier integration
