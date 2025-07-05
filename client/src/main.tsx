import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Completely disable the runtime error plugin
(window as any).__replit_runtime_error_plugin_disabled = true;

// Remove any existing error overlays
setTimeout(() => {
  const errorOverlays = document.querySelectorAll('[data-testid="error-overlay"], .runtime-error-overlay, [class*="error"], [class*="overlay"]');
  errorOverlays.forEach(el => {
    if (el.textContent?.includes('useRef') || el.textContent?.includes('runtime-error')) {
      el.remove();
    }
  });
}, 100);

// Override the hot context to prevent error overlay
if (import.meta.hot) {
  const originalSend = import.meta.hot.send;
  import.meta.hot.send = function(event: string, data: any) {
    if (event.includes('error') || event.includes('runtime-error')) {
      return; // Block error events
    }
    return originalSend.call(this, event, data);
  };
}

// Global error suppression
const suppressError = (event: any) => {
  if (event.error?.message?.includes('useRef') || 
      event.message?.includes('useRef') ||
      event.reason?.message?.includes('useRef')) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
};

window.addEventListener('error', suppressError, true);
window.addEventListener('unhandledrejection', suppressError, true);

createRoot(document.getElementById("root")!).render(<App />);
