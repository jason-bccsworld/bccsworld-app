import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      setIsMobile(mobileRegex.test(userAgent) || isTouchDevice || isSmallScreen);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}

export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    hasCamera: false,
    isOnline: navigator.onLine,
    supportsGeolocation: 'geolocation' in navigator,
    supportsPWA: 'serviceWorker' in navigator
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent;
      const width = window.innerWidth;
      
      // Device type detection
      const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width <= 768;
      const isTablet = /iPad/i.test(userAgent) || (width > 768 && width <= 1024);
      const isDesktop = width > 1024 && !isMobile && !isTablet;

      // Camera availability
      const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        hasCamera,
        isOnline: navigator.onLine,
        supportsGeolocation: 'geolocation' in navigator,
        supportsPWA: 'serviceWorker' in navigator
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('online', updateDeviceInfo);
    window.addEventListener('offline', updateDeviceInfo);
    
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('online', updateDeviceInfo);
      window.removeEventListener('offline', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}