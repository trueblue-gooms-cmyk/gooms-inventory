// Hook personalizado para gestos móviles
// Compatible con Lovable - Gestión de gestos táctiles y interacciones móviles
import { useEffect, useRef, useCallback, useState } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeOptions {
  threshold?: number;
  velocity?: number;
  preventScroll?: boolean;
}

interface PullToRefreshOptions {
  threshold?: number;
  maxPull?: number;
  onRefresh?: () => Promise<void>;
}

interface LongPressOptions {
  threshold?: number;
  onLongPress?: (event: TouchEvent) => void;
}

export const useMobileGestures = () => {
  const [isTouch, setIsTouch] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // 📱 DETECTAR DISPOSITIVO TÁCTIL
  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // 🔄 DETECTAR ORIENTACIÓN
  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // 👆 HOOK PARA SWIPE
  const useSwipe = (
    onSwipeLeft?: () => void,
    onSwipeRight?: () => void,
    onSwipeUp?: () => void,
    onSwipeDown?: () => void,
    options: SwipeOptions = {}
  ) => {
    const elementRef = useRef<HTMLElement>(null);
    const touchStart = useRef<TouchPoint | null>(null);
    const touchEnd = useRef<TouchPoint | null>(null);

    const {
      threshold = 50,
      velocity = 0.3,
      preventScroll = false
    } = options;

    const handleTouchStart = useCallback((e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }
      
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      };
    }, [preventScroll]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }
    }, [preventScroll]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      touchEnd.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      };

      const deltaX = touchEnd.current.x - touchStart.current.x;
      const deltaY = touchEnd.current.y - touchStart.current.y;
      const deltaTime = touchEnd.current.timestamp - touchStart.current.timestamp;
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const calculatedVelocity = distance / deltaTime;

      if (distance >= threshold && calculatedVelocity >= velocity) {
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        
        if (isHorizontal) {
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        } else {
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      touchStart.current = null;
      touchEnd.current = null;
    }, [threshold, velocity, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

    useEffect(() => {
      const element = elementRef.current;
      if (!element || !isTouch) return;

      element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
      element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, isTouch, preventScroll]);

    return elementRef;
  };

  // 🔄 HOOK PARA PULL-TO-REFRESH
  const usePullToRefresh = (options: PullToRefreshOptions = {}) => {
    const elementRef = useRef<HTMLElement>(null);
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);

    const {
      threshold = 100,
      maxPull = 150,
      onRefresh
    } = options;

    const touchStart = useRef<TouchPoint | null>(null);

    const handleTouchStart = useCallback((e: TouchEvent) => {
      const element = elementRef.current;
      if (!element || element.scrollTop > 0) return;

      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      };
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
      const element = elementRef.current;
      if (!element || !touchStart.current || element.scrollTop > 0) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStart.current.y;

      if (deltaY > 0) {
        e.preventDefault();
        setIsPulling(true);
        setPullDistance(Math.min(deltaY, maxPull));
      }
    }, [maxPull]);

    const handleTouchEnd = useCallback(async () => {
      if (!isPulling) return;

      if (pullDistance >= threshold && onRefresh) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Error en pull-to-refresh:', error);
        } finally {
          setIsRefreshing(false);
        }
      }

      setIsPulling(false);
      setPullDistance(0);
      touchStart.current = null;
    }, [isPulling, pullDistance, threshold, onRefresh]);

    useEffect(() => {
      const element = elementRef.current;
      if (!element || !isTouch) return;

      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, isTouch]);

    return {
      elementRef,
      isPulling,
      isRefreshing,
      pullDistance,
      pullProgress: Math.min(pullDistance / threshold, 1)
    };
  };

  // ⏰ HOOK PARA LONG PRESS
  const useLongPress = (options: LongPressOptions = {}) => {
    const elementRef = useRef<HTMLElement>(null);
    const [isPressed, setIsPressed] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {
      threshold = 500,
      onLongPress
    } = options;

    const start = useCallback((e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      setIsPressed(true);
      
      timeoutRef.current = setTimeout(() => {
        if (onLongPress && 'touches' in e) {
          onLongPress(e as TouchEvent);
        }
      }, threshold);
    }, [threshold, onLongPress]);

    const stop = useCallback(() => {
      setIsPressed(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }, []);

    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      // Touch events
      element.addEventListener('touchstart', start, { passive: false });
      element.addEventListener('touchend', stop, { passive: true });
      element.addEventListener('touchcancel', stop, { passive: true });
      element.addEventListener('touchmove', stop, { passive: true });

      // Mouse events (for testing on desktop)
      element.addEventListener('mousedown', start);
      element.addEventListener('mouseup', stop);
      element.addEventListener('mouseleave', stop);

      return () => {
        element.removeEventListener('touchstart', start);
        element.removeEventListener('touchend', stop);
        element.removeEventListener('touchcancel', stop);
        element.removeEventListener('touchmove', stop);
        element.removeEventListener('mousedown', start);
        element.removeEventListener('mouseup', stop);
        element.removeEventListener('mouseleave', stop);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [start, stop]);

    return { elementRef, isPressed };
  };

  // 📳 FEEDBACK HÁPTICO (si está disponible)
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // 🎯 MEJORAR ÁREA DE TOQUE
  const enhanceTouchTarget = useCallback((element: HTMLElement) => {
    if (!element || !isTouch) return;

    // Asegurar área mínima de toque de 44px
    const rect = element.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      element.style.minWidth = '44px';
      element.style.minHeight = '44px';
      element.style.display = 'flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
    }
  }, [isTouch]);

  // 🚫 PREVENIR ZOOM EN INPUTS
  const preventInputZoom = useCallback(() => {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      const htmlInput = input as HTMLInputElement;
      const currentFontSize = window.getComputedStyle(htmlInput).fontSize;
      const fontSize = parseFloat(currentFontSize);
      
      if (fontSize < 16) {
        htmlInput.style.fontSize = '16px';
      }
    });
  }, []);

  // 📱 UTILIDADES MÓVILES
  const isMobile = isTouch && window.innerWidth <= 768;
  const isTablet = isTouch && window.innerWidth > 768 && window.innerWidth <= 1024;
  const isPortrait = orientation === 'portrait';
  const isLandscape = orientation === 'landscape';

  // 🔧 CONFIGURAR VIEWPORT PARA PWA
  const setupMobileViewport = useCallback(() => {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    
    // Configuración optimizada para PWA móvil
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }, []);

  // 🚀 INICIALIZACIÓN
  useEffect(() => {
    if (isTouch) {
      setupMobileViewport();
      preventInputZoom();
    }
  }, [isTouch, setupMobileViewport, preventInputZoom]);

  return {
    // Estado
    isTouch,
    isMobile,
    isTablet,
    isPortrait,
    isLandscape,
    orientation,

    // Hooks de gestos
    useSwipe,
    usePullToRefresh,
    useLongPress,

    // Utilidades
    hapticFeedback,
    enhanceTouchTarget,
    preventInputZoom,
    setupMobileViewport
  };
};