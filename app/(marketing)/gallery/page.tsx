"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { galleryItems, galleryConfig } from "@/lib/config/gallery";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { Video } from "@/lib/types/video.type";

export default function GalleryPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const { data: videos, loading: videosLoading } = useFirebaseRealtime<Video>(
    "videos",
    {
      asArray: true,
    },
  );

  const openPhoto = (index: number) => {
    setActiveIndex(index);
    setZoom(1);
  };

  const closePhoto = () => {
    setActiveIndex(null);
    setZoom(1);
  };

  const showPrevious = useCallback(() => {
    setZoom(1);
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current - 1 + galleryItems.length) % galleryItems.length;
    });
  }, []);

  const showNext = useCallback(() => {
    setZoom(1);
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current + 1) % galleryItems.length;
    });
  }, []);

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePhoto();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, showNext, showPrevious]);

  const handleZoomIn = () => {
    setZoom((value) => Math.min(3, value + 0.3));
  };

  const handleZoomOut = () => {
    setZoom((value) => Math.max(1, value - 0.3));
  };

  const currentItem = activeIndex !== null ? galleryItems[activeIndex] : null;

  return (
    <section className="relative w-full bg-gradient-to-b from-background via-background to-muted/20 py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <header className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            Gallery
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            {galleryConfig.title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {galleryConfig.description} Browse highlights from our{" "}
            <span className="font-semibold text-foreground">photo gallery</span>{" "}
            and{" "}
            <span className="font-semibold text-foreground">event videos</span>.
          </p>
        </header>

        <Tabs defaultValue="videos" className="w-full space-y-6">
          <TabsList className="flex">
            <TabsTrigger value="videos" className="flex-1">
              Videos
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex-1">
              Photos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-6">
            {videosLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm h-[300px] animate-pulse"
                  >
                    <div className="bg-muted h-full w-full" />
                  </div>
                ))}
              </div>
            ) : (videos as Video[]).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No videos available at the moment.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {(videos as Video[]).map((video) => (
                  <article
                    key={video.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                  >
                    <AspectRatio ratio={16 / 9} className="bg-muted">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.youtubeId}`}
                        title={video.title}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="h-full w-full rounded-t-2xl border-b border-border"
                      />
                    </AspectRatio>
                    <div className="space-y-1.5 p-4 sm:p-5">
                      <h2 className="text-sm sm:text-base font-semibold text-foreground">
                        {video.title}
                      </h2>
                      {video.description ? (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {video.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-6">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {galleryItems.map((item, index) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPhoto(index)}
                  onKeyDown={(event) =>
                    (event.key === "Enter" || event.key === " ") &&
                    openPhoto(index)
                  }
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <AspectRatio ratio={4 / 3} className="relative bg-muted">
                    <Image
                      src={item.url}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80" />
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 space-y-1.5">
                      <h2 className="text-sm sm:text-base font-semibold text-white">
                        {item.title}
                      </h2>
                      <p className="hidden sm:block text-xs text-white/80 leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </AspectRatio>
                </article>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {currentItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={closePhoto}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePhoto}
              className="absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-full bg-black/70 text-white shadow-md hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close image viewer"
            >
              <X className="size-5" />
            </button>

            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white shadow-md hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-6" />
            </button>

            <button
              type="button"
              onClick={showNext}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white shadow-md hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Next image"
            >
              <ChevronRight className="size-6" />
            </button>

            <div className="overflow-hidden rounded-2xl border border-border/60 bg-black/60 shadow-xl">
              <AspectRatio
                ratio={16 / 9}
                className="relative bg-black"
                onWheel={(event) => {
                  event.preventDefault();
                  const direction = event.deltaY < 0 ? 1 : -1;
                  setZoom((value) => {
                    const next = value + direction * 0.2;
                    return Math.min(3, Math.max(1, next));
                  });
                }}
              >
                <Image
                  src={currentItem.url}
                  alt={currentItem.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="object-contain"
                  style={{
                    transform: `scale(${zoom})`,
                    transition: "transform 200ms ease-out",
                  }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4 sm:pb-6">
                  <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs sm:text-sm text-white shadow-lg">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/40 px-2.5 py-1 text-xs sm:text-sm font-medium hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="size-4" />
                      <span className="hidden sm:inline">Zoom out</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/60 bg-primary/30 px-2.5 py-1 text-xs sm:text-sm font-semibold text-white hover:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="size-4" />
                      <span className="hidden sm:inline">Zoom in</span>
                    </button>
                  </div>
                </div>
              </AspectRatio>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
