import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export default function Privacy() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render privacy page if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <nav className="flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-home">
                Home
              </Link>
              <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-about">
                About
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-contact">
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Privacy Policy Content */}
      <section className="py-20 bg-white">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
        Navigator Privacy Policy
      </h1>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
        Please read this Privacy Policy carefully to understand how Navigator Technologies 1802, Inc. collects, uses, and protects your information.
      </p>
    </div>

    <div className="prose prose-lg max-w-none text-gray-700">
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <p><strong>Effective Date:</strong> November 10, 2025</p>
        <p><strong>Provider:</strong> Navigator Technologies 1802, Inc. (“Navigator,” “we,” “our,” or “us”)</p>
        <p><strong>Website:</strong> <a href="https://navigatortrips.com" className="text-blue-600 underline">https://navigatortrips.com</a></p>
        <p><strong>Contact:</strong> <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a></p>
      </div>

      {/* 1. Overview */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Overview</h2>
        <p>
          Navigator Technologies 1802, Inc. (“Navigator”) respects your privacy and is committed to protecting your personal information.
          This Privacy Policy explains how we collect, use, share, and protect information when you use the Navigator platform,
          including our mobile application and website at 
          <a href="https://navigatortrips.com" className="text-blue-600 underline"> https://navigatortrips.com</a>.
        </p>
      </div>

      {/* 2. Scope */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Scope</h2>
        <p>
          This Privacy Policy applies to all users of the Navigator platform, including trip organizers, participants,
          and visitors browsing our website. By using Navigator, you agree to the terms of this Privacy Policy.
        </p>
      </div>

      {/* 3. Information We Collect */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information We Collect</h2>

        <h3 className="text-xl font-semibold mt-6 mb-2">a. Information You Provide Directly</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li><strong>Account Information:</strong> Name, email address, profile picture, and password.</li>
          <li><strong>Trip Information:</strong> Trip names, destinations, dates, activities, and expenses.</li>
          <li><strong>Payment Preferences:</strong> PayPal address, Venmo username, or cash settlement details.</li>
          <li><strong>Communications:</strong> Messages, polls, chat logs, and feedback sent through the platform.</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-2">b. Information Collected Automatically</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Device type, operating system, and browser information.</li>
          <li>Log data (IP address, pages visited, actions performed).</li>
          <li>Usage statistics (feature engagement, session duration).</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-2">c. Information from Third Parties</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li><strong>PayPal or Venmo:</strong> To confirm transaction completion.</li>
          <li><strong>Mapping services (e.g., Mapbox, Google Maps):</strong> To provide destination-related features.</li>
        </ul>
        <p>Navigator does not receive or store full payment credentials.</p>
      </div>

      {/* 4. How We Use Information */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Use Information</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Provide, maintain, and improve the platform’s functionality.</li>
          <li>Enable trip creation, invitations, RSVPs, and expense tracking.</li>
          <li>Facilitate communication among trip members.</li>
          <li>Personalize your experience and show relevant content.</li>
          <li>Send notifications about trip updates or account activity.</li>
          <li>Detect and prevent fraud, abuse, or technical issues.</li>
          <li>Comply with applicable laws and enforce our Terms of Service.</li>
        </ul>
      </div>

      {/* 5. How We Share Information */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. How We Share Information</h2>
        <p>Navigator shares personal data only when necessary to operate the service:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>With trip members: To display shared itineraries, activities, and expenses.</li>
          <li>With third-party integrations: Such as PayPal or Venmo for settlements.</li>
          <li>With service providers: Who assist with hosting, analytics, or technical operations under confidentiality obligations.</li>
          <li>If required by law: To comply with legal obligations or respond to valid government requests.</li>
        </ul>
        <p>Navigator does not sell, rent, or trade your personal data.</p>
      </div>

      {/* 6. Data Retention */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
        <p>
          We retain your information for as long as necessary to provide the service and comply with legal obligations.
          You may request deletion of your data by contacting 
          <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline"> info@navigatortrips.com</a>.
        </p>
        <p>
          Trip-related content (e.g., expense records, itinerary items) may remain visible to other members as part of
          their historical records, even after your account is deleted.
        </p>
      </div>

      {/* 7. Data Security */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Security</h2>
        <p>
          Navigator uses industry-standard security measures to protect your data, including encryption, access controls,
          and secure servers. However, no system is 100% secure. By using the service, you acknowledge that data transmission
          over the internet carries inherent risks.
        </p>
      </div>

      {/* 8. Your Rights and Choices */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Your Rights and Choices</h2>
        <p>Depending on your location, you may have rights to:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Access, correct, or delete your personal data.</li>
          <li>Restrict or object to data processing.</li>
          <li>Request a copy of your data in a portable format.</li>
        </ul>
        <p>To exercise these rights, contact <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a>.</p>
      </div>

      {/* 9. International Data Transfers */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
        <p>
          Navigator operates primarily in the United States. If you access the platform from outside the U.S., you consent
          to the transfer and processing of your information in the United States, where data protection laws may differ from your local laws.
        </p>
      </div>

      {/* 10. Children’s Privacy */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children’s Privacy</h2>
        <p>
          Navigator is not directed to children under 16 years of age, and we do not knowingly collect personal data from minors.
          If we become aware that a child under 16 has provided information, we will promptly delete it.
        </p>
      </div>

      {/* 11. Links to Other Services */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Links to Other Services</h2>
        <p>
          Navigator may contain links to third-party websites or services. We are not responsible for the privacy practices
          or content of those sites. We encourage you to review their privacy policies before sharing any information.
        </p>
      </div>

      {/* 12. Changes to This Policy */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
        <p>
          Navigator may update this Privacy Policy from time to time. We will notify you of significant changes via email or app notification.
          Continued use of the platform after updates constitutes acceptance of the revised policy.
        </p>
      </div>

      {/* 13. Contact Us */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
        <p>
          If you have questions or concerns about this Privacy Policy, contact us at:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li><strong>Email:</strong> <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a></li>
          <li><strong>Website:</strong> <a href="https://navigatortrips.com" className="text-blue-600 underline">https://navigatortrips.com</a></li>
        </ul>
      </div>

      {/* 14. Pre-Launch Notice */}
      <div className="bg-blue-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Pre-Launch Notice</h2>
        <p>
          Navigator Technologies 1802, Inc. is currently operating the Navigator platform as an early-access (“beta”) release.
          While we take user privacy seriously, some data handling features may still be under refinement.
        </p>
        <p>
          By using the app in its pre-launch phase, you consent to reasonable testing-related data collection strictly
          for improving the platform experience.
        </p>
      </div>
    </div>
  </div>
</section>

    </div>
  );
}
