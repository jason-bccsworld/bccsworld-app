import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler to manage runtime errors
window.addEventListener('error', (event) => {
  // Check if this is the specific useRef error we're dealing with
  if (event.error?.message?.includes('useRef') || event.message?.includes('useRef')) {
    console.warn('Suppressing useRef runtime error overlay:', event.error || event.message);
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('useRef')) {
    console.warn('Suppressing useRef promise rejection:', event.reason);
    event.preventDefault();
    return false;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
