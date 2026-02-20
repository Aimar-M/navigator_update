import { useState, useEffect } from "react";
import { Link } from "wouter";
import logoLight from "@/assets/landing/logo-light.png";
import logoDark from "@/assets/landing/logo-dark.png";

export default function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const navClass = isScrolled ? "landing-nav landing-nav--solid" : "landing-nav landing-nav--transparent";

  return (
    <>
      <nav className={navClass}>
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img src={logoLight} alt="Navigator" className="nav-logo-light h-10 w-auto" />
            <img src={logoDark} alt="Navigator" className="nav-logo-dark h-10 w-auto" />
          </Link>

          {/* Desktop Links */}
          <ul className="hidden md:flex items-center gap-8 list-none">
            <li>
              <a href="#features" className="landing-nav__link text-sm font-medium transition-colors duration-200">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="landing-nav__link text-sm font-medium transition-colors duration-200">
                How It Works
              </a>
            </li>
            <li>
              <Link href="/about" className="landing-nav__link text-sm font-medium transition-colors duration-200">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="landing-nav__link text-sm font-medium transition-colors duration-200">
                Contact
              </Link>
            </li>
          </ul>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="landing-nav__link text-sm font-medium transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/create-trip"
              className="inline-flex items-center text-sm font-semibold bg-nav-blue text-white rounded-full px-6 py-2.5 min-h-[40px] hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 bg-transparent border-none cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
          >
            <span className="mobile-toggle-bar block w-6 h-[2px] my-[5px] transition-all duration-300" />
            <span className="mobile-toggle-bar block w-6 h-[2px] my-[5px] transition-all duration-300" />
            <span className="mobile-toggle-bar block w-6 h-[2px] my-[5px] transition-all duration-300" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-white z-[99] pt-24 px-8 pb-8 flex flex-col gap-6">
          <a
            href="#features"
            onClick={closeMobile}
            className="text-2xl font-semibold text-nav-black py-3 border-b border-nav-gray-100"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={closeMobile}
            className="text-2xl font-semibold text-nav-black py-3 border-b border-nav-gray-100"
          >
            How It Works
          </a>
          <Link
            href="/about"
            onClick={closeMobile}
            className="text-2xl font-semibold text-nav-black py-3 border-b border-nav-gray-100"
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={closeMobile}
            className="text-2xl font-semibold text-nav-black py-3 border-b border-nav-gray-100"
          >
            Contact
          </Link>
          <Link
            href="/create-trip"
            onClick={closeMobile}
            className="inline-flex items-center justify-center font-semibold bg-nav-blue text-white rounded-full px-8 py-3.5 mt-4 text-center hover:opacity-90 transition-all duration-200"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            onClick={closeMobile}
            className="inline-flex items-center justify-center font-medium text-nav-gray-500 hover:text-nav-black text-base text-center transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>
      )}
    </>
  );
}
