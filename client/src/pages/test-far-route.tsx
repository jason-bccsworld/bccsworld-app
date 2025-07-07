import React from 'react';

export default function TestFARRoute() {
  return (
    <div className="min-h-screen bg-red-500 text-white text-center p-8">
      <h1 className="text-6xl font-bold">🚨 ROUTING TEST SUCCESS 🚨</h1>
      <p className="text-2xl mt-4">If you see this, the route is working correctly!</p>
      <p className="text-xl mt-2">Component: TestFARRoute</p>
      <p className="text-lg mt-2">Time: {new Date().toISOString()}</p>
    </div>
  );
}