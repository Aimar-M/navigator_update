import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export default function Terms() {
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

  // Don't render terms page if user is authenticated (will redirect)
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
              <Link href="/terms" className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium" data-testid="nav-terms">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors" data-testid="nav-privacy">
                Privacy Policy
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Terms and Conditions Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Navigator Terms of Service & Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Please read these Terms of Service and Privacy Policy carefully before using Navigator.
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-gray-700">
            <div className="bg-gray-50 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Navigator Terms of Service</h2>
              <p><strong>Effective Date:</strong> October 24, 2025</p>
              <p><strong>Provider:</strong> Navigator Technologies, Inc. (“Navigator,” “we,” “our,” “us”)</p>
              <p><strong>Website:</strong> <a href="https://navigatortrips.com" className="text-blue-600 underline">https://navigatortrips.com</a></p>
              <p><strong>Contact:</strong> <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a></p>

              <h3 className="text-xl font-semibold mt-8 mb-4">Pre-Launch Notice</h3>
              <p>
                Navigator Technologies, Inc. is currently operating the Navigator platform as a pre-release (“beta”) version.
                By using the Navigator app or website, you acknowledge that the platform is provided on a testing and early-access basis.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h3>
              <p>
                By accessing or using Navigator, you agree to these Terms of Service (“Terms”). If you do not agree, do not use the platform.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">2. Description of Service</h3>
              <p>
                Navigator is a group travel coordination platform designed to simplify planning and expense management for trips shared among multiple participants.
              </p>
              <ul className="list-disc list-inside">
                <li>Trip creation and itinerary sharing</li>
                <li>Member invitations and RSVP tracking</li>
                <li>Expense recording and intelligent cost-splitting</li>
                <li>Settlement facilitation through third-party services (e.g., PayPal, Venmo)</li>
              </ul>
              <p>Navigator does not act as a travel agency, booking service, financial intermediary, or money transmitter.</p>

              <h3 className="text-xl font-semibold mt-8 mb-4">3. User Accounts</h3>
              <ul className="list-disc list-inside">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your password and login credentials</li>
                <li>Be responsible for all activity under your account</li>
              </ul>
              <p>Navigator reserves the right to suspend or terminate accounts that violate these Terms.</p>

              <h3 className="text-xl font-semibold mt-8 mb-4">4. User Conduct and Responsibilities</h3>
              <ul className="list-disc list-inside">
                <li>Do not use Navigator for unlawful, fraudulent, or abusive purposes</li>
                <li>Do not impersonate others or misrepresent affiliations</li>
                <li>Do not upload harmful code or content</li>
                <li>Do not harass or harm other users</li>
                <li>Do not attempt to reverse-engineer the platform</li>
              </ul>

              <h3 className="text-xl font-semibold mt-8 mb-4">5. Payments and Expense Tracking</h3>
              <p>
                Navigator allows users to record and share group expenses and settlements. Payments via PayPal or Venmo are governed by their respective terms.
                Navigator does not process or hold funds.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">6. Trip and Content Ownership</h3>
              <p>
                You retain ownership of the content you create but grant Navigator a limited, worldwide, royalty-free license to store, process, and display it.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">7. Privacy and Data Use</h3>
              <p>
                Navigator collects and processes personal data in accordance with its Privacy Policy. Navigator does not sell personal data to third parties.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">8. Termination and Suspension</h3>
              <p>
                Navigator may suspend or terminate your account for violating these Terms. You may delete your account at any time.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">9. Intellectual Property</h3>
              <p>
                All intellectual property on the platform belongs to Navigator Technologies, Inc. You may not copy or modify any portion of the service without consent.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">10. Third-Party Services</h3>
              <p>
                Navigator integrates with external services (e.g., PayPal, Venmo, Mapbox, Google Maps APIs). Your use of these is subject to their own terms.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">11. Limitation of Liability</h3>
              <p>
                Navigator provides the platform “as is” and is not liable for data loss, payment errors, or indirect damages.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">12. Indemnification</h3>
              <p>
                You agree to defend and hold harmless Navigator Technologies, Inc. from any claims or expenses resulting from your misuse of the platform.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">13. Modifications to Terms</h3>
              <p>
                Navigator may modify these Terms periodically. Continued use of the platform after changes constitutes acceptance.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">14. Governing Law and Jurisdiction</h3>
              <p>
                These Terms are governed by the laws of Delaware, USA. Disputes will be resolved exclusively in Delaware courts.
              </p>

              <h3 className="text-xl font-semibold mt-8 mb-4">15. Contact Information</h3>
              <p>
                For questions, contact <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a>.
              </p>
            </div>

            {/* Privacy Policy */}
            <div className="bg-gray-50 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Navigator Privacy Policy</h2>
              <p><strong>Effective Date:</strong> [Insert Date]</p>
              <p><strong>Provider:</strong> Navigator Technologies, Inc.</p>
              <p><strong>Website:</strong> <a href="https://navigatortrips.com" className="text-blue-600 underline">https://navigatortrips.com</a></p>
              <p><strong>Contact:</strong> <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a></p>

              {/* You can continue adding the remaining Privacy Policy numbered sections
                  using the same structure as above (h3 headings + p or ul elements). */}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
