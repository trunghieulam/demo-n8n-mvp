type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  component?: string;
  executionId?: string;
  nodeId?: string;
  sandboxId?: string;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatPrefix(context?: LogContext): string {
    const parts: string[] = [];

    if (context?.component) {
      parts.push(context.component.toUpperCase());
    }

    if (context?.executionId && context?.nodeId) {
      const sandboxId = context.sandboxId || `${context.executionId}:${context.nodeId}`;
      parts.push(`SANDBOX:${sandboxId}`);
    } else if (context?.executionId) {
      parts.push(`EXEC:${context.executionId}`);
    } else if (context?.nodeId) {
      parts.push(`NODE:${context.nodeId}`);
    }

    return parts.length > 0 ? `[${parts.join('] [')}]` : '';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const prefix = this.formatPrefix(context);
    const prefixStr = prefix ? `${prefix} ` : '';
    return `[${timestamp}] ${prefixStr}${message}`;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? `${message}: ${error.message}` : message;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(this.formatMessage('error', errorMessage, context));
    if (errorStack) {
      console.error(errorStack);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  // Convenience methods for common contexts
  backend(message: string): void {
    this.info(message, { component: 'BACKEND' });
  }

  sandbox(message: string, executionId: string, nodeId: string, sandboxId?: string): void {
    this.info(message, { 
      component: 'SANDBOX', 
      executionId, 
      nodeId, 
      sandboxId 
    });
  }

  execution(message: string, executionId: string): void {
    this.info(message, { component: 'EXECUTION', executionId });
  }

  node(message: string, nodeId: string, executionId?: string): void {
    this.info(message, { component: 'NODE', nodeId, executionId });
  }
}

export const logger = new Logger();
