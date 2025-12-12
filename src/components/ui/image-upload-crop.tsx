// Note: Make sure to install react-easy-crop: npm install react-easy-crop
import { useState, useCallback, useRef, useEffect } from 'react';
// @ts-ignore - Package needs to be installed: npm install react-easy-crop
import Cropper, { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Upload, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';

interface ImageUploadCropProps {
  value?: string;
  onChange: (url: string) => void;
  aspect?: number;
  className?: string;
  disabled?: boolean;
}

export function ImageUploadCrop({ value, onChange, aspect = 1, className, disabled }: ImageUploadCropProps) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const [imageSrc, setImageSrc] = useState<string | null>(getImageUrl(value) || null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update imageSrc when value prop changes (e.g., when editing existing employee)
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

  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropAndUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // Upload to API
      const formData = new FormData();
      formData.append('file', croppedImage, 'profile-photo.jpg');

      // Get token and user from secure storage
      const { getItemSync, secureStorageWithCache } = await import('@/lib/secureStorage');
      let token = getItemSync('auth_token');
      let userStr = getItemSync('user');
      
      if (!token) {
        token = await secureStorageWithCache.getItem('auth_token');
      }
      if (!userStr) {
        userStr = await secureStorageWithCache.getItem('user');
      }
      
      let userId = null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.id;
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token || ''}`,
      };
      
      if (userId) {
        headers['user-id'] = userId.toString();
      }
      
      const response = await fetch(`${API_BASE_URL}/employees/upload-profile-photo`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Upload failed:', response.status, errorData);
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload successful:', data);
      
      // Store the file path (relative path like /uploads/profile-photos/filename.jpg)
      onChange(data.filePath);
      setIsDialogOpen(false);
      
      // Update preview with full URL
      const fullUrl = getImageUrl(data.filePath);
      setImageSrc(fullUrl || null);
    } catch (error) {
      console.error('Error uploading image:', error);
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
      <div className="flex items-center gap-4">
        {imageSrc ? (
          <div className="relative">
            <img
              src={imageSrc}
              alt="Profile preview"
              className="h-24 w-24 rounded-full object-cover border-2 border-border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            {imageSrc ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {imageSrc && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
        disabled={disabled}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Photo</DialogTitle>
            <DialogDescription>
              Adjust the image position and zoom, then click Save to upload.
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                  },
                }}
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropAndUpload}
              disabled={isUploading || !croppedAreaPixels}
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save & Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
