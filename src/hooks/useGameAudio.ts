import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';

const media = (name: string) => `${import.meta.env.BASE_URL}media/${name}`;
export function useGameAudio() {
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('slut-music-muted') === 'true';
    } catch {
      return false;
    }
  });
  const music = useRef<HTMLAudioElement | null>(null);
  const muteRef = useRef(muted);
  useEffect(() => {
    const track = new Audio(media('background_music.mp3'));
    track.loop = true;
    track.volume = 0.3;
    music.current = track;
    const effects = new Set<HTMLAudioElement>();
    const playMusic = () => {
      if (!muteRef.current && track.paused) void track.play().catch(() => {});
    };
    const sound = (name: string) => {
      const audio = new Audio(media(name));
      audio.volume = 0.65;
      effects.add(audio);
      audio.onended = () => {
        effects.delete(audio);
      };
      void audio.play().catch(() => effects.delete(audio));
    };
    playMusic();
    document.addEventListener('pointerdown', playMusic);
    document.addEventListener('keydown', playMusic);
    const unsubscribe = useGameStore.subscribe((current, previous) => {
      const next = current.session;
      const before = previous.session;
      if (next.game.seed !== before.game.seed || next.elapsed < before.elapsed)
        return;
      const requestIds = new Set(before.requests.map((r) => r.id));
      const messageIds = new Set(before.messages.map((m) => m.id));
      for (const request of next.requests) {
        if (!requestIds.has(request.id)) sound('email_notification.mp3');
      }
      for (const message of next.messages) {
        if (
          !messageIds.has(message.id) &&
          message.author !== 'you' &&
          message.kind !== 'request'
        ) {
          sound('chat_notification.mp3');
        }
      }
    });
    return () => {
      unsubscribe();
      track.pause();
      effects.forEach((audio) => audio.pause());
      document.removeEventListener('pointerdown', playMusic);
      document.removeEventListener('keydown', playMusic);
      music.current = null;
    };
  }, []);
  const toggleMusic = () => {
    const next = !muteRef.current;
    muteRef.current = next;
    setMuted(next);
    try {
      localStorage.setItem('slut-music-muted', String(next));
    } catch {
      /* Playback works without storage. */
    }
    if (next) music.current?.pause();
    else void music.current?.play().catch(() => {});
  };
  return { muted, toggleMusic };
}
