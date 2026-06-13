// Loads and validates environment config once, then exports a frozen object.
// Everything that varies between localhost and the Vultr server lives here, so
// switching environments means editing .env only — never the source files.
import 'dotenv/config';

function required(name, value) {
  if (value === undefined || value === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  apiPrefix: process.env.API_PREFIX || '/api',

  // CORS allow-list. Comma-separated origins -> array.
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  upstream: {
    baseUrl: required('UPSTREAM_BASE_URL', process.env.UPSTREAM_BASE_URL),
    apiKey: process.env.UPSTREAM_API_KEY || '',
    timeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS || 8000),
  },
};

config.isProd = config.env === 'production';

export default Object.freeze(config);
