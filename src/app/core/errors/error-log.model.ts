export interface ErrorLogEntry {
  name: string;
  message: string;
  stack: string | null;
  currentUrl: string;
  timestamp: string;
}
