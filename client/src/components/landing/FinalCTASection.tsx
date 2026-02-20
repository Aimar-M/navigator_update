import { Link } from "wouter";
import ScrollReveal from "./ScrollReveal";

interface FinalCTASectionProps {
  headline?: string;
  subtext?: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function FinalCTASection({
  headline = "Your next trip starts here",
  subtext = "Stop planning in group chats. Start planning with Navigator.",
  ctaText = "Get Started, It's Free",
  ctaHref = "/login",
}: FinalCTASectionProps) {
  return (
    <section className="bg-nav-black py-32 pb-24 text-center">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <h2 className="text-h1 text-white mb-4">{headline}</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className="text-lg text-white/60 max-w-[500px] mx-auto mb-16 leading-relaxed">
            {subtext}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center gap-2 font-semibold text-lg bg-nav-blue text-white rounded-full px-10 py-[18px] min-h-[56px] hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            {ctaText}
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
