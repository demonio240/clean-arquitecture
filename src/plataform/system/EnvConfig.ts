import type { EnvConfig } from "../../shared/config/EnvConfig";


// Función helper privada para validar (detalle de implementación)
const getVar = (key: string): string => {
  const value = import.meta.env[key]; // Detalle específico de Vite
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

export const envConfig: EnvConfig = {
  apiUrl: getVar('VITE_API_URL'),
  isProduction: import.meta.env.PROD,
  enableAnalytics: getVar('VITE_ENABLE_ANALYTICS') === 'true',
};

