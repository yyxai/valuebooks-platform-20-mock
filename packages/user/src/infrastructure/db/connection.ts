import postgres from 'postgres';

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
}

let sql: postgres.Sql | null = null;

export function createConnection(config: DatabaseConfig = {}): postgres.Sql {
  const connectionString = config.connectionString || process.env.DATABASE_URL;

  if (connectionString) {
    sql = postgres(connectionString, {
      max: config.max ?? 10,
      idle_timeout: config.idleTimeout ?? 30,
      connect_timeout: config.connectTimeout ?? 10,
    });
  } else {
    sql = postgres({
      host: config.host ?? 'localhost',
      port: config.port ?? 5433,
      database: config.database ?? 'valuebooks',
      user: config.user ?? 'valuebooks',
      password: config.password ?? 'dev_password',
      max: config.max ?? 10,
      idle_timeout: config.idleTimeout ?? 30,
      connect_timeout: config.connectTimeout ?? 10,
    });
  }

  return sql;
}

export function getConnection(): postgres.Sql {
  if (!sql) {
    throw new Error(
      'Database connection not initialized. Call createConnection() first.'
    );
  }
  return sql;
}

export async function closeConnection(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const connection = getConnection();
    await connection`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
