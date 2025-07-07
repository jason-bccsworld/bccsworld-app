import React from 'react';

export function CacheBuster() {
  React.useEffect(() => {
    // Nuclear cache clearing
    console.log('🚨 NUCLEAR CACHE CLEAR STARTED 🚨');
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log('Clearing cache:', name);
          caches.delete(name);
        });
      });
    }
    
    // Clear service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          console.log('Unregistering service worker');
          registration.unregister();
        });
      });
    }
    
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Set a timestamp to force refresh
    window.CACHE_BUST_TIME = Date.now();
    
    console.log('Cache clearing completed:', window.CACHE_BUST_TIME);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'orange',
      color: 'black',
      zIndex: 1000000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '50px', marginBottom: '20px' }}>
        🚨 NUCLEAR CACHE CLEAR 🚨
      </h1>
      <p style={{ fontSize: '24px', marginBottom: '10px' }}>
        All caches cleared at: {new Date().toLocaleTimeString()}
      </p>
      <p style={{ fontSize: '20px' }}>
        Random: {Math.random().toString(36).substr(2, 9)}
      </p>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        Component: CacheBuster (New component)
      </p>
    </div>
  );
}