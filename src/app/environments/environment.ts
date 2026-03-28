export const environment = {
  production: import.meta.env.NG_APP_PRODUCTION === 'true',
  apiUrl: import.meta.env.NG_APP_API_URL || "http://localhost:30001/api",
};