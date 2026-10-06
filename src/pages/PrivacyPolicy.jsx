import { Link } from "react-router-dom";

const DKO_LOGO = "https://media.base44.com/images/public/6a0fab0df03ef3f099fbfaf0/c427e54b3_DKOWrestling_ChampionsCollide.png";

export default function PrivacyPolicy() {
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
        <h1 className="font-oswald font-bold text-3xl md:text-4xl uppercase tracking-wider mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground font-inter text-sm mb-10">Last updated: August 30, 2026</p>

        <div className="space-y-8 font-inter text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">1. Who We Are</h2>
            <p>DKO Wrestling is operated by DKO LTD ("we", "us", "our"). This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services at DKO Wrestling.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Account information:</strong> your name and email address when you register or sign in (including via Google).</li>
              <li><strong>Profile information:</strong> display name, avatar, and social handles you choose to add.</li>
              <li><strong>Subscription information:</strong> your DKO Club membership plan, billing status, and payment provider references (we do not store full card details).</li>
              <li><strong>Usage data:</strong> pages viewed, articles read, comments posted, and device/browser information.</li>
              <li><strong>Communications:</strong> responses when you contact us or opt in to email alerts and push notifications.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>To create and manage your account and authenticate you.</li>
              <li>To provide and personalize content, including paywalled DKO Club articles.</li>
              <li>To process subscriptions and manage membership access.</li>
              <li>To send breaking-news alerts, email digests, and push notifications you have opted into.</li>
              <li>To analyse traffic and improve our editorial products.</li>
              <li>To prevent fraud, abuse, and unauthorised access to protected content.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">4. Legal Basis (UK GDPR)</h2>
            <p>We process your personal data on the basis of: your consent; performance of a contract (your membership); our legitimate interests in operating and securing the platform; and compliance with legal obligations.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">5. Sharing Your Information</h2>
            <p>We do not sell your personal data. We share it only with service providers who help us operate (such as payment processors, email and push delivery, and analytics), under contract and only as necessary. We may disclose information where required by law.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">6. International Transfers</h2>
            <p>Some providers may process data outside the UK. We rely on appropriate safeguards, such as UK International Data Transfer Agreements or recognised certification schemes, to protect your data.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">7. Data Retention</h2>
            <p>We keep your data only as long as needed to provide the service and meet legal obligations. You can request deletion of your account at any time.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">8. Your Rights</h2>
            <p>You have the right to access, correct, delete, or restrict use of your personal data, to object to processing, to data portability, and to withdraw consent at any time. To exercise these rights, contact us using the details below.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">9. Cookies</h2>
            <p>We use essential cookies for authentication and site functionality, and optional cookies for analytics. You can control non-essential cookies through your browser settings.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">10. Security</h2>
            <p>We apply appropriate technical and organisational measures to protect your data. However, no system is completely secure and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">11. Children's Privacy</h2>
            <p>Our services are not directed to children under 16, and we do not knowingly collect their personal data.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">12. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes and update the date above.</p>
          </section>

          <section>
            <h2 className="font-oswald font-semibold text-lg uppercase text-white mb-3">13. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or your personal data, please contact DKO LTD via the support channels available on the DKO Wrestling website.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-xs font-inter text-muted-foreground">
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
          <Link to="/login" className="hover:text-foreground">Back to login</Link>
        </div>
      </main>
    </div>
  );
}