import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  className?: string;
}

export default function ImageGallery({ images, className = '' }: ImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
  };

  const nextImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % images.length);
    }
  };

  const previousImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'ArrowLeft') {
      previousImage();
    }
  };

  // Determine grid layout based on number of images
  const getGridLayout = () => {
    switch (images.length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2 gap-1';
      case 3:
        return 'grid-cols-3 gap-1';
      case 4:
        return 'grid-cols-2 gap-1';
      default:
        return 'grid-cols-3 gap-1';
    }
  };

  // Get image dimensions based on count and position
  const getImageClasses = (index: number) => {
    if (images.length === 1) {
      return 'w-full h-auto max-h-80 object-cover rounded';
    }
    
    if (images.length === 2) {
      return 'w-full h-32 md:h-40 object-cover rounded';
    }
    
    if (images.length === 3) {
      if (index === 0) {
        return 'w-full h-32 md:h-40 object-cover rounded col-span-2 row-span-2';
      }
      return 'w-full h-16 md:h-20 object-cover rounded';
    }
    
    if (images.length === 4) {
      return 'w-full h-24 md:h-32 object-cover rounded';
    }
    
    // 5+ images
    if (index < 3) {
      return 'w-full h-20 md:h-24 object-cover rounded';
    }
    return 'w-full h-16 md:h-20 object-cover rounded';
  };

  return (
    <>
      {/* Image Grid */}
      <div className={`grid ${getGridLayout()} mb-2`}>
        {images.map((image, index) => (
          <div
            key={index}
            className={`cursor-pointer overflow-hidden ${index >= 6 ? 'hidden' : ''}`}
            onClick={() => openLightbox(index)}
          >
            <img
              src={image}
              alt={`Image ${index + 1}`}
              className={getImageClasses(index)}
              loading="lazy"
            />
            {index === 5 && images.length > 6 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                <span className="text-white text-sm font-medium">
                  +{images.length - 6} more
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  previousImage();
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
              {selectedImageIndex + 1} / {images.length}
            </div>
          )}

          {/* Main image */}
          <img
            src={images[selectedImageIndex]}
            alt={`Image ${selectedImageIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
