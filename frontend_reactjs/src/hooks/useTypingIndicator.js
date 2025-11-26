import { useEffect, useRef, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * useTypingIndicator provides a lightweight, configurable typing indicator to simulate
 * assistant "streaming" UX before a response is finalized.
 *
 * Usage:
 * const { isTyping, indicatorText, startTyping, stopTyping } = useTypingIndicator();
 * startTyping({ baseText: "Thinking", maxDots: 3, intervalMs: 350, minDurationMs: 900 });
 * // ... when your final answer is ready:
 * stopTyping();
 *
 * Options:
 * - baseText: string shown before the animated dots (default: "Thinking")
 * - maxDots: number of dots to animate (default: 3)
 * - intervalMs: ms between dot updates (default: 300)
 * - minDurationMs: minimum ms to keep typing true before allowing stop (default: 800)
 */
export default function useTypingIndicator() {
  const [isTyping, setIsTyping] = useState(false);
  const [indicatorText, setIndicatorText] = useState('Thinking...');
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);
  const optsRef = useRef({
    baseText: 'Thinking',
    maxDots: 3,
    intervalMs: 300,
    minDurationMs: 800
  });

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // PUBLIC_INTERFACE
  function startTyping(options = {}) {
    /** Starts the typing indicator with optional overrides for animation behavior. */
    const merged = {
      ...optsRef.current,
      ...options
    };
    optsRef.current = merged;

    // Reset state and start cycle
    setIsTyping(true);
    startedAtRef.current = Date.now();

    // Initialize immediately then animate
    let dots = 0;
    setIndicatorText(`${merged.baseText}${'.'.repeat(dots)}`);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      dots = (dots + 1) % (merged.maxDots + 1);
      setIndicatorText(`${merged.baseText}${'.'.repeat(dots)}`);
    }, merged.intervalMs);
  }

  // PUBLIC_INTERFACE
  function stopTyping() {
    /** Stops the typing indicator, respecting the configured minimum duration. */
    const { minDurationMs } = optsRef.current;
    const elapsed = Date.now() - (startedAtRef.current || 0);
    const remaining = Math.max(0, minDurationMs - elapsed);

    const finalize = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTyping(false);
    };

    if (remaining > 0) {
      // Ensure a minimum perceived typing time
      setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }

  return { isTyping, indicatorText, startTyping, stopTyping };
}
