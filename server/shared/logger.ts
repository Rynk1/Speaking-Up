export interface LogContext {
  correlationId?: string;
  userId?: string;
  institutionId?: string;
  reportId?: string;
  [key: string]: any;
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...context
    }));
  },
  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      ...context
    }));
  },
  error(message: string, context?: LogContext) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      ...context
    }));
  }
};
