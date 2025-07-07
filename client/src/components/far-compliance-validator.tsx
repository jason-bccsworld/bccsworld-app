import React from 'react';

export function FARComplianceValidator() {
  React.useEffect(() => {
    console.log('🚨 FOUND THE CULPRIT! FARComplianceValidator component loaded 🚨');
    document.title = 'FOUND THE ISSUE';
    document.body.style.backgroundColor = 'red';
  }, []);

  return (
    <div style={{
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
      zIndex: 9999
    }}>
      <h1 style={{ fontSize: '60px', fontWeight: 'bold', marginBottom: '20px' }}>
        🚨 FOUND THE CULPRIT! 🚨
      </h1>
      <p style={{ fontSize: '30px', marginBottom: '10px' }}>
        This FARComplianceValidator component was the problem!
      </p>
      <p style={{ fontSize: '20px', marginBottom: '10px' }}>
        Component: FARComplianceValidator (the culprit)
      </p>
      <p style={{ fontSize: '18px' }}>
        Time: {new Date().toISOString()}
      </p>
      <p style={{ fontSize: '16px', marginTop: '20px' }}>
        The old component was being loaded instead of the new one!
      </p>
    </div>
  );
}