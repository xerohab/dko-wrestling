import { Link } from "react-router-dom";

const DKO_LOGO = "https://media.base44.com/images/public/6a0fab0df03ef3f099fbfaf0/c427e54b3_DKOWrestling_ChampionsCollide.png";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-black">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={DKO_LOGO} alt="DKO Wrestling" className="h-10 w-auto" />
            <span className="font-oswald font-bold text-white text-lg tracking-wide hidden sm:block">DKO Wrestling</span>
          </Link>
          <Link to="/login" className="font-oswald text-xs uppercase tracking-wider text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-oswald font-bold text-3xl md:text-4xl uppercase tracking-wider mb-2">Terms of Service</h1>
        <p className="text-muted-foreground font-inter text-sm mb-10">Last updated: August 30, 2026</p>

        <div className="space-y-8 font-inter text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using DKO Wrestling (the "Service"), operated by DKO LTD, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">2. Your Account</h2>
            <p>You must be at least 16 years old to create an account. You are responsible for safeguarding your credentials and for all activity under your account. You agree to provide accurate information and to keep it up to date.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">3. Membership & Subscriptions</h2>
            <p>DKO Club memberships grant access to paywalled content and other benefits as described on our pricing page. Subscriptions are billed on a recurring basis through our payment provider until cancelled. All subscription payments are final and non-refundable, except where required by law. You may cancel at any time; access continues until the end of the current billing period.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Reproduce, redistribute, or republish protected content without permission.</li>
              <li>Share, resell, or transfer your account or membership access to others.</li>
              <li>Attempt to bypass the paywall or content-protection measures.</li>
              <li>Post abusive, defamatory, unlawful, or infringing comments.</li>
              <li>Interfere with the security or operation of the Service.</li>
              <li>Use automated tools to scrape or harvest content.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">5. User Content</h2>
            <p>You retain ownership of content you submit (such as comments). By posting, you grant DKO LTD a non-exclusive, royalty-free licence to host, display, and use that content in connection with the Service. You are solely responsible for your submissions.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">6. Editorial Content</h2>
            <p>All articles, images, and editorial material on DKO Wrestling are owned by DKO LTD or its licensors and are protected by intellectual property laws. You may share links to articles but may not republish full content without written permission.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">7. Disclaimers</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that all information is accurate or complete. Editorial opinions are those of the authors and do not necessarily reflect the views of DKO LTD.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">8. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, DKO LTD shall not be liable for any indirect, incidental, or consequential damages, or for loss of profits or data, arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">9. Termination</h2>
            <p>We may suspend or terminate your access at any time if you breach these Terms or for any other reason at our discretion. Upon termination, your right to use the Service ceases immediately.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">10. Governing Law</h2>
            <p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">11. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">12. Contact</h2>
            <p>Questions about these Terms can be directed to DKO LTD through the support channels available on the DKO Wrestling website.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-xs font-inter text-muted-foreground">
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link to="/login" className="hover:text-foreground">Back to login</Link>
        </div>
      </main>
    </div>
  );
}