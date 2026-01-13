import type { ActorContext } from "../../../../shared/authz/ActorContext";
import type { AppError } from "../../../../shared/errors/AppError";
import type { Logger } from "../../../../shared/observability/Logger";
import type { Metrics } from "../../../../shared/observability/Metrics";
import type { UseCase } from "../UseCase";


// Definimos el tipo para la función que sabe convertir errores
export type ErrorMapper = (err: unknown) => AppError;

export class ObservabilityDecorator<I, O> implements UseCase<I, O> {
  private readonly inner: UseCase<I, O>       // El siguiente eslabón (ej. el TransactionalDecorator)
    private readonly logger: Logger
    private readonly metrics: Metrics
    private readonly operationName: string      // Ej: "todo_reopen"
    private readonly mapError: ErrorMapper  

  constructor(
    inner: UseCase<I, O>,       // El siguiente eslabón (ej. el TransactionalDecorator)
    logger: Logger,
    metrics: Metrics,
    operationName: string,      // Ej: "todo_reopen"
    mapError: ErrorMapper       // Inyectamos la estrategia de errores
  ) {
    this.inner = inner;
    this.logger = logger;
    this.metrics = metrics;
    this.operationName = operationName;
    this.mapError = mapError;
  }

  async execute(input: I, ctx: ActorContext): Promise<O> {
    // 1. Log de Inicio Automático
    // Logueamos el input para trazabilidad (cuidado con datos sensibles en producción)
    this.logger.info(`[Start] ${this.operationName}`, { user: ctx.userId, input });

    try {
      // 2. Ejecutar el caso de uso interno (que puede ser el Transaccional)
      const result = await this.inner.execute(input, ctx);

      // 3. Log de Éxito Automático
      this.metrics.increment(`${this.operationName}_success`);
      this.logger.info(`[Success] ${this.operationName}`, { user: ctx.userId });

      return result;

    } catch (err) {
      // 4. Manejo de Errores Centralizado
      const appErr = this.mapError(err);
      const outcome = appErr.telemetry?.outcome ?? "failure";

      this.metrics.increment(`${this.operationName}_${outcome}`);

      if (["not_found", "forbidden", "validation"].includes(outcome)) {
        this.logger.warn(`[Warn] ${this.operationName}`, { code: appErr.code, user: ctx.userId });
      } else {
        this.logger.error(`[Error] ${this.operationName}`, appErr, { user: ctx.userId });
      }

      throw appErr;
    }
  }
}