import { useEffect, useState } from 'react';

/**
 * Counts down to targetTimestamp (ms since epoch). Ticks every 1s; clears interval on unmount.
 * @param {number|null|undefined} targetTimestamp
 * @returns {{ minutes: number, seconds: number, isExpired: boolean }}
 */
export function useCountdown(targetTimestamp) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
  }, [targetTimestamp]);

  useEffect(() => {
    if (!targetTimestamp || targetTimestamp <= Date.now()) {
      return undefined;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetTimestamp]);

  const isExpired = !targetTimestamp || targetTimestamp <= now;
  const totalSec =
    targetTimestamp && targetTimestamp > now
      ? Math.max(0, Math.ceil((targetTimestamp - now) / 1000))
      : 0;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

  return { minutes, seconds, isExpired };
}
