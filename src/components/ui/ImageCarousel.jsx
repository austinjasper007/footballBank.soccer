"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImageCarousel({ images, alt, className = "" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Filter out empty strings and invalid URLs
  const validImages = images
    ? images.filter((img) => img && img.trim() !== "")
    : [];

  // Auto-advance carousel
  useEffect(() => {
    if (!isPlaying || isHovered || validImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % validImages.length);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [isPlaying, isHovered, validImages.length]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? validImages.length - 1 : prevIndex - 1,
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % validImages.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (!validImages || validImages.length === 0) {
    return (
      <div
        className={`w-full h-64 md:h-96 bg-gray-200 rounded flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500">No Images Available</p>
        </div>
      </div>
    );
  }

  if (validImages.length === 1) {
    return (
      <div className={`relative ${className}`}>
        {/* <Image
          src={validImages[0]}
          alt={alt}
          width={1200}
          height={600}
          className="w-full h-64 md:h-96 object-cover rounded"
        /> */}
        <div className="relative aspect-video w-full overflow-hidden rounded bg-gray-100">
          <Image
            src={validImages[currentIndex]}
            alt={`${alt} - Image ${currentIndex + 1}`}
            fill
            className="w-full object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Image */}
      <div className="relative overflow-hidden rounded">
        {/* <Image
          src={validImages[currentIndex]}
          alt={`${alt} - Image ${currentIndex + 1}`}
          width={1200}
          height={600}
          className="w-full h-64 md:h-96 object-cover rounded transition-transform duration-500 ease-in-out"
        /> */}
        <div className="relative aspect-video w-full overflow-hidden rounded bg-gray-100">
          <Image
            src={validImages[currentIndex]}
            alt={`${alt} - Image ${currentIndex + 1}`}
            fill
            className="w-full object-contain"
          />
        </div>

        {/* Overlay for controls */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
        onClick={goToPrevious}
        aria-label="Previous image"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
        onClick={goToNext}
        aria-label="Next image"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Play/Pause Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
        onClick={togglePlayPause}
        aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {validImages.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "bg-white scale-125"
                : "bg-white/50 hover:bg-white/75"
            }`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
        {currentIndex + 1} / {validImages.length}
      </div>
    </div>
  );
}
