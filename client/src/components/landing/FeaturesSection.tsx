import FeatureRow from "./FeatureRow";
import FeatureCollage from "./FeatureCollage";
import ScrollReveal from "./ScrollReveal";

import itineraryImg from "@/assets/landing/itineraryv2.jpeg";
import splitExpensesImg from "@/assets/landing/split-expenses.png";
import settledExpensesImg from "@/assets/landing/settled-expenses.png";
import chatImg from "@/assets/landing/chat.png";
import tripInvite1Img from "@/assets/landing/tripinvite1.png";
import tripInvite2Img from "@/assets/landing/tripinvite2.png";
import decisionsImg from "@/assets/landing/decisions.png";

export default function FeaturesSection() {
  return (
    <section className="bg-white pt-16 pb-32" id="features">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-24">
            <h2 className="text-h1">All Your Trip Needs in One Place</h2>
            <p className="text-nav-gray-500 max-w-[560px] mx-auto mt-4 text-lg">
              From the first idea to the last sunset, Navigator keeps your crew organized, connected, and on budget.
            </p>
          </div>
        </ScrollReveal>

        {/* Feature 1: Itineraries */}
        <FeatureRow
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-nav-blue">
              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            </svg>
          }
          title="Collaborative Itineraries"
          description="Build your trip plan together in real time. See the latest schedule, vote on activities, and stay in the loop. No more scattered Docs and Sheets."
          image={
            <img
              src={itineraryImg}
              alt="Navigator itinerary view"
              loading="lazy"
              className="w-full h-auto object-contain rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
            />
          }
          ctaText="Start planning together →"
          ctaHref="/create-trip"
        />

        {/* Feature 2: Expense Splitting */}
        <FeatureRow
          reverse
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-nav-blue">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          title="Smart Expense Splitting"
          description="Track expenses easily. Connect your expenses to trip participants and activities while Navigator does the rest. Navigator calculates who owes what. No more awkward payment requests, just settle up in Navigator."
          image={
            <FeatureCollage
              variant="expenses"
              mainImg={splitExpensesImg}
              mainAlt="Navigator add expense modal"
              overlapImg={settledExpensesImg}
              overlapAlt="Navigator expense overview — who owes what"
            />
          }
          ctaText="Track and split expenses →"
          ctaHref="/create-trip"
        />

        {/* Feature 3: Group Chat */}
        <FeatureRow
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-nav-blue">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
          title="Built-in Group Chat"
          description="Keep all trip conversations in one place. Share links, photos, and polls without losing them in a sea of family and work messages."
          image={
            <img
              src={chatImg}
              alt="Navigator group chat"
              loading="lazy"
              className="w-full h-auto object-contain rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
            />
          }
          ctaText="Chat with your crew →"
          ctaHref="/create-trip"
        />

        {/* Feature 4: Easy Invites */}
        <FeatureRow
          reverse
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-nav-blue">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          }
          title="One Link, Everyone's In"
          description="Share a single invite link and your whole crew joins instantly. No app downloads required, no sign-up hoops. Just tap and you're in!"
          image={
            <FeatureCollage
              variant="portrait"
              mainImg={tripInvite1Img}
              mainAlt="Navigator trip invite — You're Invited"
              overlapImg={tripInvite2Img}
              overlapAlt="Navigator trip details and itinerary preview"
            />
          }
          ctaText="Share your invite link →"
          ctaHref="/create-trip"
        />

        {/* Feature 5: Democratic Decisions */}
        <FeatureRow
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-nav-blue">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          }
          title="Democratic Decisions"
          description="Can't decide on where to eat dinner or which museum to visit first? Put it to a vote. Navigator's polling system lets the group decide. It's fair, fast, and drama-free."
          image={
            <img
              src={decisionsImg}
              alt="Navigator polls and voting"
              loading="lazy"
              className="w-full h-auto object-contain rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
            />
          }
          ctaText="Create a group vote →"
          ctaHref="/create-trip"
        />
      </div>
    </section>
  );
}
