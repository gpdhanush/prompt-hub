import { useState, useCallback, useRef, useEffect } from 'react';
// @ts-ignore - Package needs to be installed: npm install react-easy-crop
import Cropper, { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Camera, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
import { API_CONFIG } from '@/lib/config';
import { logger } from '@/lib/logger';
import { getItemSync, secureStorageWithCache } from '@/lib/secureStorage';
import { Label } from '@/components/ui/label';

interface ProjectLogoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ProjectLogoUpload({ 
  value, 
  onChange, 
  className, 
  disabled
}: ProjectLogoUploadProps) {
  const API_BASE_URL = API_CONFIG.BASE_URL;
  const [imageSrc, setImageSrc] = useState<string | null>(getImageUrl(value) || null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update imageSrc when value prop changes
  useEffect(() => {
    if (value) {
      const url = getImageUrl(value);
      setImageSrc(url || null);
    } else {
      setImageSrc(null);
    }
  }, [value]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setIsDialogOpen(true);
      });
      reader.readAsDataURL(file);
    }
  }, []);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to match cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleCropAndUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // Upload to API - using employee upload endpoint for now (can be changed to project-specific endpoint later)
      const formData = new FormData();
      formData.append('file', croppedImage, 'project-logo.jpg');

      // Get token from secure storage
      let token = getItemSync('auth_token');
      if (!token) {
        token = await secureStorageWithCache.getItem('auth_token');
      }
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token || ''}`,
      };
      
      // Use employee upload endpoint for now - can be changed to project logo endpoint later
      const response = await fetch(`${API_BASE_URL}/employees/upload-profile-photo`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('Upload failed:', response.status, errorData);
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      logger.debug('Upload successful:', data);
      
      // Store the file path (relative path like /uploads/profile-photos/filename.jpg)
      onChange(data.filePath);
      setIsDialogOpen(false);
      
      // Update preview with full URL
      const fullUrl = getImageUrl(data.filePath);
      setImageSrc(fullUrl || null);
    } catch (error) {
      logger.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setImageSrc(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Project Logo</Label>
      <div className="flex items-center gap-4">
        <div className="relative">
          {imageSrc ? (
            <div className="relative w-32 h-32 border-2 border-border rounded-lg overflow-hidden bg-muted">
              <img
                src={imageSrc}
                alt="Project logo"
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                  title="Remove logo"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </div>
        {!disabled && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              {imageSrc ? 'Change Logo' : 'Upload Logo'}
            </Button>
            {imageSrc && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
              >
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Crop Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Project Logo</DialogTitle>
            <DialogDescription>
              Adjust the image to crop your project logo
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Zoom: {Math.round(zoom * 100)}%</Label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setImageSrc(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCropAndUpload}
              disabled={isUploading || !croppedAreaPixels}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Upload Logo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

