// src/plataform/uow/LocalStorageUnitOfWork.ts

import type { UnitOfWork } from "../../shared/uow/UnitOfWork";

type Snapshot = Map<string, string | null>;

export interface LocalStorageUnitOfWorkOptions<TTx> {
  /**
   * Fábrica del "Tx" que usará tu app (eso lo decides fuera del platform).
   * Ej: () => ({ todoRepo, outboxRepo })
   */
  txFactory: () => TTx;

  /**
   * Claves de localStorage que deben ser "atómicas" dentro de la transacción.
   * Ej: ["todos", "outbox"]
   */
  keys: string[];

  /**
   * Para testear (opcional). Si no lo pasas, usa window.localStorage.
   */
  storage?: Storage;
}

export class LocalStorageUnitOfWork<TTx> implements UnitOfWork<TTx> {
  private readonly storage: Storage;
  private readonly opts: LocalStorageUnitOfWorkOptions<TTx>;

  constructor(opts: LocalStorageUnitOfWorkOptions<TTx>) {
    this.storage = opts.storage ?? getDefaultStorage();
    this.opts = opts;
  }

  async transaction<T>(work: (tx: TTx) => Promise<T>): Promise<T> {
    const snapshot = this.takeSnapshot(this.opts.keys);
    const tx = this.opts.txFactory();

    try {
      // Ejecuta tu trabajo “transaccional”
      const result = await work(tx);
      return result;
    } catch (err) {
      // Rollback “fake” restaurando localStorage
      this.restoreSnapshot(snapshot);
      throw err;
    }
  }

  private takeSnapshot(keys: string[]): Snapshot {
    const snap: Snapshot = new Map();
    for (const key of keys) {
      snap.set(key, this.storage.getItem(key));
    }
    return snap;
  }

  private restoreSnapshot(snapshot: Snapshot): void {
    for (const [key, value] of snapshot.entries()) {
      if (value === null) this.storage.removeItem(key);
      else this.storage.setItem(key, value);
    }
  }
}

function getDefaultStorage(): Storage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("LocalStorageUnitOfWork: window.localStorage no está disponible.");
  }
  return window.localStorage;
}
