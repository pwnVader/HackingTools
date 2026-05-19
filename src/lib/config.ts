/**
 * Configuración global de la app.
 * El Worker URL se inyecta en build vía VITE_WORKER_URL.
 * En desarrollo, fallback a un proxy local o cadena vacía (la UI mostrará error).
 */

export const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined) ?? '';
export const HAS_WORKER = WORKER_URL.length > 0;
