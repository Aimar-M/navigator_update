import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";

import "@/styles/landing.css";

import PageNav from "@/components/landing/PageNav";
import ScrollReveal from "@/components/landing/ScrollReveal";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

import heroAboutImg from "@/assets/landing/social/hero-about.jpeg";
import socialImg8 from "@/assets/landing/social/8.jpeg";
import socialImg3 from "@/assets/landing/social/3.jpeg";
import socialImg13 from "@/assets/landing/social/13.jpeg";
import socialImg9 from "@/assets/landing/social/9.jpeg";

const beliefs = [
  {
    number: "01",
    title: "Trips should bring people together, not stress them out",
    desc: "When the logistics are handled, people actually enjoy each other. That's the whole point.",
  },
  {
    number: "02",
    title: "Money conversations shouldn't be awkward",
    desc: "Real-time expense splitting means nobody's chasing Venmo requests three weeks later.",
  },
  {
    number: "03",
    title: "Everyone's voice matters",
    desc: "Built-in polls and voting so the group decides together so no one person carries the burden.",
  },
];

export default function About() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  if (!isLoading && user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white font-inter">
      <SEO page="about" />
      <PageNav />

      {/* Hero */}
      <section className="relative min-h-[55vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroAboutImg}
            alt="Friends on an overlook during a group trip"
            className="w-full h-full object-cover"
          />
          <div className="about-hero__overlay" />
        </div>
        <div className="max-w-[1200px] mx-auto px-6 w-full">
          <ScrollReveal>
            <div className="relative z-10 pb-16 max-w-[720px]">
              <h1 className="text-h1 text-white mb-3">
                The trips you'll never forget start with a plan.
              </h1>
              <p className="text-white/75 text-lg leading-relaxed">
                Navigator exists so the to get your trip out of the groupchat.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <div>
                <h2 className="text-h1 mb-8">Why we're building this</h2>
                <p className="text-lg text-nav-gray-500 leading-[1.8] mb-6">
                  The beauty of the world should be for everyone. Our happiest memories come from trips with friends, with family, with people we want to be around, in places that change how we see everything.
                </p>
                <p className="text-lg text-nav-gray-500 leading-[1.8] mb-6">
                  But planning group trips is chaos. Scattered group chats, spreadsheets nobody updates, expense math that ruins friendships. We've all been there.
                </p>
                <p className="text-lg text-nav-gray-500 leading-[1.8]">
                  Navigator is one platform to take a trip from idea to adventure. Plan together, split costs in real time, vote on decisions, and keep everything in one place so you can focus on making the memories that matter.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="aspect-[3/4] rounded-2xl overflow-hidden max-md:aspect-video max-md:-order-1">
                <img
                  src={socialImg8}
                  alt="Group of friends celebrating together"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Beliefs */}
      <section className="bg-nav-gray-100 py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <ScrollReveal>
            <div className="mb-16">
              <h2 className="text-h1 max-w-[480px]">What we believe</h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-md:gap-8">
            {beliefs.map((b, i) => (
              <ScrollReveal key={b.number} delay={i * 0.1}>
                <div className="border-t-2 border-nav-black pt-6">
                  <div className="text-xs font-semibold tracking-[0.08em] uppercase text-nav-gray-500 mb-4">
                    {b.number}
                  </div>
                  <h3 className="text-xl font-semibold text-nav-black mb-3 leading-snug">
                    {b.title}
                  </h3>
                  <p className="text-[0.9375rem] text-nav-gray-500 leading-[1.7]">
                    {b.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Break */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
        <img src={socialImg3} alt="" loading="lazy" className="w-full aspect-[4/3] max-md:aspect-video object-cover block" />
        <img src={socialImg13} alt="" loading="lazy" className="w-full aspect-[4/3] max-md:aspect-video object-cover block" />
        <img src={socialImg9} alt="" loading="lazy" className="w-full aspect-[4/3] max-md:aspect-video object-cover block" />
      </div>

      {/* Final CTA */}
      <FinalCTASection
        headline="Your next trip starts here"
        subtext="Join the people already using Navigator to travel better, together."
      />

      <LandingFooter />
    </div>
  );
}
