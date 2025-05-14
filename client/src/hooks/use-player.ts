import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channel_title: string;
  duration: string;
  position?: number;
}

interface PlayerContextType {
  currentVideo: Video | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: boolean;
  queue: Video[];
  playVideo: (video: Video) => void;
  pauseVideo: () => void;
  resumeVideo: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (position: number) => void;
  nextVideo: () => void;
  previousVideo: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (video: Video) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(70);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [queue, setQueue] = useState<Video[]>([]);
  const [previousVolume, setPreviousVolume] = useState(70);
  
  // YouTube iframe API
  const playerRef = useRef<YT.Player | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Mutation to add to recent plays
  const addRecentPlayMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await apiRequest('POST', '/api/recent', { video_id: videoId });
      return res.json();
    },
    onError: (error: Error) => {
      console.error('Error adding to recent plays:', error);
    },
  });

  // Initialize YouTube API
  useEffect(() => {
    // Create container for the player if it doesn't exist
    if (!playerContainerRef.current) {
      const container = document.createElement('div');
      container.id = 'youtube-player-container';
      container.style.position = 'absolute';
      container.style.bottom = '0';
      container.style.right = '0';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);
      playerContainerRef.current = container;
    }

    // Load YouTube API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // Update progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && isPlaying) {
        const currentTime = playerRef.current.getCurrentTime() || 0;
        const videoDuration = playerRef.current.getDuration() || 0;
        setProgress(currentTime);
        setDuration(videoDuration);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Initialize the YouTube player
  const initializePlayer = () => {
    if (!window.YT || !window.YT.Player) {
      return;
    }
    
    if (playerRef.current) {
      playerRef.current.destroy();
    }
    
    playerRef.current = new window.YT.Player('youtube-player-container', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    });
  };

  // Player event handlers
  const onPlayerReady = () => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume);
    }
  };

  const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
    } else if (event.data === window.YT.PlayerState.ENDED) {
      if (repeat) {
        // Replay current video
        playerRef.current?.seekTo(0, true);
        playerRef.current?.playVideo();
      } else if (queue.length > 0) {
        // Play next in queue
        nextVideo();
      } else {
        setIsPlaying(false);
      }
    }
  };

  const onPlayerError = (event: YT.OnErrorEvent) => {
    toast({
      title: 'Playback Error',
      description: `Error code: ${event.data}. The video may be unavailable.`,
      variant: 'destructive',
    });
    
    // Try to play next video if in queue
    if (queue.length > 0) {
      nextVideo();
    }
  };

  // Player control functions
  const playVideo = (video: Video) => {
    setCurrentVideo(video);
    
    if (playerRef.current) {
      playerRef.current.loadVideoById(video.id);
      setIsPlaying(true);
      
      // Add to recent plays
      addRecentPlayMutation.mutate(video.id);
    } else {
      toast({
        title: 'Player Error',
        description: 'YouTube player is not ready yet. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const pauseVideo = () => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    }
  };

  const resumeVideo = () => {
    if (playerRef.current) {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseVideo();
    } else if (currentVideo) {
      resumeVideo();
    }
  };

  const setVolume = (newVolume: number) => {
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      setVolumeState(newVolume);
    }
  };

  const toggleMute = () => {
    if (volume === 0) {
      setVolume(previousVolume);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
    }
  };

  const seek = (position: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(position, true);
    }
  };

  const nextVideo = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const newQueue = queue.slice(1);
      setQueue(newQueue);
      playVideo(nextTrack);
    }
  };

  const previousVideo = () => {
    if (progress > 3) {
      // If we're more than 3 seconds into the song, go back to the start
      seek(0);
    } else if (currentVideo) {
      // Otherwise, add current to the front of the queue and go to previous
      setQueue([currentVideo, ...queue]);
      nextVideo();
    }
  };

  const toggleShuffle = () => {
    setShuffle(!shuffle);
    
    if (!shuffle && queue.length > 1) {
      // Shuffle the queue
      const shuffledQueue = [...queue].sort(() => Math.random() - 0.5);
      setQueue(shuffledQueue);
    }
  };

  const toggleRepeat = () => {
    setRepeat(!repeat);
  };

  const addToQueue = (video: Video) => {
    setQueue([...queue, video]);
    
    toast({
      title: 'Added to Queue',
      description: `"${video.title}" has been added to your queue.`,
    });
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const value = {
    currentVideo,
    isPlaying,
    volume,
    progress,
    duration,
    shuffle,
    repeat,
    queue,
    playVideo,
    pauseVideo,
    resumeVideo,
    togglePlay,
    setVolume,
    toggleMute,
    seek,
    nextVideo,
    previousVideo,
    toggleShuffle,
    toggleRepeat,
    addToQueue,
    clearQueue,
  };

  return React.createElement(PlayerContext.Provider, { value }, children);
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
