// src/shared/core/Result.ts

export type Result<T, E> =
  | { isSuccess: true; value: T }
  | { isSuccess: false; error: E };

// Helper para éxito
export const success = <T>(value: T): Result<T, never> => {
  return { isSuccess: true, value };
};

// Helper para fallo
export const failure = <E>(error: E): Result<never, E> => {
  return { isSuccess: false, error };
};