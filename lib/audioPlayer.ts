const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || "https://stream.zeno.fm/86q7qquyd5zuv";

export type PlayerState = {
  isPlaying: boolean;
  volume: number;
  mode: "radio" | "offline";
  // Legacy fields (kept for backward compat with offline page)
  currentTrackId: string | null;
  currentTrackTitle: string | null;
  currentTrackArtist: string | null;
  // New fields for Media Session and MiniPlayer
  currentTitle: string | null;
  currentArtist: string | null;
  currentImage: string | null;
  currentUrl: string | null;
  isLive: boolean;
};

type StateListener = (state: PlayerState) => void;

class AudioPlayerSingleton {
  private audio: HTMLAudioElement | null = null;
  private listeners: Set<StateListener> = new Set();
  private state: PlayerState = {
    isPlaying: false,
    volume: 0.5,
    mode: "radio",
    currentTrackId: null,
    currentTrackTitle: "UNDER Hits Radio",
    currentTrackArtist: "En vivo",
    currentTitle: "UNDER Hits Radio",
    currentArtist: "En vivo",
    currentImage: "/icons/icon-192.png",
    currentUrl: null,
    isLive: true,
  };

  private queue: Array<{
    id: string
    url: string
    titulo: string
    artista?: string
    imageUrl?: string
  }> = []
  private queueIndex: number = -1

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
    this.updateMediaSession(this.state);
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.volume = this.state.volume;
      this.audio.preload = "metadata";

      this.audio.addEventListener("play", () => {
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      });

      this.audio.addEventListener("pause", () => {
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
      });

