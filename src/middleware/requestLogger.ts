import morgan from 'morgan';
import config from '../config';

/**
 * HTTP request logger using Morgan.
 *
 * SEC-14: We never log the Authorization header in any environment.
 * - Development: 'dev' format — concise, colored output (headers not logged)
 * - Production: custom combined-like format that omits Authorization and Cookie
 *   headers which may carry bearer tokens or session credentials.
 */

// A curated Apache Combined-like format that omits sensitive request headers.
// Equivalent to 'combined' but without the ":req[...]" Referer/User-Agent tokens
// that could be spoofed to inject data, and without any auth tokens.
const SAFE_PRODUCTION_FORMAT =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms';

export const requestLogger = morgan(
  config.isDevelopment() ? 'dev' : SAFE_PRODUCTION_FORMAT,
);
