import type { ActorContext } from "../../../../shared/authz/ActorContext";
import type { UnitOfWork } from "../../../../shared/uow/UnitOfWork";
import type { UseCase } from "./UseCase";


// Definimos una "Fábrica" que sabe crear el caso de uso a partir de una Transacción (T)
export type UseCaseFactory<I, O, TransactionContext> = (tx: TransactionContext) => UseCase<I, O>;

export class TransactionalUseCaseDecorator<I, O, TransactionContext> implements UseCase<I, O> {
  private readonly uow: UnitOfWork<TransactionContext>
  private readonly useCaseFactory: UseCaseFactory<I, O, TransactionContext>

  constructor(
    uow: UnitOfWork<TransactionContext>,
    useCaseFactory: UseCaseFactory<I, O, TransactionContext>
  ) {
    this.uow = uow;
    this.useCaseFactory = useCaseFactory;
  }

  async execute(input: I, ctx: ActorContext): Promise<O> {
    // 1. Iniciamos la transacción
    return this.uow.transaction(async (tx) => {
      
      // 2. CREAMOS el caso de uso "fresco" usando los repositorios de ESTA transacción
      const useCase = this.useCaseFactory(tx);

      // 3. Ejecutamos la lógica
      return useCase.execute(input, ctx);
    });
  }
}