import React from 'react';

export default function TestFARRoute() {
  React.useEffect(() => {
    console.log('🚨 TEST FAR ROUTE COMPONENT LOADED SUCCESSFULLY 🚨');
    document.title = 'TEST ROUTE LOADED';
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
        🚨 ROUTING TEST SUCCESS 🚨
      </h1>
      <p style={{ fontSize: '30px', marginBottom: '10px' }}>
        If you see this, the route is working correctly!
      </p>
      <p style={{ fontSize: '20px', marginBottom: '10px' }}>
        Component: TestFARRoute
      </p>
      <p style={{ fontSize: '18px' }}>
        Time: {new Date().toISOString()}
      </p>
      <p style={{ fontSize: '16px', marginTop: '20px' }}>
        URL: {window.location.pathname}
      </p>
    </div>
  );
}