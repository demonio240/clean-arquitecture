import type { Metrics } from "../../shared/observability/Metrics";
import { envConfig } from "../system/EnvConfig";


export class MetricsReporter implements Metrics {
  
  increment(metricName: string, tags?: Record<string, string>): void {
    if (envConfig.enableAnalytics) {
        // Aquí iría la llamada real a Datadog/NewRelic/Prometheus
        // Ejemplo: datadogClient.increment(metricName, tags);
        console.log(`[METRIC:INC] ${metricName}`, tags);
    }
  }

  recordTime(metricName: string, timeMs: number, tags?: Record<string, string>): void {
    if (envConfig.enableAnalytics) {
        // Ejemplo: datadogClient.histogram(metricName, timeMs, tags);
        console.log(`[METRIC:TIME] ${metricName}: ${timeMs}ms`, tags);
    }
  }
}