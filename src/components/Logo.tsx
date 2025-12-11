import { Sparkles } from "lucide-react";
import { useState } from "react";

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  text?: string;
  noBox?: boolean; // New prop to show logo without box
}

export function Logo({ className = "", iconSize = 24, showText = false, text = "Naethra EMS", noBox = false }: LogoProps) {
  const [logoError, setLogoError] = useState(false);

  // Extract size from className if provided (e.g., "h-24 w-24")
  const sizeMatch = className.match(/h-(\d+)/);
  const containerSize = sizeMatch ? `h-${sizeMatch[1]} w-${sizeMatch[1]}` : 'h-8 w-8';
  const isLarge = className.includes('h-24') || className.includes('h-20') || className.includes('h-16') || className.includes('h-12');
  
  if (noBox) {
    // Render logo directly without box
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!logoError ? (
          <img 
            src="/assets/images/logo.png" 
            alt="Logo" 
            className={className || `h-${iconSize} w-${iconSize} object-contain`}
            onError={() => setLogoError(true)}
          />
        ) : (
          <Sparkles 
            className="text-primary-foreground" 
            style={{ width: `${iconSize}px`, height: `${iconSize}px` }} 
          />
        )}
        {showText && (
          <span className="font-semibold text-foreground">{text}</span>
        )}
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center justify-center rounded-lg bg-primary overflow-hidden ${containerSize}`}>
        {!logoError ? (
          <img 
            src="/assets/images/logo.png" 
            alt="Logo" 
            className={`object-contain ${isLarge ? 'p-2' : 'h-full w-full p-1.5'}`}
            onError={() => setLogoError(true)}
          />
        ) : (
          <Sparkles 
            className="text-primary-foreground" 
            style={{ width: `${iconSize}px`, height: `${iconSize}px` }} 
          />
        )}
      </div>
      {showText && (
        <span className="font-semibold text-foreground">{text}</span>
      )}
    </div>
  );
}
