import { apiGet, apiPost } from "./apiClient.js";

/**
 * @returns {Promise<{ id: string, user_name: string, phone: string, role: string, permissions: string[] }>}
 */
export function fetchCurrentUser() {
  return apiGet("/api/v1/auth/me");
}

/**
 * @param {{ user_name: string, password: string }} credentials
 * @returns {Promise<{ user: object }>}
 */
export function loginRequest(credentials) {
  return apiPost("/api/v1/auth/login", {
    user_name: credentials.user_name,
    password: credentials.password,
  });
}

export function logoutRequest() {
  return apiPost("/api/v1/auth/logout", null);
}
