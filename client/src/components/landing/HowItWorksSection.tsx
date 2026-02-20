import ScrollReveal from "./ScrollReveal";
import StepCard from "./StepCard";

import startHereImg from "@/assets/landing/start-here.png";
import tripInvite1Img from "@/assets/landing/tripinvite1.png";
import tripCreatedImg from "@/assets/landing/tripcreated.png";
import itineraryImg from "@/assets/landing/itinerary.png";
import chatImg from "@/assets/landing/chat.png";

export default function HowItWorksSection() {
  return (
    <section className="bg-nav-gray-100 py-32" id="how-it-works">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-24">
            <h2 className="text-h1">Three steps to your next adventure</h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-md:max-w-[400px] max-md:mx-auto">
          {/* Step 1 */}
          <ScrollReveal>
            <StepCard
              number={1}
              title="Create Your Trip"
              description="Set the destination, dates, and budget. Navigator builds your trip hub in seconds."
              image={
                <img
                  src={startHereImg}
                  alt="Navigator dashboard — Create a Trip"
                  loading="lazy"
                  className="w-full h-full object-cover aspect-[3/2]"
                />
              }
            />
          </ScrollReveal>

          {/* Step 2 */}
          <ScrollReveal delay={0.1}>
            <StepCard
              number={2}
              title="Invite Your Crew"
              description="Share a link. Friends join instantly. No downloads, no sign-up friction."
              image={
                <img
                  src={tripInvite1Img}
                  alt="Navigator trip invite page"
                  loading="lazy"
                  className="w-full h-full object-cover aspect-[3/2]"
                />
              }
            />
          </ScrollReveal>

          {/* Step 3 */}
          <ScrollReveal delay={0.2}>
            <StepCard
              number={3}
              title="Go Live It"
              description="Plan, vote, split, and chat, all in one place. Then get out there and make memories."
              image={
                <div className="overflow-visible">
                  <div className="step-collage">
                    <div className="step-collage__card step-collage__card--back">
                      <img src={tripCreatedImg} alt="Navigator trip overview" loading="lazy" />
                    </div>
                    <div className="step-collage__card step-collage__card--mid">
                      <img src={itineraryImg} alt="Navigator itinerary" loading="lazy" />
                    </div>
                    <div className="step-collage__card step-collage__card--front">
                      <img src={chatImg} alt="Navigator group chat" loading="lazy" />
                    </div>
                  </div>
                </div>
              }
            />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
