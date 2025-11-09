import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";

export default function About() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to dashboard (but render content first for SEO)
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  // Don't render about page if user is authenticated (will redirect)
  // But show content during loading for SEO/crawlers
  if (!isLoading && user) {
    return null;
  }
  const features = [
    {
      emoji: "🧳",
      title: "Trip Planning Made Easy",
      description: "Collaborative itineraries that keep everyone on the same page."
    },
    {
      emoji: "💰",
      title: "Smart Money Management",
      description: "Expense splitting that eliminates awkward money conversations."
    },
    {
      emoji: "💬",
      title: "Stay Connected",
      description: "Group chat and real-time updates for seamless coordination."
    },
    {
      emoji: "🗳️",
      title: "Democratic Decisions",
      description: "Polls and voting for fair group choices on everything."
    },
    {
      emoji: "📱",
      title: "All-in-One Platform",
      description: "Your entire trip lives in one place, accessible anywhere."
    },
    {
      emoji: "⚡",
      title: "Instant Settlements",
      description: "Quick, fair payment resolution made simple."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO page="about" />
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <nav className="flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-home">
                Home
              </Link>
              <Link href="/about" className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium" data-testid="nav-about">
                About
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-contact">
                Contact
              </Link>
              {/* <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-terms">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-privacy">
                Privacy Policy
              </Link> */}
            </nav>
          </div>
        </div>
      </header>
      {/* Everything You Need Section (First) */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8" data-testid="heading-everything-you-need">
              Everything You Need for Group Travel
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From planning to payments, we've got your squad covered with tools that actually work
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1" data-testid={`feature-card-${index}`}>
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4" data-testid={`feature-emoji-${index}`}>
                    {feature.emoji}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4" data-testid={`feature-title-${index}`}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed" data-testid={`feature-description-${index}`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Our Mission Section (Second) */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8" data-testid="heading-our-mission">
              Our Mission
            </h2>
            <div className="prose prose-xl prose-gray mx-auto text-left" data-testid="content-our-mission">
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                We believe the beauty of the world should be for everyone. Its wonder, mystery, and joy belong to us all. 
                Our happiest memories are born on trips with friends, with family, with classmates, in new destinations 
                that change how we see the world and each other.
              </p>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                That is why we are building Navigator. Our goal is to create the singular platform for travel. 
                One app, one site, one seamless space to move a trip from messy group chat ideas to real adventures. 
                We use technology to remove barriers, reduce chaos, and make travel easy so people everywhere can 
                create, share, and relive the memories that matter most.
              </p>
              <p className="text-xl leading-relaxed text-gray-600 font-normal">We are here to unleash the beauty of the world and to empower you, our Navigators, to move through every journey with ease and joy.
</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}