// src/components/video/VideoTimeAt.tsx
'use client';

import { cn } from '@/lib/utils';
import { Play, Pause } from 'lucide-react';
import { useVideoContext } from '@/contexts/video-context';

interface VideoTimeAtProps {
  startTime: number;
  endTime: number;
  children: React.ReactNode;
}

export const VideoTimeAt = ({ startTime, endTime, children }: VideoTimeAtProps) => {
  const { 
    player, 
    isPlaying, 
    currentTime,
    playSegment,
    pauseVideo 
  } = useVideoContext();

  const startTimeSeconds = startTime 
  const endTimeSeconds = endTime 

  const isCurrentSegment =
    isPlaying &&
    currentTime >= startTimeSeconds &&
    currentTime <= endTimeSeconds;

  const handleClick = () => {
    if (!player) return;
    
    if (isCurrentSegment) {
      pauseVideo();
    } else {
      playSegment(startTimeSeconds, endTimeSeconds);
    }
  };

  return (
    <div 
      className={cn(
        "group relative",
        isCurrentSegment && "bg-primary/5 rounded-lg transition-colors duration-200"
      )}
    >
      {/* Play Button */}
      {player && (
        <button
          onClick={handleClick}
          className={cn(
            // Position
            "absolute -right-8 md:-right-10 top-0",
            // Base styles
            "p-1.5 rounded-lg",
            "bg-primary/10 hover:bg-primary/20",
            "text-primary hover:text-primary/80",
            // Visibility
            "md:opacity-0 md:group-hover:opacity-100",
            isCurrentSegment && "!opacity-100",
            // Transitions
            "transition-all duration-200"
          )}
          title={`${isCurrentSegment ? 'ايقاف' : 'تشغيل'} المرئية من ${formatTime(startTimeSeconds)} الى ${formatTime(endTimeSeconds)}`}
        >
          {isCurrentSegment ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
      )}

      {children}
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};