import React, { useRef } from "react";

export default function TestRef() {
  const testRef = useRef<HTMLDivElement>(null);
  
  return (
    <div ref={testRef}>
      Test component with useRef
    </div>
  );
}