// Identifiant court et unique — suffisant pour un stockage 100 % local.
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);