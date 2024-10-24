import { useEffect, useRef } from "react";

export const useFocusInterval = (callback: () => void, delay: number): void => {
  const intervalIdRef = useRef<number | null>(null);

  useEffect(() => {
    const setFocusInterval = () => {
      if (!intervalIdRef.current) {
        intervalIdRef.current = window.setInterval(callback, delay);
      }
    };

    const clearFocusInterval = () => {
      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    if (document.hasFocus()) {
      setFocusInterval();
    }

    window.addEventListener("focus", setFocusInterval);
    window.addEventListener("blur", clearFocusInterval);

    // Cleanup function
    return () => {
      window.removeEventListener("focus", setFocusInterval);
      window.removeEventListener("blur", clearFocusInterval);
      clearFocusInterval();
    };
  }, [callback, delay]);
};
