/**
 * Image URL Utilities
 * Centralized functions for handling image URLs, especially for profile photos
 */

/**
 * Get the base URL for static assets/uploads
 * Uses environment variable VITE_STATIC_URL if set, otherwise constructs from API URL
 */
export function getStaticBaseUrl(): string {
  // Check for explicit static URL in environment
  if (import.meta.env.VITE_STATIC_URL) {
    const staticUrl = import.meta.env.VITE_STATIC_URL.trim();
    // Remove trailing slash if present
    return staticUrl.endsWith('/') ? staticUrl.slice(0, -1) : staticUrl;
  }
  
  // Otherwise, construct from API URL (remove /api if present)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const baseUrl = apiUrl.replace('/api', '').replace(/\/$/, ''); // Remove /api and trailing slash
  return baseUrl;
}

/**
 * Get full URL for a profile photo or any uploaded image
 * @param imagePath - The path stored in database (e.g., '/uploads/profile-photos/filename.jpg')
 * @returns Full URL to the image, or null if no path provided
 */
export function getImageUrl(imagePath: string | null | undefined): string | undefined {
  if (!imagePath || imagePath.trim() === '') {
    return undefined;
  }
  
  // If already a full URL, check if it's correct
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    // Fix incorrect URLs that have /api/uploads/ - should be just /uploads/
    if (imagePath.includes('/api/uploads/')) {
      const baseUrl = getStaticBaseUrl();
      const urlObj = new URL(imagePath);
      // Replace /api/uploads/ with /uploads/ in the pathname
      const correctedPath = urlObj.pathname.replace('/api/uploads/', '/uploads/');
      const correctUrl = `${baseUrl}${correctedPath}`;
      if (import.meta.env.DEV) {
        console.log('[imageUtils] Fixed incorrect URL:', { original: imagePath, corrected: correctUrl });
      }
      return correctUrl;
    }
    return imagePath;
  }
  
  // Handle data URLs
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // Clean up the path - remove /api if it's incorrectly included
  let cleanPath = imagePath.trim();
  if (cleanPath.startsWith('/api/uploads/')) {
    cleanPath = cleanPath.replace('/api/uploads/', '/uploads/');
  } else if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.replace('/api/', '/');
  }
  
  // Construct full URL from path
  const baseUrl = getStaticBaseUrl();
  // Ensure path starts with /
  const path = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const fullUrl = `${baseUrl}${path}`;
  
  // Debug logging (remove in production)
  if (import.meta.env.DEV) {
    console.log('[imageUtils] Image URL conversion:', { imagePath, cleanPath, baseUrl, fullUrl });
  }
  
  return fullUrl;
}

/**
 * Get profile photo URL (alias for getImageUrl for clarity)
 */
export function getProfilePhotoUrl(photoPath: string | null | undefined): string | undefined {
  return getImageUrl(photoPath);
}
