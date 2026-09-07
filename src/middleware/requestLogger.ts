import morgan from 'morgan';
import config from '../config';

/**
 * HTTP request logger using Morgan.
 *
 * - Development: 'dev' format — concise, colored output
 * - Production: 'combined' format — Apache-style, suitable for log aggregation
 */
export const requestLogger = morgan(
  config.isDevelopment() ? 'dev' : 'combined',
);
