import axios from "axios";
import { getEnvOrNull } from "@/lib/env";

export const apiClient = axios.create({
  timeout: 10_000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const wpUser = getEnvOrNull("WP_APP_USER") || getEnvOrNull("WP_BASIC_USER") || getEnvOrNull("WP_USER");
  const wpPass = getEnvOrNull("WP_APP_PASS") || getEnvOrNull("WP_BASIC_PASS") || getEnvOrNull("WP_PASS");
  if (wpUser && wpPass) {
    config.auth = { username: wpUser, password: wpPass };
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || `Request failed (${status})`;
      return Promise.reject(new Error(message));
    }
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timed out"));
    }
    return Promise.reject(new Error(error.message || "Network error"));
  },
);
