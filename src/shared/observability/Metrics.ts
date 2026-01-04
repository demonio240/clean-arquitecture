export interface Metrics {
  increment(metricName: string, tags?: Record<string, string>): void;
  recordTime(metricName: string, timeMs: number, tags?: Record<string, string>): void;
}