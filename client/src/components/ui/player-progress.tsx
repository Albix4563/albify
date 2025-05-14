import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PlayerProgressProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function PlayerProgress({ value, onChange, disabled = false }: PlayerProgressProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsDragging(true);
    updateProgressFromEvent(e.nativeEvent);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const position = ((e.clientX - rect.left) / rect.width) * 100;
      setHoverPosition(Math.max(0, Math.min(100, position)));

      if (isDragging) {
        updateProgressFromEvent(e);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const updateProgressFromEvent = (e: MouseEvent) => {
    if (progressRef.current && !disabled) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickPosition = e.clientX - rect.left;
      const percentage = (clickPosition / rect.width) * 100;
      onChange(Math.max(0, Math.min(100, percentage)));
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className={cn(
        "player-progress flex-1 mx-2 relative group h-1.5 bg-blue-950 rounded-full overflow-hidden",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      ref={progressRef}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        if (!isDragging) handleMouseMove(e.nativeEvent);
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="player-progress-filled h-1.5 bg-blue-500 rounded-full"
        style={{ width: `${value}%` }}
      />
      
      {hoverPosition !== null && !disabled && (
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-400 shadow-md shadow-blue-500/30"
          style={{ left: `${hoverPosition}%` }}
        />
      )}
      
      {isDragging && !disabled && (
        <div
          className="absolute -top-8 bg-blue-900 border border-blue-700 px-2 py-1 rounded text-xs text-blue-100"
          style={{ left: `${hoverPosition}%`, transform: "translateX(-50%)" }}
        >
          {Math.round(value)}%
        </div>
      )}
    </div>
  );
}
