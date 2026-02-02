import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import postgres from 'postgres';
import { EventBus } from '@valuebooks/shared';

import { createUserRoutes } from './routes.js';
import { AuthenticationService } from '../services/AuthenticationService.js';
import { UserService } from '../services/UserService.js';
import { RoleService } from '../services/RoleService.js';
import { JwtService, createDefaultJwtConfig } from '../infrastructure/jwt.js';
import { PostgresUserRepository } from '../infrastructure/PostgresUserRepository.js';
import { PostgresRoleRepository } from '../infrastructure/PostgresRoleRepository.js';
import { PostgresRefreshTokenRepository } from '../infrastructure/PostgresRefreshTokenRepository.js';
import { InMemoryUserRepository } from '../infrastructure/InMemoryUserRepository.js';
import { InMemoryRoleRepository } from '../infrastructure/InMemoryRoleRepository.js';
import { InMemoryRefreshTokenRepository } from '../infrastructure/InMemoryRefreshTokenRepository.js';
import { getAllSystemRoles } from '../domain/SystemRoles.js';

// Configuration from environment
const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  useInMemory: process.env.USE_IN_MEMORY === 'true',
};

async function main() {
  console.log('Starting ValueBooks User API...');
  console.log(`Port: ${config.port}`);
  console.log(`Database: ${config.databaseUrl ? 'PostgreSQL' : 'In-Memory'}`);

  // Create repositories
  let userRepository;
  let roleRepository;
  let refreshTokenRepository;

  if (config.databaseUrl && !config.useInMemory) {
    console.log('Connecting to PostgreSQL...');
    const sql = postgres(config.databaseUrl);

    // Health check
    try {
      await sql`SELECT 1`;
      console.log('PostgreSQL connection successful');
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      process.exit(1);
    }

    userRepository = new PostgresUserRepository(sql);
    roleRepository = new PostgresRoleRepository(sql);
    refreshTokenRepository = new PostgresRefreshTokenRepository(sql);
  } else {
    console.log('Using in-memory repositories');
    userRepository = new InMemoryUserRepository();
    roleRepository = new InMemoryRoleRepository();
    refreshTokenRepository = new InMemoryRefreshTokenRepository();

    // Seed system roles for in-memory mode
    const systemRoles = getAllSystemRoles();
    for (const role of systemRoles) {
      await roleRepository.save(role);
    }
    console.log(`Seeded ${systemRoles.length} system roles`);
  }

  // Create services
  const eventBus = new EventBus();
  const jwtConfig = createDefaultJwtConfig(config.jwtSecret, config.jwtRefreshSecret);
  const jwtService = new JwtService(jwtConfig);

  const authService = new AuthenticationService(
    userRepository,
    roleRepository,
    refreshTokenRepository,
    jwtService,
    eventBus
  );

  const userService = new UserService(userRepository, eventBus);
  const roleService = new RoleService(roleRepository, userRepository, eventBus);

  // Create Hono app
  const app = new Hono();

  // Middleware
  app.use('*', logger());
  app.use('*', cors({
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  }));

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'user-api',
    });
  });

  // Mount user routes
  const userRoutes = createUserRoutes({
    authService,
    userService,
    roleService,
    jwtService,
  });
  app.route('/api/v1/users', userRoutes);

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404);
  });

  // Error handler
  app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  });

  // Start server
  console.log(`Starting server on port ${config.port}...`);
  serve({
    fetch: app.fetch,
    port: config.port,
  });

  console.log(`Server running at http://localhost:${config.port}`);
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/v1/users/register');
  console.log('  POST /api/v1/users/login');
  console.log('  POST /api/v1/users/refresh');
  console.log('  GET  /api/v1/users/me');
  console.log('  ...and more');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
