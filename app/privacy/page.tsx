// app/privacy/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | RaiseReady Impact',
  description: 'How RaiseReady Impact collects, uses, and protects your data. Compliant with Australian Privacy Principles, GDPR, and NZ Privacy Act.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Home
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-gray-900">
              Terms of Service →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-lg shadow-sm p-8 md:p-12 prose prose-lg max-w-none">

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>

          <div className="text-sm text-gray-500 mb-8 space-y-1">
            <p><strong>Effective Date:</strong> November 17, 2024</p>
            <p><strong>Last Updated:</strong> November 17, 2024</p>
            <p><strong>Version:</strong> 1.0</p>
          </div>

          <hr className="my-8" />

          {/* Quick Summary */}
          <section className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-0 mb-4">Our Commitment to Your Privacy</h2>
            <p className="mb-4">
              At RaiseReady Impact, we understand that you're entrusting us with sensitive business information,
              financial projections, and strategic plans. We take this responsibility seriously and are committed
              to protecting your privacy and securing your data.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">For Founders:</h3>
                <ul className="space-y-1 text-sm">
                  <li>✓ You control who sees your pitch deck</li>
                  <li>✓ You decide what's publicly discoverable</li>
                  <li>✓ We never share your data for marketing</li>
                  <li>✓ Export or delete your data anytime</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">For Investors:</h3>
                <ul className="space-y-1 text-sm">
                  <li>✓ Your criteria stay confidential</li>
                  <li>✓ Founders see only what you choose</li>
                  <li>✓ We never sell your information</li>
                  <li>✓ Full control over your visibility</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Table of Contents */}
          <nav className="bg-gray-50 rounded-lg p-6 my-8">
            <h2 className="text-xl font-bold mb-4 mt-0">Table of Contents</h2>
            <ol className="space-y-2 text-sm">
              <li><a href="#who-we-are" className="text-blue-600 hover:text-blue-700">1. Who We Are</a></li>
              <li><a href="#information-we-collect" className="text-blue-600 hover:text-blue-700">2. Information We Collect</a></li>
              <li><a href="#how-we-use" className="text-blue-600 hover:text-blue-700">3. How We Use Your Information</a></li>
              <li><a href="#data-visibility" className="text-blue-600 hover:text-blue-700">4. Data Visibility & Sharing (The Three Tiers)</a></li>
              <li><a href="#security" className="text-blue-600 hover:text-blue-700">5. How We Protect Your Information</a></li>
              <li><a href="#storage" className="text-blue-600 hover:text-blue-700">6. Where Your Data is Stored</a></li>
              <li><a href="#your-rights" className="text-blue-600 hover:text-blue-700">7. Your Rights</a></li>
              <li><a href="#cookies" className="text-blue-600 hover:text-blue-700">8. Cookies and Tracking</a></li>
              <li><a href="#third-party" className="text-blue-600 hover:text-blue-700">9. Third-Party Services</a></li>
              <li><a href="#retention" className="text-blue-600 hover:text-blue-700">10. Data Retention</a></li>
              <li><a href="#changes" className="text-blue-600 hover:text-blue-700">11. Changes to This Policy</a></li>
              <li><a href="#contact" className="text-blue-600 hover:text-blue-700">12. Contact Us</a></li>
              <li><a href="#compliance-status" className="text-blue-600 hover:text-blue-700">13. Compliance Status</a></li>
              <li><a href="#faqs" className="text-blue-600 hover:text-blue-700">14. Frequently Asked Questions</a></li>
            </ol>
          </nav>

          {/* 1. Who We Are */}
          <section id="who-we-are">
            <h2>1. Who We Are</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="font-semibold text-gray-700">Legal Entity:</dt>
                  <dd>Global Buildtech Australia Pty Ltd</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-700">Trading As:</dt>
                  <dd>Corporate AI Solutions</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-700">Product:</dt>
                  <dd>RaiseReady Impact</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-700">Location:</dt>
                  <dd>Brisbane, Queensland, Australia</dd>
                </div>
              </dl>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>General Inquiries:</strong> <a href="mailto:dennis@corporateaisolutions.com" className="text-blue-600">dennis@corporateaisolutions.com</a></li>
                  <li><strong>Privacy Inquiries:</strong> <a href="mailto:dennis@corporateaisolutions.com" className="text-blue-600">dennis@corporateaisolutions.com</a></li>
                  <li><strong>Phone:</strong> <a href="tel:+61402612471" className="text-blue-600">+61 402 612 471</a></li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. Information We Collect */}
          <section id="information-we-collect">
            <h2>2. Information We Collect</h2>

            <h3>2.1 Information You Provide Directly</h3>

            <div className="grid md:grid-cols-2 gap-6 my-6">
              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <h4 className="font-semibold text-gray-900 mt-0">For Founders:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Company/project details</li>
                  <li>• Business sector and stage</li>
                  <li>• Target raise amount</li>
                  <li>• SDGs you're addressing</li>
                  <li>• Pitch deck materials</li>
                  <li>• Financial projections</li>
                  <li>• Team information</li>
                  <li>• Impact projections</li>
                </ul>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
                <h4 className="font-semibold text-gray-900 mt-0">For Investors:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Firm/individual name</li>
                  <li>• Investment focus areas</li>
                  <li>• Investment range</li>
                  <li>• SDG preferences</li>
                  <li>• Investment criteria</li>
                  <li>• Portfolio information</li>
                  <li>• Geographic focus</li>
                </ul>
              </div>
            </div>

            <h3>2.2 Information We Collect Automatically</h3>
            <ul>
              <li>Login times and usage patterns</li>
              <li>Features you use and pages you visit</li>
              <li>Browser and device information</li>
              <li>IP address (for security)</li>
            </ul>

            <h3>2.3 Information from Third Parties</h3>
            <p>
              If you sign up with Google/LinkedIn, we receive your name and email.
              We don't access your contacts or post on your behalf.
            </p>
          </section>

          {/* 3. How We Use Your Information */}
          <section id="how-we-use">
            <h2>3. How We Use Your Information</h2>

            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="mt-0">To Provide the Service</h3>
                <ul className="mb-0">
                  <li>Create and manage your account</li>
                  <li>Match founders with suitable investors</li>
                  <li>Generate AI-powered pitch feedback</li>
                  <li>Calculate impact returns and SDG valuations</li>
                  <li>Enable discovery and networking</li>
                </ul>
                <p className="text-sm text-gray-600 italic mb-0">Legal Basis: Performance of contract</p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="mt-0">To Improve the Platform</h3>
                <ul className="mb-0">
                  <li>Analyze usage patterns</li>
                  <li>Test new matching algorithms</li>
                  <li>Improve AI coaching quality</li>
                </ul>
                <p className="text-sm text-gray-600 italic mb-0">Legal Basis: Legitimate interest. You can object anytime.</p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="mt-0">Marketing (With Your Consent)</h3>
                <ul className="mb-0">
                  <li>Platform updates and new features</li>
                  <li>Educational content</li>
                  <li>Relevant opportunities</li>
                </ul>
                <p className="text-sm text-gray-600 italic mb-0">Legal Basis: Your explicit consent. Unsubscribe anytime.</p>
              </div>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6">
              <h3 className="mt-0 text-red-900">We NEVER:</h3>
              <ul className="mb-0">
                <li>❌ Sell your data to third parties</li>
                <li>❌ Use your data for advertising</li>
                <li>❌ Share with data brokers</li>
                <li>❌ Train AI models on your content</li>
              </ul>
            </div>
          </section>

          {/* 4. Data Visibility & Sharing (The Three Tiers) */}
          <section id="data-visibility">
            <h2>4. Data Visibility & Sharing (The Three Tiers)</h2>

            <p className="lead text-xl text-gray-700">
              RaiseReady Impact uses a tiered visibility system that puts YOU in control of who sees your information.
            </p>

            {/* Tier 1 */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 my-8 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">1</div>
                <h3 className="mt-0 mb-0 text-2xl">Tier 1: Public Preview (Discoverable)</h3>
              </div>

              <p className="font-semibold text-blue-900 mb-3">Who Can See: All logged-in users (if you enable "Make Discoverable")</p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-green-700 mb-2">✅ What's Visible (Founders):</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Project name and tagline</li>
                    <li>• Business sector and stage</li>
                    <li>• Location</li>
                    <li>• SDGs you're addressing</li>
                    <li>• Target raise range (not exact)</li>
                    <li>• Logo and website</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-red-700 mb-2">❌ What's Hidden:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Full pitch deck</li>
                    <li>• Financial projections</li>
                    <li>• Cap table</li>
                    <li>• Customer names</li>
                    <li>• Team details</li>
                    <li>• Contact information</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 bg-white rounded p-3 text-sm">
                <strong>How to Control:</strong> Settings → Privacy → Toggle "Make my project discoverable"
              </div>
            </div>

            {/* Tier 2 */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 my-8 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">2</div>
                <h3 className="mt-0 mb-0 text-2xl">Tier 2: Gated Preview (Request → Approval)</h3>
              </div>

              <p className="font-semibold text-green-900 mb-3">Who Can See: Investors who request access AND you approve</p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="mt-0 mb-3">How It Works:</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-600 mt-0.5">1.</span>
                    <span>Investor sees your Tier 1 (Public Preview) and is interested</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-600 mt-0.5">2.</span>
                    <span>Investor clicks "Request Access" and includes a message</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-600 mt-0.5">3.</span>
                    <span>You receive a notification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-600 mt-0.5">4.</span>
                    <span>You review the investor's profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-600 mt-0.5">5.</span>
                    <span>You approve or reject the request</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-green-600 mt-0.5">6.</span>
                    <span>If approved, investor sees Tier 2 information</span>
                  </li>
                </ol>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-green-700 mb-2">✅ Additional Info Visible:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Detailed business description</li>
                    <li>• Team summary</li>
                    <li>• Current revenue/traction</li>
                    <li>• Customer count (not names)</li>
                    <li>• Market size</li>
                    <li>• Exact raise amount</li>
                    <li>• Use of funds</li>
                    <li>• 3-slide deck preview</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-red-700 mb-2">❌ Still Hidden:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Full pitch deck</li>
                    <li>• 3-year financials</li>
                    <li>• Cap table</li>
                    <li>• Customer names</li>
                    <li>• Team equity details</li>
                    <li>• Legal/IP details</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 bg-white rounded p-3 text-sm">
                <strong>Revoke Access:</strong> Dashboard → Access Requests → [Investor] → "Revoke Access"
              </div>
            </div>

            {/* Tier 3 */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 my-8 border border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">3</div>
                <h3 className="mt-0 mb-0 text-2xl">Tier 3: Full Access (Explicit Sharing)</h3>
              </div>

              <p className="font-semibold text-purple-900 mb-3">Who Can See: ONLY investors you explicitly share with</p>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="mt-0 mb-3">How It Works:</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 mt-0.5">1.</span>
                    <span>You click "Share Full Deck with [Investor Name]"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 mt-0.5">2.</span>
                    <span>Optional: Require NDA signature first</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 mt-0.5">3.</span>
                    <span>Optional: Set expiration date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-purple-600 mt-0.5">4.</span>
                    <span>Investor gets notification and can view everything</span>
                  </li>
                </ol>
              </div>

              <div className="bg-white rounded p-4">
                <h4 className="mt-0 mb-2">✅ Everything Becomes Visible:</h4>
                <ul className="text-sm space-y-1 columns-2">
                  <li>• Complete pitch deck</li>
                  <li>• 3-5 year financials</li>
                  <li>• Revenue, expenses, runway</li>
                  <li>• Cap table</li>
                  <li>• Customer names</li>
                  <li>• Team details & equity</li>
                  <li>• Legal structure</li>
                  <li>• IP documentation</li>
                </ul>
              </div>

              <div className="mt-4 bg-white rounded p-3">
                <h4 className="mt-0 mb-2 text-sm font-semibold">Tracking & Control:</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ See when investor views your deck</li>
                  <li>✓ Track view count</li>
                  <li>✓ Revoke access anytime</li>
                  <li>✓ Require NDA (optional)</li>
                  <li>✓ Set expiration dates</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. How We Protect Your Information */}
          <section id="security">
            <h2>5. How We Protect Your Information</h2>

            <div className="grid md:grid-cols-3 gap-6 my-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg mt-0">🔒 Encryption</h3>
                <ul className="text-sm">
                  <li>AES-256 at rest</li>
                  <li>TLS 1.3 in transit</li>
                  <li>Bcrypt passwords</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg mt-0">👤 Access Control</h3>
                <ul className="text-sm">
                  <li>Row-Level Security</li>
                  <li>Role-based permissions</li>
                  <li>Audit logging</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg mt-0">🏢 Infrastructure</h3>
                <ul className="text-sm">
                  <li>SOC 2 Type II</li>
                  <li>ISO 27001</li>
                  <li>24/7 monitoring</li>
                </ul>
              </div>
            </div>

            <h3>Who Has Access to Your Data?</h3>
            <table className="w-full border-collapse border border-gray-300 my-6">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-3 text-left">Who</th>
                  <th className="border border-gray-300 p-3 text-left">Access Level</th>
                  <th className="border border-gray-300 p-3 text-left">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold">You (Data Owner)</td>
                  <td className="border border-gray-300 p-3">Full access</td>
                  <td className="border border-gray-300 p-3">View, edit, download, delete</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold">Superadmins</td>
                  <td className="border border-gray-300 p-3">Support only (logged)</td>
                  <td className="border border-gray-300 p-3">Troubleshooting & support</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold">AI Providers</td>
                  <td className="border border-gray-300 p-3">Processing only (30 days max)</td>
                  <td className="border border-gray-300 p-3">Pitch analysis, coaching</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold">Approved Investors</td>
                  <td className="border border-gray-300 p-3">What you grant (Tier 2/3)</td>
                  <td className="border border-gray-300 p-3">Review opportunities</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="border border-gray-300 p-3 font-semibold">Everyone Else</td>
                  <td className="border border-gray-300 p-3">❌ No Access</td>
                  <td className="border border-gray-300 p-3">We don't share with marketing, brokers, or third parties</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 6. Where Your Data is Stored */}
          <section id="storage">
            <h2>6. Where Your Data is Stored</h2>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-6">
              <h3 className="mt-0">🇦🇺 Primary Storage: AWS Sydney, Australia</h3>
              <p className="mb-2">All user data, pitch decks, and project information is stored in Australia.</p>
              <ul className="text-sm mb-0">
                <li>✓ Complies with Australian Privacy Principles</li>
                <li>✓ Data sovereignty (stays in Australia)</li>
                <li>✓ Low latency for AU/NZ users</li>
                <li>✓ Subject to Australian privacy laws</li>
              </ul>
            </div>

            <h3>International Users</h3>
            <p>
              <strong>EU Users:</strong> Standard Contractual Clauses ensure GDPR compliance.
              Enterprise clients can request EU-only processing.
            </p>
            <p>
              <strong>NZ Users:</strong> Data stored in Australia is acceptable under Trans-Tasman Privacy Principles.
            </p>
          </section>

          {/* 7. Your Rights */}
          <section id="your-rights">
            <h2>7. Your Rights</h2>

            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="mt-0 flex items-center gap-2">
                  <span className="text-2xl">📥</span>
                  Right to Access
                </h3>
                <p className="mb-3">Download a complete copy of all your data.</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>How:</strong> Settings → Privacy → "Download My Data"<br/>
                  <strong>Format:</strong> JSON/CSV<br/>
                  <strong>Timeline:</strong> Immediate
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="mt-0 flex items-center gap-2">
                  <span className="text-2xl">✏️</span>
                  Right to Rectification
                </h3>
                <p className="mb-3">Correct inaccurate or incomplete data.</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>How:</strong> Edit directly in your profile/settings<br/>
                  <strong>Timeline:</strong> Immediate (self-service)
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="mt-0 flex items-center gap-2">
                  <span className="text-2xl">🗑️</span>
                  Right to Erasure
                </h3>
                <p className="mb-3">Delete your account and all associated data permanently.</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>How:</strong> Settings → Account → "Delete My Account"<br/>
                  <strong>Effect:</strong> Hard delete (data actually removed)<br/>
                  <strong>Timeline:</strong> Immediate, 30 days for backups
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="mt-0 flex items-center gap-2">
                  <span className="text-2xl">📤</span>
                  Right to Data Portability
                </h3>
                <p className="mb-3">Receive your data in machine-readable format.</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>How:</strong> Same as "Right to Access"<br/>
                  <strong>Format:</strong> JSON (machine-readable)
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="mt-0 flex items-center gap-2">
                  <span className="text-2xl">🚫</span>
                  Right to Object
                </h3>
                <p className="mb-3">Object to certain types of processing.</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Marketing:</strong> Unsubscribe link in emails<br/>
                  <strong>Analytics:</strong> Settings → Privacy → "Disable Analytics"
                </div>
              </div>
            </div>
          </section>

          {/* 8-11: Shorter Sections */}
          <section id="cookies">
            <h2>8. Cookies and Tracking</h2>
            <p>We use minimal cookies:</p>
            <ul>
              <li><strong>Essential:</strong> Session cookies to keep you logged in (required)</li>
              <li><strong>Analytics:</strong> Self-hosted usage analytics (optional, can disable)</li>
            </ul>
            <p className="font-semibold">We don't use: ❌ Advertising cookies ❌ Social media pixels ❌ Third-party tracking</p>
          </section>

          <section id="third-party">
            <h2>9. Third-Party Services</h2>
            <ul>
              <li><strong>Supabase:</strong> Database & auth (SOC 2, ISO 27001, AWS Sydney)</li>
              <li><strong>Anthropic Claude:</strong> AI analysis (GDPR compliant, 30-day retention max)</li>
              <li><strong>ElevenLabs:</strong> Voice AI (GDPR compliant, zero retention mode)</li>
              <li><strong>Vercel:</strong> Hosting (no data storage)</li>
            </ul>
          </section>

          <section id="retention">
            <h2>10. Data Retention</h2>
            <ul>
              <li><strong>Active accounts:</strong> Retained indefinitely (until you delete)</li>
              <li><strong>Deleted accounts:</strong> Immediate deletion, 30 days for backups</li>
              <li><strong>Transaction records:</strong> 7 years (legal requirement)</li>
              <li><strong>Analytics:</strong> 2 years (anonymized)</li>
            </ul>
          </section>

          <section id="changes">
            <h2>11. Changes to This Policy</h2>
            <p>
              We'll notify you 30 days before any material changes via email and platform banner.
              Minor clarifications are updated immediately with notice at the top.
            </p>
          </section>

          <section id="contact">
            <h2>12. Contact Us</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
              <h3 className="mt-0">Privacy Questions or Concerns</h3>
              <p className="mb-2">
                <strong>Email:</strong> <a href="mailto:dennis@corporateaisolutions.com" className="text-blue-600">dennis@corporateaisolutions.com</a><br/>
                <strong>Response Time:</strong> Within 30 days (usually much faster)
              </p>

              <h3 className="mt-6 mb-2">General Support</h3>
              <p className="mb-0">
                <strong>Email:</strong> <a href="mailto:dennis@corporateaisolutions.com" className="text-blue-600">dennis@corporateaisolutions.com</a><br/>
                <strong>Phone:</strong> <a href="tel:+61402612471" className="text-blue-600">+61 402 612 471</a>
              </p>
            </div>
          </section>

          {/* 13. Compliance Status Table */}
          <section id="compliance-status">
            <h2>13. Compliance Status</h2>
            <p className="lead">Current compliance status as of November 17, 2024</p>

            <div className="overflow-x-auto my-6">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-3 text-left">Framework/Requirement</th>
                    <th className="border border-gray-300 p-3 text-center">Status</th>
                    <th className="border border-gray-300 p-3 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>Legal Compliance</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Australian Privacy Act 1988</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">All 13 APPs implemented</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">NZ Privacy Act 2020</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">All 13 IPPs implemented</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">GDPR (EU)</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">All Articles implemented</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">CCPA/CPRA (California)</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">User rights implemented</td>
                  </tr>

                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>Infrastructure Security</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Row-Level Security (RLS)</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">All 33 tables protected</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Encryption at Rest</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">AES-256 automatic</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Encryption in Transit</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">TLS 1.3 enforced</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">SOC 2 Infrastructure</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">Via Supabase/AWS</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">ISO 27001</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">Via Supabase/AWS</td>
                  </tr>

                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>Data Protection</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Privacy Policy</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">Published (this document)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Terms of Service</td>
                    <td className="border border-gray-300 p-3 text-center">🔶</td>
                    <td className="border border-gray-300 p-3">In progress</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Consent Tracking</td>
                    <td className="border border-gray-300 p-3 text-center">🔶</td>
                    <td className="border border-gray-300 p-3">Coming this week</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Data Export Feature</td>
                    <td className="border border-gray-300 p-3 text-center">🔶</td>
                    <td className="border border-gray-300 p-3">Coming this month</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Account Deletion</td>
                    <td className="border border-gray-300 p-3 text-center">🔶</td>
                    <td className="border border-gray-300 p-3">Coming this month</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Email Verification</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">Required for signup</td>
                  </tr>

                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>User Controls</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Tier 1 (Public Preview)</td>
                    <td className="border border-gray-300 p-3 text-center">✅</td>
                    <td className="border border-gray-300 p-3">Discoverable toggle</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Tier 2 (Gated Access)</td>
                    <td className="border border-gray-300 p-3 text-center">🔶</td>
                    <td className="border border-gray-300 p-3">Tables created, UI pending</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Tier 3 (Full Access)</td>
                    <td className="border border-gray-300 p-3 text-center">🔶</td>
                    <td className="border border-gray-300 p-3">Tables created, UI pending</td>
                  </tr>

                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>Future Enhancements</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Multi-Factor Auth (MFA)</td>
                    <td className="border border-gray-300 p-3 text-center">📋</td>
                    <td className="border border-gray-300 p-3">Planned Q1 2025</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Penetration Testing</td>
                    <td className="border border-gray-300 p-3 text-center">📋</td>
                    <td className="border border-gray-300 p-3">When enterprise clients</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p className="mb-2"><strong>Legend:</strong></p>
              <ul className="space-y-1 mb-0">
                <li>✅ Compliant/Implemented</li>
                <li>🔶 Partially Implemented</li>
                <li>📋 Planned</li>
              </ul>
            </div>
          </section>

          {/* 14. FAQs */}
          <section id="faqs">
            <h2>14. Frequently Asked Questions</h2>

            <div className="space-y-6">
              {/* General Privacy */}
              <div>
                <h3 className="bg-gray-100 p-3 rounded-t-lg mb-0">General Privacy Questions</h3>
                <div className="border border-gray-300 rounded-b-lg p-6">

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: Do you sell my data?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> No. Never. We don't sell, rent, or trade your data to anyone.
                      Our business model is subscription fees from users, not data monetization.
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: Who can see my pitch deck?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Only you, unless you explicitly share it. Even then, you control exactly
                      which investors see it and can revoke access anytime. See the Three Tiers section above for details.
                    </p>
                  </div>

                  <div className="mb-0">
                    <h4 className="text-lg font-semibold mb-2">Q: Can other founders see my project?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Only if you make it discoverable, and even then they only see Tier 1 (basic info).
                      Founders never see your pitch deck or financials unless you share it directly with them.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Storage & Security */}
              <div>
                <h3 className="bg-gray-100 p-3 rounded-t-lg mb-0">Data Storage & Security</h3>
                <div className="border border-gray-300 rounded-b-lg p-6">

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: Where is my data physically stored?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> AWS Sydney, Australia. Your data never leaves Australia unless you're using
                      our AI features (Anthropic/ElevenLabs process in US with GDPR compliance).
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: What happens if there's a data breach?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> We have a comprehensive incident response plan. We'll contain the breach immediately,
                      assess what data was affected, notify you within 72 hours (GDPR) or 30 days (AU Privacy Act),
                      notify relevant authorities, and fix the vulnerability.
                    </p>
                  </div>

                  <div className="mb-0">
                    <h4 className="text-lg font-semibold mb-2">Q: Can RaiseReady staff see my pitch deck?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Superadmins can access data for support and troubleshooting, but all access is logged,
                      requires a legitimate business reason, and is never used for competitive intelligence.
                    </p>
                  </div>
                </div>
              </div>

              {/* The Three Tiers */}
              <div>
                <h3 className="bg-gray-100 p-3 rounded-t-lg mb-0">The Three Tiers (Visibility Control)</h3>
                <div className="border border-gray-300 rounded-b-lg p-6">

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: What's the difference between Tier 1, 2, and 3?</h4>
                    <p className="mb-2"><strong>A:</strong></p>
                    <ul className="mb-0 space-y-1">
                      <li><strong>Tier 1 (Public Preview):</strong> Basic info visible to all if you enable "Make Discoverable"</li>
                      <li><strong>Tier 2 (Gated Access):</strong> More details, but investor must request and you must approve</li>
                      <li><strong>Tier 3 (Full Access):</strong> Complete pitch deck, but only investors you explicitly share with</li>
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: Can I change my mind and revoke access?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Yes, anytime. Tier 2 and Tier 3 access can be revoked instantly from your dashboard.
                    </p>
                  </div>

                  <div className="mb-0">
                    <h4 className="text-lg font-semibold mb-2">Q: How do I know who's viewed my pitch deck?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> In Dashboard → Pitch Deck → Sharing, you'll see who has access, when they last viewed it,
                      and how many times they've viewed it. You can revoke access anytime.
                    </p>
                  </div>
                </div>
              </div>

              {/* Third-Party Services & AI */}
              <div>
                <h3 className="bg-gray-100 p-3 rounded-t-lg mb-0">Third-Party Services & AI</h3>
                <div className="border border-gray-300 rounded-b-lg p-6">

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: Does Anthropic Claude train on my pitch deck?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> No. We have a Data Processing Agreement with Anthropic that explicitly prohibits
                      using your data for model training.
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: How long does Anthropic keep my pitch deck?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Maximum 30 days (for troubleshooting), but we can configure zero-day retention
                      for sensitive data.
                    </p>
                  </div>

                  <div className="mb-0">
                    <h4 className="text-lg font-semibold mb-2">Q: Does ElevenLabs keep my voice recordings?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> No. We've enabled zero-retention mode for voice coaching sessions.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Rights */}
              <div>
                <h3 className="bg-gray-100 p-3 rounded-t-lg mb-0">User Rights</h3>
                <div className="border border-gray-300 rounded-b-lg p-6">

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: How do I download all my data?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Settings → Privacy → "Download My Data". You'll get a complete export in JSON format.
                    </p>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Q: How do I delete my account?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Settings → Account → "Delete My Account". This permanently deletes all your data
                      (hard delete, not soft delete).
                    </p>
                  </div>

                  <div className="mb-0">
                    <h4 className="text-lg font-semibold mb-2">Q: What happens to my data after I delete my account?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Personal data is deleted immediately. Backups are purged within 30 days.
                      Transaction records are kept for 7 years (legal requirement for accounting).
                      Analytics may be retained in anonymized form.
                    </p>
                  </div>
                </div>
              </div>

              {/* Getting Help */}
              <div>
                <h3 className="bg-gray-100 p-3 rounded-t-lg mb-0">Getting Help</h3>
                <div className="border border-gray-300 rounded-b-lg p-6">

                  <div className="mb-0">
                    <h4 className="text-lg font-semibold mb-2">Q: I have a privacy question not answered here. What do I do?</h4>
                    <p className="mb-0">
                      <strong>A:</strong> Email <a href="mailto:dennis@corporateaisolutions.com" className="text-blue-600">dennis@corporateaisolutions.com</a> -
                      we respond within 30 days (usually much faster).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="mt-0 mb-3">Your Privacy Matters</h3>
              <p className="mb-4">
                We built RaiseReady Impact because we believe impact-driven founders deserve better fundraising tools.
                We know you're trusting us with sensitive business information, and we take that responsibility seriously.
              </p>
              <p className="mb-4">
                If you ever have questions or concerns about your privacy, we're here to help.
              </p>
              <div className="text-sm">
                <p className="mb-1"><strong>Dennis McMahon</strong></p>
                <p className="mb-1">Founder & CTO, Corporate AI Solutions</p>
                <p className="mb-1">
                  <a href="mailto:dennis@corporateaisolutions.com" className="text-blue-600">dennis@corporateaisolutions.com</a>
                </p>
                <p className="mb-0">
                  <a href="tel:+61402612471" className="text-blue-600">+61 402 612 471</a>
                </p>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600 text-center">
              <p className="mb-1">Last Updated: November 17, 2024 • Version 1.0 • Next Review: February 17, 2025</p>
              <p className="mb-0">
                <Link href="/" className="text-blue-600 hover:text-blue-700 mr-4">Home</Link>
                <Link href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</Link>
              </p>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
