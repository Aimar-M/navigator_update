import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Legal() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

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

  // Don't render legal page if user is authenticated (will redirect)
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

      {/* Legal Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={activeTab === 'terms' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('terms')}
                className={`px-6 py-2 rounded-md transition-all ${
                  activeTab === 'terms' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Terms & Conditions
              </Button>
              <Button
                variant={activeTab === 'privacy' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('privacy')}
                className={`px-6 py-2 rounded-md transition-all ${
                  activeTab === 'privacy' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Privacy Policy
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-gray-700">
            {activeTab === 'terms' ? (
              <div className="bg-gray-50 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Navigator Terms of Service</h2>
                <p><strong>Effective Date:</strong> October 24, 2025</p>
                <p><strong>Provider:</strong> Navigator Technologies, Inc. ("Navigator," "we," "our," "us")</p>
                <p><strong>Website:</strong> <a href="https://navigatortrips.com" className="text-blue-600 underline">https://navigatortrips.com</a></p>
                <p><strong>Contact:</strong> <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a></p>

                <h3 className="text-xl font-semibold mt-8 mb-4">Pre-Launch Notice</h3>
                <p>
                  Navigator Technologies, Inc. is currently operating the Navigator platform as a pre-release ("beta") version.
                  By using the Navigator app or website, you acknowledge that the platform is provided on a testing and early-access basis.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h3>
                <p>
                  By accessing or using Navigator, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the platform.
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
                  Navigator provides the platform "as is" and is not liable for data loss, payment errors, or indirect damages.
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
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Navigator Privacy Policy</h2>
                <p><strong>Effective Date:</strong> October 24, 2025</p>
                <p><strong>Provider:</strong> Navigator Technologies, Inc. ("Navigator," "we," "our," or "us")</p>
                <p><strong>Website:</strong> <a href="https://navigatortrips.com" className="text-blue-600 underline">https://navigatortrips.com</a></p>
                <p><strong>Contact:</strong> <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a></p>

                <h3 className="text-xl font-semibold mt-8 mb-4">1. Overview</h3>
                <p>
                  Navigator Technologies, Inc. ("Navigator") respects your privacy and is committed to protecting your personal information.
                  This Privacy Policy explains how we collect, use, share, and protect information when you use the Navigator platform,
                  including our mobile application and website at 
                  <a href="https://navigatortrips.com" className="text-blue-600 underline"> https://navigatortrips.com</a>.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">2. Scope</h3>
                <p>
                  This Privacy Policy applies to all users of the Navigator platform, including trip organizers, participants,
                  and visitors browsing our website. By using Navigator, you agree to the terms of this Privacy Policy.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">3. Information We Collect</h3>
                <h4 className="text-lg font-semibold mt-6 mb-2">a. Information You Provide Directly</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Account Information:</strong> Name, email address, profile picture, and password.</li>
                  <li><strong>Trip Information:</strong> Trip names, destinations, dates, activities, and expenses.</li>
                  <li><strong>Payment Preferences:</strong> PayPal address, Venmo username, or cash settlement details.</li>
                  <li><strong>Communications:</strong> Messages, polls, chat logs, and feedback sent through the platform.</li>
                </ul>

                <h4 className="text-lg font-semibold mt-6 mb-2">b. Information Collected Automatically</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Device type, operating system, and browser information.</li>
                  <li>Log data (IP address, pages visited, actions performed).</li>
                  <li>Usage statistics (feature engagement, session duration).</li>
                </ul>

                <h4 className="text-lg font-semibold mt-6 mb-2">c. Information from Third Parties</h4>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>PayPal or Venmo:</strong> To confirm transaction completion.</li>
                  <li><strong>Mapping services (e.g., Mapbox, Google Maps):</strong> To provide destination-related features.</li>
                </ul>
                <p>Navigator does not receive or store full payment credentials.</p>

                <h3 className="text-xl font-semibold mt-8 mb-4">4. How We Use Information</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide, maintain, and improve the platform's functionality.</li>
                  <li>Enable trip creation, invitations, RSVPs, and expense tracking.</li>
                  <li>Facilitate communication among trip members.</li>
                  <li>Personalize your experience and show relevant content.</li>
                  <li>Send notifications about trip updates or account activity.</li>
                  <li>Detect and prevent fraud, abuse, or technical issues.</li>
                  <li>Comply with applicable laws and enforce our Terms of Service.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-8 mb-4">5. How We Share Information</h3>
                <p>Navigator shares personal data only when necessary to operate the service:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>With trip members: To display shared itineraries, activities, and expenses.</li>
                  <li>With third-party integrations: Such as PayPal or Venmo for settlements.</li>
                  <li>With service providers: Who assist with hosting, analytics, or technical operations under confidentiality obligations.</li>
                  <li>If required by law: To comply with legal obligations or respond to valid government requests.</li>
                </ul>
                <p>Navigator does not sell, rent, or trade your personal data.</p>

                <h3 className="text-xl font-semibold mt-8 mb-4">6. Data Retention</h3>
                <p>
                  We retain your information for as long as necessary to provide the service and comply with legal obligations.
                  You may request deletion of your data by contacting 
                  <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline"> info@navigatortrips.com</a>.
                </p>
                <p>
                  Trip-related content (e.g., expense records, itinerary items) may remain visible to other members as part of
                  their historical records, even after your account is deleted.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">7. Data Security</h3>
                <p>
                  Navigator uses industry-standard security measures to protect your data, including encryption, access controls,
                  and secure servers. However, no system is 100% secure. By using the service, you acknowledge that data transmission
                  over the internet carries inherent risks.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">8. Your Rights and Choices</h3>
                <p>Depending on your location, you may have rights to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access, correct, or delete your personal data.</li>
                  <li>Restrict or object to data processing.</li>
                  <li>Request a copy of your data in a portable format.</li>
                </ul>
                <p>To exercise these rights, contact <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a>.</p>

                <h3 className="text-xl font-semibold mt-8 mb-4">9. International Data Transfers</h3>
                <p>
                  Navigator operates primarily in the United States. If you access the platform from outside the U.S., you consent
                  to the transfer and processing of your information in the United States, where data protection laws may differ from your local laws.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">10. Children's Privacy</h3>
                <p>
                  Navigator is not directed to children under 16 years of age, and we do not knowingly collect personal data from minors.
                  If we become aware that a child under 16 has provided information, we will promptly delete it.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">11. Links to Other Services</h3>
                <p>
                  Navigator may contain links to third-party websites or services. We are not responsible for the privacy practices
                  or content of those sites. We encourage you to review their privacy policies before sharing any information.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">12. Changes to This Policy</h3>
                <p>
                  Navigator may update this Privacy Policy from time to time. We will notify you of significant changes via email or app notification.
                  Continued use of the platform after updates constitutes acceptance of the revised policy.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">13. Contact Us</h3>
                <p>
                  If you have questions or concerns about this Privacy Policy, contact us at:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Email:</strong> <a href="mailto:info@navigatortrips.com" className="text-blue-600 underline">info@navigatortrips.com</a></li>
                  <li><strong>Website:</strong> <a href="https://navigatortrips.com" className="text-blue-600 underline">https://navigatortrips.com</a></li>
                </ul>

                <h3 className="text-xl font-semibold mt-8 mb-4">14. Pre-Launch Notice</h3>
                <p>
                  Navigator Technologies, Inc. is currently operating the Navigator platform as an early-access ("beta") release.
                  While we take user privacy seriously, some data handling features may still be under refinement.
                </p>
                <p>
                  By using the app in its pre-launch phase, you consent to reasonable testing-related data collection strictly
                  for improving the platform experience.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
