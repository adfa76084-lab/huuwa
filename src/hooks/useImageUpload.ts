import { useState, useCallback } from 'react';
import { pickImage, pickMultipleImages } from '@/services/media/imageUploader';

export function useImageUpload(maxImages: number = 4) {
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addImage = useCallback(async () => {
    if (images.length >= maxImages) return;
    const uri = await pickImage();
    if (uri) {
      setImages((prev) => [...prev, uri]);
    }
  }, [images.length, maxImages]);

  const addMultipleImages = useCallback(async () => {
    const remaining = maxImages - images.length;
    if (remaining <= 0) return;
    const uris = await pickMultipleImages(remaining);
    if (uris.length > 0) {
      setImages((prev) => [...prev, ...uris].slice(0, maxImages));
    }
  }, [images.length, maxImages]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return {
    images,
    isUploading,
    setIsUploading,
    addImage,
    addMultipleImages,
    removeImage,
    clearImages,
  };
}
