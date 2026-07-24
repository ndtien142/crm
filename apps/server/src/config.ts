/** Runtime config parsed from env — the single place env is read. */

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  host: string;
  /** Allowed CORS origins (admin dev server, etc.). */
  corsOrigins: string[];
  /** Postgres connection string. Empty => the server uses the in-memory mock. */
  databaseUrl: string;
  jwt: {
    secret: string;
    accessTtlSeconds: number;
    refreshTtlDays: number;
  };
  logLevel: string;
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: num(env.PORT, 4000),
    host: env.HOST ?? '0.0.0.0',
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:5273')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    databaseUrl: env.DATABASE_URL ?? '',
    jwt: {
      secret: env.JWT_SECRET ?? '',
      accessTtlSeconds: num(env.ACCESS_TOKEN_TTL_SECONDS, 3600),
      refreshTtlDays: num(env.REFRESH_TOKEN_TTL_DAYS, 30),
    },
    logLevel: env.LOG_LEVEL ?? 'info',
  };
}
