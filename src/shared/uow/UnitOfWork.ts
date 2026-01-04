

export interface UnitOfWork<TTx> {
  transaction<T>(work: (tx: TTx) => Promise<T>): Promise<T>;
}