      this.audio.addEventListener("ended", () => {
        this.state = { ...this.state, isPlaying: false };
        this.listeners.forEach((l) => l({ ...this.state }));
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "none";
        }
        if (this.hasNext()) {
          setTimeout(() => this.playNext(), 500);
        }
      });

      this.audio.addEventListener("timeupdate", () => {
        if ("mediaSession" in navigator && this.audio && this.audio.duration) {
          try {
            navigator.mediaSession.setPositionState({
              duration: this.audio.duration,
              playbackRate: this.audio.playbackRate,
              position: this.audio.currentTime,
            });
          } catch {}
        }
      });

      this.audio.addEventListener("loadedmetadata", () => {
        this.updateMediaSession(this.state);
      });
    }
    return this.audio;
  }

  async playRadio() {
    const audio = this.getAudio();
    if (audio.src !== STREAM_URL) {
      audio.src = STREAM_URL;
    }
    try {
      await audio.play();
      this.state = {
        ...this.state,
        isPlaying: true,
        mode: "radio",
        isLive: true,
        currentTrackId: null,
        currentTrackTitle: "UNDER Hits Radio",
        currentTrackArtist: "En vivo",
        currentTitle: "UNDER Hits Radio",
        currentArtist: "En vivo",
        currentImage: "/icons/icon-192.png",
        currentUrl: STREAM_URL,
      };
      this.notify();
    } catch {
      // Autoplay blocked
    }
  }

  pauseRadio() {
    this.getAudio().pause();
    this.state = { ...this.state, isPlaying: false };
    this.notify();
  }

  toggleRadio() {
    if (this.state.mode === "offline" || !this.state.isPlaying) {
      this.playRadio();
    } else {
      this.pauseRadio();
    }
  }

  toggle() {
    if (this.state.isPlaying) {
      this.getAudio().pause();
      this.state = { ...this.state, isPlaying: false };
      this.notify();
    } else if (this.state.currentUrl) {
      this.getAudio().play().catch(console.error);
      this.state = { ...this.state, isPlaying: true };
      this.notify();
    } else {
      this.playRadio();
    }
  }

  async playOffline(
    id: string,
    audioUrl: string,
    titulo: string,
    artista?: string,
    imageUrl?: string
  ) {
    const audio = this.getAudio();
    audio.src = audioUrl;
    try {
      await audio.play();
      this.state = {
        ...this.state,
        isPlaying: true,
        mode: "offline",
        isLive: false,
        currentTrackId: id,
        currentTrackTitle: titulo,
        currentTrackArtist: artista || "",
        currentTitle: titulo,
        currentArtist: artista || "",
        currentImage: imageUrl || "/icons/icon-192.png",
        currentUrl: audioUrl,
      };
      const idxInQueue = this.queue.findIndex(q => q.id === id)
      if (idxInQueue !== -1) this.queueIndex = idxInQueue
      this.notify();
    } catch (e) {
      console.error("playOffline error:", e);
    }
  }

  stopOffline() {
    const audio = this.getAudio();
    audio.pause();
    audio.src = "";
    this.state = {
      ...this.state,
      isPlaying: false,
      mode: "radio",
      isLive: true,
      currentTrackId: null,
      currentTrackTitle: "UNDER Hits Radio",
      currentTrackArtist: "En vivo",
      currentTitle: "UNDER Hits Radio",
      currentArtist: "En vivo",
      currentImage: "/icons/icon-192.png",
      currentUrl: null,
    };
    this.notify();
  }

  setQueue(
    items: Array<{
      id: string
      url: string
      titulo: string
      artista?: string
      imageUrl?: string
    }>,
    startIndex: number = 0
  ) {
    this.queue = items
    this.queueIndex = startIndex
  }

  hasNext(): boolean {
    return this.queue.length > 0 && this.queueIndex < this.queue.length - 1
  }

  hasPrev(): boolean {
    return this.queue.length > 0 && this.queueIndex > 0
  }

  async playNext() {
    if (!this.hasNext()) return
    this.queueIndex++
    const item = this.queue[this.queueIndex]
    await this.playOffline(item.id, item.url, item.titulo, item.artista, item.imageUrl)
  }

  async playPrev() {
    if (!this.hasPrev()) return
    this.queueIndex--
    const item = this.queue[this.queueIndex]
    await this.playOffline(item.id, item.url, item.titulo, item.artista, item.imageUrl)
  }

  getQueueInfo(): { index: number; total: number } {
    return { index: this.queueIndex, total: this.queue.length }
  }

  setVolume(volume: number) {
    this.state = { ...this.state, volume };
    if (this.audio) this.audio.volume = volume;
    this.notify();
  }

  private updateMediaSession(state: PlayerState) {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.currentTitle || "UNDER Hits Radio",
      artist: state.currentArtist || (state.isLive ? "En vivo" : ""),
      album: "UNDER Hits Radio",
      artwork: [
        {
          src: state.currentImage || "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      this.getAudio().play().catch(console.error);
      this.state = { ...this.state, isPlaying: true };
      this.listeners.forEach((l) => l({ ...this.state }));
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      this.getAudio().pause();
      this.state = { ...this.state, isPlaying: false };
      this.listeners.forEach((l) => l({ ...this.state }));
    });

    try {
      navigator.mediaSession.setActionHandler("stop", () => {
        this.getAudio().pause();
        this.state = { ...this.state, isPlaying: false };
        this.listeners.forEach((l) => l({ ...this.state }));
      });
    } catch {}

    try {
      if (!state.isLive && this.queue.length > 1) {
        navigator.mediaSession.setActionHandler(
          'previoustrack',
          this.hasPrev() ? () => this.playPrev() : null
        )
        navigator.mediaSession.setActionHandler(
          'nexttrack',
          this.hasNext() ? () => this.playNext() : null
        )
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
      }
    } catch {}

    if (!state.isLive) {
      try {
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details.seekTime !== undefined && this.audio) {
            this.audio.currentTime = details.seekTime;
          }
        });
        navigator.mediaSession.setActionHandler("seekforward", (details) => {
          if (this.audio) this.audio.currentTime += details.seekOffset || 10;
        });
        navigator.mediaSession.setActionHandler("seekbackward", (details) => {
          if (this.audio) this.audio.currentTime -= details.seekOffset || 10;
        });
      } catch {}
    }
  }
}

let instance: AudioPlayerSingleton | null = null;

export function getAudioPlayer(): AudioPlayerSingleton {
  if (typeof window === "undefined") {
    return new AudioPlayerSingleton();
  }
  if (!instance) instance = new AudioPlayerSingleton();
  return instance;
}
