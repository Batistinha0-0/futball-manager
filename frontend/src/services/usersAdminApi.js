import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient.js";

/**
 * @returns {Promise<Array<{ id: string, user_name: string, phone: string, role: string }>>}
 */
export function fetchSuperAdminUsers() {
  return apiGet("/api/v1/super-admin/users");
}

/**
 * @param {{ user_name: string, password: string, phone: string }} body
 */
export function createOrganizerUser(body) {
  return apiPost("/api/v1/super-admin/users", body);
}

/**
 * @param {string} userId
 * @param {Record<string, string | undefined>} patch — only include defined keys (user_name, phone, role, password)
 */
export function updateUser(userId, patch) {
  const body = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== ""));
  return apiPatch(`/api/v1/super-admin/users/${userId}`, body);
}

/**
 * @param {string} userId
 */
export function deleteUser(userId) {
  return apiDelete(`/api/v1/super-admin/users/${userId}`);
}
