import { SiInstagram, SiTiktok } from "react-icons/si";

interface FooterProps {
  isDark?: boolean;
}

export default function Footer({ isDark = false }: FooterProps) {
  return (
    <footer
      className={`
        fixed bottom-0 left-0 right-0 z-40
        ${isDark 
          ? "bg-gradient-to-t from-black/50 via-black/30 to-transparent backdrop-blur-md border-t border-white/20 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]" 
          : "bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-sm"
        }
        transition-all duration-300
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          {/* Copyright - Left */}
          <p
            className={`
              text-xs font-light pl-2 sm:pl-4
              ${isDark ? "text-white/70" : "text-muted-foreground"}
              transition-colors duration-300
            `}
          >
            © 2025 Navigator by Navigator Technologies 1802. All rights reserved.
          </p>

          {/* Social Icons - Right */}
          <div className="flex items-center space-x-6 pr-2 sm:pr-4">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/navigatortrips/"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                transition-all duration-300 transform hover:scale-110 active:scale-95
                ${isDark
                  ? "text-white/80 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                  : "text-gray-600 hover:text-primary"
                }
              `}
              aria-label="Follow us on Instagram"
            >
              <SiInstagram className="w-5 h-5" />
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@navigatortrips"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                transition-all duration-300 transform hover:scale-110 active:scale-95
                ${isDark
                  ? "text-white/80 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                  : "text-gray-600 hover:text-primary"
                }
              `}
              aria-label="Follow us on TikTok"
            >
              <SiTiktok className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

