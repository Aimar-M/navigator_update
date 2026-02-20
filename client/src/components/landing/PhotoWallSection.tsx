import { Link } from "wouter";
import ScrollReveal from "./ScrollReveal";
import Polaroid from "./Polaroid";

import img1 from "@/assets/landing/social/1.jpg";
import img2 from "@/assets/landing/social/2.jpg";
import img3 from "@/assets/landing/social/3.jpeg";
import img4 from "@/assets/landing/social/4.jpeg";
import img5 from "@/assets/landing/social/5.jpeg";
import img6 from "@/assets/landing/social/6.jpeg";
import img7 from "@/assets/landing/social/7.jpeg";
import img8 from "@/assets/landing/social/8.jpeg";
import img9 from "@/assets/landing/social/9.jpeg";
import img10 from "@/assets/landing/social/10.jpeg";
import img11 from "@/assets/landing/social/11.jpeg";
import img12 from "@/assets/landing/social/12.jpeg";
import img13 from "@/assets/landing/social/13.jpeg";
import img14 from "@/assets/landing/social/14.jpeg";
import img15 from "@/assets/landing/social/15.jpeg";

const polaroids = [
  { src: img1,  x: "1%",  y: "0%",  r: "-6deg", z: 1 },
  { src: img2,  x: "15%", y: "4%",  r: "4deg",  z: 3 },
  { src: img3,  x: "30%", y: "-1%", r: "-3deg", z: 2 },
  { src: img4,  x: "46%", y: "3%",  r: "7deg",  z: 4 },
  { src: img5,  x: "61%", y: "-2%", r: "-5deg", z: 1 },
  { src: img6,  x: "77%", y: "2%",  r: "3deg",  z: 5 },
  { src: img7,  x: "5%",  y: "30%", r: "5deg",  z: 6 },
  { src: img8,  x: "20%", y: "26%", r: "-8deg", z: 7 },
  { src: img9,  x: "36%", y: "32%", r: "2deg",  z: 3 },
  { src: img10, x: "52%", y: "28%", r: "-4deg", z: 8 },
  { src: img11, x: "67%", y: "33%", r: "6deg",  z: 2 },
  { src: img12, x: "82%", y: "27%", r: "-3deg", z: 4 },
  { src: img13, x: "10%", y: "58%", r: "-6deg", z: 9 },
  { src: img14, x: "38%", y: "60%", r: "3deg",  z: 5 },
  { src: img15, x: "65%", y: "56%", r: "-7deg", z: 6 },
];

export default function PhotoWallSection() {
  return (
    <section className="bg-nav-gray-100 pt-16 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-4">
            <h2 className="text-h1">Every trip tells a story</h2>
            <p className="text-nav-gray-500 text-lg mt-4 leading-relaxed">
              Real moments from real Navigator trips.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8 max-md:flex-col">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 font-semibold bg-nav-blue text-white rounded-full px-8 py-3.5 min-h-[48px] hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Plan a Trip
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Scattered polaroids */}
      <div className="polaroid-table">
        {polaroids.map((p, i) => (
          <Polaroid key={i} {...p} />
        ))}
      </div>
    </section>
  );
}
