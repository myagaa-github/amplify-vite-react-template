export const TIMEOUTS = {
  CONNECTION: 120000, // 2 минут
  STATUS_DISPLAY: 5000, // 5 секунд
} as const;

export const COLORS = {
  primary: "#007bff",
  disabled: "#6c757d",
  success: "#28a745",
  error: "red",
  errorBg: "#ffe7e7",
  statusBg: "#e7f3ff",
  statusText: "#0066cc",
  text: "#666",
  border: "#ddd",
} as const;

export const SPACING = {
  xs: "5px",
  sm: "10px",
  md: "15px",
  lg: "20px",
} as const;
