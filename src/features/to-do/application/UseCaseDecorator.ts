import type { ActorContext } from "../../../shared/authz/ActorContext";
import type { Logger } from "../../../shared/observability/Logger";
import type { Metrics } from "../../../shared/observability/Metrics";
import { mapDomainError } from "./errors/mapDomainError";


export async function executeUseCase<T>(
    operationName: string,
    logger: Logger,
    metrics: Metrics,
    ctx: ActorContext,
    input: unknown,
    execution: () => Promise<T>
): Promise<T> {
    // 1. Log inicial genérico
    logger.info(`[Start] ${operationName}`, { user: ctx.userId, input });

    try {
        // 2. Ejecutar la lógica pura
        const result = await execution();
        return result;

    } catch (err) {
        // 3. Manejo de errores centralizado (DRY)
        const appErr = mapDomainError(err);
        const outcome = appErr.telemetry?.outcome ?? "failure";

        metrics.increment(`${operationName}_${outcome}`);

        if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
            logger.warn(`[Warn] ${operationName}`, { code: appErr.code, user: ctx.userId });
        } else {
            logger.error(`[Error] ${operationName}`, appErr, { user: ctx.userId });
        }

        throw appErr;
    }
}