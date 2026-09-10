import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
export function useLiveClock() {
  const paused = useGameStore((s) => s.session.paused);
  const speed = useGameStore((s) => s.session.speed);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) useGameStore.getState().setPaused(true);
    };
    document.addEventListener('visibilitychange', visibility);
    const flush = () => useGameStore.getState().setPaused(true);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
  useEffect(() => {
    if (paused) return;
    let previous = performance.now();
    let accumulated = 0;
    const timer = window.setInterval(() => {
      const now = performance.now();
      accumulated += Math.min(1000, now - previous) * speed;
      previous = now;
      const seconds = Math.floor(accumulated / 1000);
      if (seconds > 0 && !document.hidden) {
        accumulated -= seconds * 1000;
        useGameStore.getState().tick(seconds);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [paused, speed]);
}
