import { useRef, useState, useEffect } from "react";

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateVolumeFromEvent(e.nativeEvent);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateVolumeFromEvent(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateVolumeFromEvent = (e: MouseEvent) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
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
      className="volume-slider w-20 h-1.5 bg-blue-950 rounded-full cursor-pointer overflow-hidden"
      ref={sliderRef}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="volume-slider-filled h-full bg-blue-500 rounded-full" 
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
