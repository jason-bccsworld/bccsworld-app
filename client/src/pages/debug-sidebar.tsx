import React from 'react';

export default function DebugSidebar() {
  return (
    <div className="flex h-screen bg-red-100">
      {/* Debug sidebar with bright colors */}
      <div 
        className="w-64 bg-red-500 text-white flex flex-col"
        style={{ 
          height: '100vh',
          border: '5px solid yellow',
          boxSizing: 'border-box'
        }}
      >
        <div className="p-4 bg-blue-500 border-b-2 border-white">
          <h1 className="text-xl font-bold">DEBUG SIDEBAR</h1>
          <p className="text-sm">Full Height Test</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-green-500">
          <div className="space-y-4">
            <div className="p-3 bg-white text-black rounded">Item 1</div>
            <div className="p-3 bg-white text-black rounded">Item 2</div>
            <div className="p-3 bg-white text-black rounded">Item 3</div>
            <div className="p-3 bg-white text-black rounded">Item 4</div>
            <div className="p-3 bg-white text-black rounded">Item 5</div>
            <div className="p-3 bg-white text-black rounded">Item 6</div>
            <div className="p-3 bg-white text-black rounded">Item 7</div>
            <div className="p-3 bg-white text-black rounded">Item 8</div>
            <div className="p-3 bg-white text-black rounded">Item 9</div>
            <div className="p-3 bg-white text-black rounded">Item 10</div>
            <div className="p-3 bg-white text-black rounded">Item 11</div>
            <div className="p-3 bg-white text-black rounded">Item 12</div>
            <div className="p-3 bg-white text-black rounded">REGULATORY MONITOR</div>
            <div className="p-3 bg-white text-black rounded">BOTTOM ITEM</div>
          </div>
        </div>
        
        <div className="p-4 bg-purple-500 border-t-2 border-white">
          <button className="w-full p-2 bg-white text-black rounded">
            SIGN OUT (BOTTOM)
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-6 bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Sidebar Height Debug</h1>
        <p>If you can see all colored sections and scroll through items, the sidebar height is working.</p>
        <p className="mt-4">The sidebar should show:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Blue header at top</li>
          <li>Green scrollable content area</li>
          <li>Purple fixed footer at bottom</li>
          <li>Yellow border around entire sidebar</li>
        </ul>
      </div>
    </div>
  );
}