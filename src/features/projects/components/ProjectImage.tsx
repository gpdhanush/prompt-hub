import { useState } from "react";
import { ImageIcon } from "lucide-react";

interface ProjectImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const ProjectImage = ({ src, alt, className }: ProjectImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (imageError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        setImageError(true);
        setImageLoading(false);
      }}
      onLoad={() => setImageLoading(false)}
      style={{ display: imageLoading ? 'none' : 'block' }}
    />
  );
};

