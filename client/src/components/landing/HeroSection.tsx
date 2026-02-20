import { useEffect, useRef } from "react";
import { Link } from "wouter";
import backgroundVideo from "@/assets/IMG_4795_1758657014573.mov";
import ScrollReveal from "./ScrollReveal";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = async () => {
      try {
        video.volume = 0;
        await video.play();
      } catch (error) {
        console.log("Video autoplay prevented:", error);
      }
    };

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener("loadedmetadata", playVideo, { once: true });
    }
    video.addEventListener("canplaythrough", playVideo, { once: true });

    return () => {
      video.removeEventListener("loadedmetadata", playVideo);
      video.removeEventListener("canplaythrough", playVideo);
    };
  }, []);

  return (
    <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        >
          <source src={backgroundVideo} type="video/mp4" />
          <source src={backgroundVideo} type="video/quicktime" />
        </video>
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-[900px]">
        <ScrollReveal>
          <h1 className="text-hero text-white mb-6">
            Plan Together.<br />Split Costs.<br />Make Memories.
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className="text-white/80 mb-10 max-w-[600px] mx-auto leading-relaxed" style={{ fontSize: "clamp(1.125rem, 2vw, 1.375rem)" }}>
            The only app your crew needs to go from idea to adventure.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <div className="flex items-center justify-center gap-4 flex-wrap max-md:flex-col">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 font-semibold text-lg bg-nav-blue text-white rounded-full px-10 py-[18px] min-h-[56px] hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Get Started, It's Free
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 font-semibold text-lg bg-transparent text-white border-[1.5px] border-white rounded-full px-10 py-[18px] min-h-[56px] hover:bg-white hover:text-nav-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              See How It Works
            </a>
          </div>
        </ScrollReveal>
      </div>

      {/* Scroll Indicator */}
      <div className="hero-scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8 text-white/60"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
