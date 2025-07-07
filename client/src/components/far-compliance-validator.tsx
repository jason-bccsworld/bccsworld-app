import React from 'react';

// FORCE CACHE BUST: Component updated at 4:25 PM
export function FARComplianceValidator() {
  React.useEffect(() => {
    console.log('🚨 CACHE BUST TEST - Component loaded at 4:25 PM 🚨');
    document.title = 'CACHE BUST TEST - 4:25 PM';
    
    // Force override all existing styles
    const style = document.createElement('style');
    style.textContent = `
      body * { display: none !important; }
      #root { display: block !important; }
    `;
    document.head.appendChild(style);
    
    // Set body to red
    document.body.style.cssText = `
      background-color: red !important;
      color: white !important;
      font-family: Arial, sans-serif !important;
      margin: 0 !important;
      padding: 0 !important;
    `;
  }, []);

  return (
    <div 
      id="test-component-425pm"
      style={{
        minHeight: '100vh',
        backgroundColor: 'red',
        color: 'white',
        textAlign: 'center',
        padding: '50px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h1 style={{ fontSize: '60px', fontWeight: 'bold', marginBottom: '20px' }}>
        🚨 CACHE BUST TEST - 4:25 PM 🚨
      </h1>
      <p style={{ fontSize: '30px', marginBottom: '10px' }}>
        If you see this, the component cache was successfully cleared!
      </p>
      <p style={{ fontSize: '20px', marginBottom: '10px' }}>
        Component: FARComplianceValidator (Updated)
      </p>
      <p style={{ fontSize: '18px' }}>
        Time: {new Date().toISOString()}
      </p>
      <p style={{ fontSize: '16px', marginTop: '20px' }}>
        Random: {Math.random().toString(36).substr(2, 9)}
      </p>
    </div>
  );
}