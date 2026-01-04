export interface Logger {
  info(message: string, context?: object): void;
  error(message: string, error?: Error, context?: object): void;
  warn(message: string, context?: object): void;
}