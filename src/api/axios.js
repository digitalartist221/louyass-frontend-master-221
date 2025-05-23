// frontend/src/api/axios.ts

import axios from "axios";

/**
 * Creates a custom Axios instance.
 * This allows us to define a base URL and other configurations
 * that will be used for all requests made with this instance.
 */
const api = axios.create({
  // The base address of our FastAPI API.
  // Ensure this is the same address and port as your backend.
  baseURL: "http://localhost:8000",

  // Default HTTP headers that will be sent with every request.
  // "Content-Type: application/json" tells the server that we are sending JSON data.
  headers: {
    "Content-Type": "application/json",
  },
  // You can add other configurations here, such as `timeout`, `withCredentials`, etc.
});

// Optional: Add an interceptor to include the JWT token in authenticated requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // If a token exists in local storage, add it to the Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;