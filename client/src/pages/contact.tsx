import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

import "@/styles/landing.css";

import PageNav from "@/components/landing/PageNav";
import ScrollReveal from "@/components/landing/ScrollReveal";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Contact() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user came from Help button or Delete flow
  const [fromHelp, setFromHelp] = useState(false);
  const [fromDelete, setFromDelete] = useState(false);
  const [prefillSubject, setPrefillSubject] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFromHelp(params.get('fromHelp') === 'true');
    setFromDelete(params.get('fromDelete') === 'true');
    setPrefillSubject(params.get('subject') || '');
  }, []);

  // Helper function to extract firstName and lastName from user object
  const extractUserNames = (user: any) => {
    let firstName = '';
    let lastName = '';

    if (user.firstName && user.lastName) {
      firstName = user.firstName;
      lastName = user.lastName;
    } else if (user.name) {
      const nameParts = user.name.trim().split(/\s+/);
      if (nameParts.length > 0) {
        firstName = nameParts[0];
        if (nameParts.length > 1) {
          lastName = nameParts.slice(1).join(' ');
        }
      }
    }

    return { firstName, lastName };
  };

  // Pre-fill form when user comes from Help button or Delete flow
  useEffect(() => {
    if ((fromHelp || fromDelete) && !isLoading) {
      if (prefillSubject) {
        setFormData(prev => ({
          ...prev,
          subject: prev.subject || prefillSubject
        }));
      }

      if (user) {
        const { firstName, lastName } = extractUserNames(user);
        setFormData(prev => ({
          ...prev,
          firstName: prev.firstName || firstName,
          lastName: prev.lastName || lastName,
          email: prev.email || user.email || ''
        }));
      }
    }
  }, [fromHelp, fromDelete, user, isLoading, prefillSubject]);

  // Redirect authenticated users to dashboard
  // UNLESS they came from the Help button or Delete flow
  useEffect(() => {
    if (!isLoading && user && !fromHelp && !fromDelete) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate, fromHelp, fromDelete]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please provide a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Message Sent!",
          description: result.message,
        });

        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isLoading && user && !fromHelp && !fromDelete) {
    return null;
  }

  const inputClass = "w-full py-3 px-4 text-[0.9375rem] font-inter border border-nav-gray-300 rounded-lg bg-white text-nav-black placeholder:text-nav-gray-300 focus:outline-none focus:border-nav-black transition-colors duration-200";

  return (
    <div className="min-h-screen bg-white font-inter">
      <SEO page="contact" />
      <PageNav />

      {/* Contact Section */}
      <section className="py-32 pb-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-[5fr_4fr] gap-32 items-start max-md:gap-16">

            {/* Form Column */}
            <ScrollReveal>
              <div>
                <h1 className="text-h1 mb-2">Get in touch</h1>
                <p className="text-lg text-nav-gray-500 leading-relaxed mb-16 max-w-[460px]">
                  Questions, feedback, or just want to say hi — we'd love to hear from you.
                </p>

                <form onSubmit={handleSubmit} data-testid="contact-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label htmlFor="firstName" className="block text-[0.8125rem] font-semibold text-nav-black mb-2 tracking-[0.01em]">
                        First name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        placeholder="Jane"
                        required
                        className={inputClass}
                        value={formData.firstName}
                        onChange={handleInputChange}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-[0.8125rem] font-semibold text-nav-black mb-2 tracking-[0.01em]">
                        Last name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        required
                        className={inputClass}
                        value={formData.lastName}
                        onChange={handleInputChange}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label htmlFor="email" className="block text-[0.8125rem] font-semibold text-nav-black mb-2 tracking-[0.01em]">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="jane@example.com"
                      required
                      className={inputClass}
                      value={formData.email}
                      onChange={handleInputChange}
                      data-testid="input-email"
                    />
                  </div>

                  <div className="mb-5">
                    <label htmlFor="subject" className="block text-[0.8125rem] font-semibold text-nav-black mb-2 tracking-[0.01em]">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      placeholder="What's this about?"
                      required
                      className={inputClass}
                      value={formData.subject}
                      onChange={handleInputChange}
                      data-testid="input-subject"
                    />
                  </div>

                  <div className="mb-5">
                    <label htmlFor="message" className="block text-[0.8125rem] font-semibold text-nav-black mb-2 tracking-[0.01em]">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      placeholder="Tell us more..."
                      required
                      className={`${inputClass} min-h-[140px] resize-y`}
                      value={formData.message}
                      onChange={handleInputChange}
                      data-testid="textarea-message"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 font-semibold bg-nav-blue text-white rounded-full px-8 py-3.5 min-h-[48px] hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    data-testid="button-send-message"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </button>
                </form>
              </div>
            </ScrollReveal>

            {/* Aside Column */}
            <ScrollReveal delay={0.1}>
              <div className="pt-2 max-md:-order-1">
                <div className="aspect-square max-md:aspect-video rounded-2xl overflow-hidden mb-16">
                  <img
                    src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=800&fit=crop"
                    alt="Friends laughing together on a trip"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="mb-6">
                  <div className="text-xs font-semibold tracking-[0.06em] uppercase text-nav-gray-500 mb-1.5">
                    Email
                  </div>
                  <div className="text-base text-nav-black leading-relaxed">
                    <a
                      href="mailto:info@navigatortrips.com"
                      className="text-nav-black underline decoration-nav-gray-300 underline-offset-[3px] hover:decoration-nav-black transition-colors duration-200"
                    >
                      info@navigatortrips.com
                    </a>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-xs font-semibold tracking-[0.06em] uppercase text-nav-gray-500 mb-1.5">
                    Social
                  </div>
                  <div className="text-base text-nav-black leading-relaxed">
                    <a
                      href="https://www.instagram.com/navigatortrips/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-nav-black underline decoration-nav-gray-300 underline-offset-[3px] hover:decoration-nav-black transition-colors duration-200"
                    >
                      Instagram
                    </a>
                    <span className="mx-1">&middot;</span>
                    <a
                      href="https://www.tiktok.com/@navigatortrips"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-nav-black underline decoration-nav-gray-300 underline-offset-[3px] hover:decoration-nav-black transition-colors duration-200"
                    >
                      TikTok
                    </a>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-xs font-semibold tracking-[0.06em] uppercase text-nav-gray-500 mb-1.5">
                    Response time
                  </div>
                  <div className="text-base text-nav-black leading-relaxed">
                    Usually within 24 hours
                  </div>
                </div>
              </div>
            </ScrollReveal>

          </div>
        </div>
      </section>

      <FinalCTASection />
      <LandingFooter />
    </div>
  );
}
