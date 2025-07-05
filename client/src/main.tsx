// Debug React initialization
console.log("Starting React app initialization");

import React from "react";
console.log("React imported:", !!React);
console.log("React.useRef:", !!React.useRef);

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Check if React is properly available
if (!React || !React.useRef) {
  console.error("React or React.useRef is not available!");
  throw new Error("React is not properly initialized");
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

console.log("Creating React root");
const root = createRoot(rootElement);

console.log("Rendering App");
root.render(<App />);
