export type NotificationSound =
  'email_notification.mp3' | 'chat_notification.mp3';

export function createNotificationAudio(onError: (message: string) => void) {
  let context: AudioContext | undefined;
  let disposed = false;
  const buffers = new Map<NotificationSound, Promise<AudioBuffer>>();
  const load = (name: NotificationSound) => {
    let buffer = buffers.get(name);
    if (!buffer) {
      buffer = fetch(`${import.meta.env.BASE_URL}media/${name}`)
        .then((response) => {
          if (!response.ok) throw new Error('Notification download failed');
          return response.arrayBuffer();
        })
        .then((data) => context!.decodeAudioData(data));
      buffers.set(name, buffer);
      void buffer.catch(() => buffers.delete(name));
    }
    return buffer;
  };
  const unlock = () => {
    if (disposed) return;
    try {
      context ??= new AudioContext();
      // Resume synchronously within a click/key gesture, before fetching assets.
      if (context.state !== 'running')
        void context.resume().catch(() => {
          onError(
            "Notification audio is blocked. Check this browser tab's sound permissions.",
          );
        });
      for (const name of [
        'email_notification.mp3',
        'chat_notification.mp3',
      ] as const)
        void load(name).catch(() =>
          onError('Notification sounds could not load. Refresh to retry.'),
        );
    } catch {
      onError('Notification audio is unavailable in this browser.');
    }
  };
  return {
    unlock,
    async play(name: NotificationSound) {
      if (disposed || !context) return;
      try {
        const buffer = await load(name);
        if (disposed) return;
        if (context.state !== 'running') {
          onError('Click the game to enable notification sounds.');
          return;
        }
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        gain.gain.value = 0.85;
        source.connect(gain);
        gain.connect(context.destination);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        source.start();
        onError('');
      } catch {
        if (!disposed)
          onError(
            "Notification sounds could not play. Check the tab's sound permissions.",
          );
      }
    },
    dispose() {
      disposed = true;
      if (context) void context.close().catch(() => {});
    },
  };
}
