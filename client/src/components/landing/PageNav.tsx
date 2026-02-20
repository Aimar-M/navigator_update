import { Link, useRoute } from "wouter";
import logoDark from "@/assets/landing/logo-dark.png";

export default function PageNav() {
  const [isAbout] = useRoute("/about");
  const [isContact] = useRoute("/contact");

  return (
    <nav className="sticky top-0 z-[100] bg-white border-b border-nav-gray-300 shadow-[0_1px_3px_rgba(0,0,0,0.06)] py-4">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        <Link href="/">
          <img src={logoDark} alt="Navigator" className="h-9 w-auto" />
        </Link>

        <ul className="flex items-center gap-8 list-none max-md:gap-5">
          <li>
            <Link
              href="/"
              className="text-sm font-medium text-nav-gray-500 hover:text-nav-black transition-colors"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className={`text-sm font-medium transition-colors ${
                isAbout ? "text-nav-black font-semibold" : "text-nav-gray-500 hover:text-nav-black"
              }`}
            >
              About
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors ${
                isContact ? "text-nav-black font-semibold" : "text-nav-gray-500 hover:text-nav-black"
              }`}
            >
              Contact
            </Link>
          </li>
        </ul>

        <Link
          href="/login"
          className="text-sm font-semibold bg-nav-blue text-white rounded-full px-6 py-2.5 min-h-[40px] inline-flex items-center hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 max-md:hidden"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
