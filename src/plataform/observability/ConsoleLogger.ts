
 // Usamos la implementación concreta aquí porque estamos en platform

import type { Logger } from "../../shared/observability/Logger";
import { envConfig } from "../system/EnvConfig";

export class ConsoleLogger implements Logger {
  
  info(message: string, context?: object): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: object): void {
    this.log('WARN', message, context);
  }

  error(message: string, error?: Error, context?: object): void {
    this.log('ERROR', message, { ...context, error: error?.stack });
  }

  private log(level: string, message: string, context?: object) {
    const timestamp = new Date().toISOString();
    
    // En Producción: Usar formato JSON (mejor para herramientas como Datadog/CloudWatch)
    if (envConfig.isProduction) {
      console.log(JSON.stringify({
        level,
        timestamp,
        message,
        ...context
      }));
    } else {
      // En Desarrollo: Formato legible para humanos
      console.log(`[${timestamp}] [${level}]: ${message}`, context || '');
    }
  }
}