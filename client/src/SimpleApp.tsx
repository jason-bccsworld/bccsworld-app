import React from "react";

export default function SimpleApp() {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1 style={{ color: "green" }}>✅ REACT APP WORKING</h1>
      <p>Current URL: {window.location.href}</p>
      <p>If you see this, the React app is loading correctly.</p>
      <button 
        onClick={() => window.location.href = "/dashboard"}
        style={{ padding: "10px 20px", background: "blue", color: "white", border: "none", borderRadius: "5px" }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}