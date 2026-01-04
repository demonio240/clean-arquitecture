// shared/authz/permissions.ts
// Permisos como "códigos" estables (no roles).
// Agregar nuevos roles NO requiere cambiar esto; solo agregar permisos nuevos cuando nacen nuevas capacidades.

export const PERMISSIONS = {
  // Todos
  TODO_CREATE: "todo:create",
  TODO_READ: "todo:read",
  TODO_UPDATE: "todo:update",
  TODO_DELETE: "todo:delete",
  

  // Roles/Admin
  ROLE_MANAGE: "role:manage",
  PERMISSION_MANAGE: "permission:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Útil si querés autocompletado por "keys"
export type PermissionKey = keyof typeof PERMISSIONS;
