import { useLocation } from "wouter";
import { SiInstagram, SiTiktok } from "react-icons/si";

export default function Footer() {
  const [location] = useLocation();
  const isLandingPage = location === "/";

  return (
    <footer
      className={`
        fixed bottom-0 left-0 right-0 z-40
        ${isLandingPage 
          ? "bg-gradient-to-t from-black/50 via-black/30 to-transparent backdrop-blur-md border-t border-white/20 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]" 
          : "bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-sm"
        }
        transition-all duration-300
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
        <div className="flex flex-col items-center justify-center space-y-3">
          {/* Social Icons */}
          <div className="flex items-center justify-center space-x-6">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/navigatortrips/"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                transition-all duration-300 transform hover:scale-125 active:scale-95
                ${isLandingPage
                  ? "text-white/90 hover:text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  : "text-gray-600 hover:text-primary hover:shadow-lg"
                }
                rounded-full p-2
              `}
              aria-label="Follow us on Instagram"
            >
              <SiInstagram className="w-6 h-6 md:w-7 md:h-7" />
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@navigatortrips"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                transition-all duration-300 transform hover:scale-125 active:scale-95
                ${isLandingPage
                  ? "text-white/90 hover:text-white hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  : "text-gray-600 hover:text-primary hover:shadow-lg"
                }
                rounded-full p-2
              `}
              aria-label="Follow us on TikTok"
            >
              <SiTiktok className="w-6 h-6 md:w-7 md:h-7" />
            </a>
          </div>

          {/* Copyright */}
          <p
            className={`
              text-xs md:text-sm text-center font-light
              ${isLandingPage ? "text-white/75" : "text-muted-foreground"}
              transition-colors duration-300
            `}
          >
            © 2025 Navigator by Navigator Technologies 1802
          </p>
        </div>
      </div>
    </footer>
  );
}

