import { Link } from "wouter";

export default function LandingFooter() {
  return (
    <footer className="bg-nav-black py-16 pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col gap-10">
          {/* Columns */}
          <div className="flex justify-between gap-12 max-md:flex-col max-md:gap-8 max-md:text-center">
            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-[0.05em] mb-4">
                Company
              </h4>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <Link href="/about" className="text-sm text-white/50 hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-white/50 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-[0.05em] mb-4">
                Legal
              </h4>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <Link href="/terms" className="text-sm text-white/50 hover:text-white transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-white/50 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-[0.05em] mb-4">
                Follow Us
              </h4>
              <div className="flex items-center gap-5 max-md:justify-center">
                <a
                  href="https://www.instagram.com/navigatortrips/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@navigatortrips"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.37-6.23V9.34a8.16 8.16 0 0 0 4.85 1.58V7.49a4.85 4.85 0 0 1-1-.8z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/10 pt-6 max-md:text-center">
            <p className="text-xs text-white/35">
              &copy; 2025 Navigator Technologies 1802, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
