import ScrollReveal from "./ScrollReveal";

const testimonials = [
  {
    quote: "Navigator saved our friendships. No more 'who paid for what' arguments. Everything was tracked and settled before we even got home.",
    name: "Sarah M.",
    role: "Organized 3 group trips",
    avatar: "https://i.pravatar.cc/88?img=11",
  },
  {
    quote: "I used to dread planning group trips. Now I just create a trip on Navigator, drop the link, and everyone handles their own stuff. Game changer.",
    name: "Marcus J.",
    role: "Weekend trip regular",
    avatar: "https://i.pravatar.cc/88?img=12",
  },
  {
    quote: "The polling feature is undefeated. We went from 47 messages debating hotels to one quick vote. Everyone felt heard, nobody got annoyed.",
    name: "Priya K.",
    role: "Planned a 15-person trip",
    avatar: "https://i.pravatar.cc/88?img=16",
  },
];

export default function TestimonialsSection() {
  // Hidden for now, matching the static HTML state (display: none on .testimonials)
  return (
    <section className="hidden bg-nav-gray-100 py-32">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-24">
            <h2 className="text-h1">What travelers are saying</h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-md:max-w-[500px] max-md:mx-auto">
          {testimonials.map((t, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="bg-white border border-nav-gray-300 rounded-2xl p-8">
                <p className="text-[1.0625rem] leading-[1.7] text-nav-black mb-6">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <img
                    className="w-11 h-11 rounded-full object-cover bg-nav-gray-300"
                    src={t.avatar}
                    alt={t.name}
                  />
                  <div>
                    <div className="font-semibold text-[0.9375rem]">{t.name}</div>
                    <div className="text-[0.8125rem] text-nav-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
