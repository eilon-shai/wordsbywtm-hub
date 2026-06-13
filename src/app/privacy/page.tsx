import type { Metadata } from 'next';
import Link from 'next/link';
import LegalChrome from '../_legal/LegalChrome';

// NOTE: Adapted from the attorney-approved TributeWords Privacy Policy (same LLC,
// same processors). §5 (Data Retention) has been updated to FACTUALLY describe the
// collaborative-collection data model — contributor memories are stored encrypted
// in a managed Postgres database (Neon) until the collection is finalized or
// auto-purged. DEC-P-007: this factual disclosure MUST be reviewed/ratified by the
// attorney before public launch — see venture-ops open-questions.

export const metadata: Metadata = { title: 'Privacy Policy — Words That Matter' };

export default function PrivacyPage() {
  return (
    <LegalChrome title="Privacy Policy" updated="June 14, 2026">
      <Section n="1. Introduction">
        Words That Matter LLC (“we”, “us”, “our”) is committed to protecting your privacy. This Privacy Policy
        describes how we collect, use, and handle information when you use our AI-assisted collaborative tribute
        service (the “Service”) at wordsbywtm.com.
      </Section>
      <Section n="2. Information We Collect">
        <ul style={{ paddingLeft: '1.5rem', listStyle: 'disc' }}>
          <li>
            <strong>Organizer information.</strong> The email address and honoree/occasion details an organizer
            provides to create a collection.
          </li>
          <li style={{ marginTop: '0.5rem' }}>
            <strong>Contributor submissions.</strong> The name, optional relationship, and memory text each
            contributor voluntarily submits to a collection.
          </li>
          <li style={{ marginTop: '0.5rem' }}>
            <strong>Payment information.</strong> Processed securely by Paddle, our merchant of record. We do not
            receive or store your full payment credentials.
          </li>
          <li style={{ marginTop: '0.5rem' }}>
            <strong>Technical information.</strong> Standard server logs (IP address, browser type, timestamps)
            collected by our hosting provider.
          </li>
        </ul>
      </Section>
      <Section n="3. How We Use Your Information">
        Organizer and contributor submissions are used solely to assemble and generate the requested tribute,
        and to send the relevant magic-link and deliverable emails. We do not use your personal information to
        train, fine-tune, or improve AI models.
      </Section>
      <Section n="4. Third-Party Service Providers">
        <ul style={{ paddingLeft: '1.5rem', listStyle: 'disc' }}>
          <li><strong>Paddle</strong> — merchant of record; handles all payment processing.</li>
          <li style={{ marginTop: '0.4rem' }}><strong>Anthropic</strong> — provides the Claude AI model used to generate the tribute.</li>
          <li style={{ marginTop: '0.4rem' }}><strong>Neon</strong> — managed Postgres database where collection submissions are stored.</li>
          <li style={{ marginTop: '0.4rem' }}><strong>Resend</strong> — transactional email delivery.</li>
          <li style={{ marginTop: '0.4rem' }}><strong>Vercel</strong> — web application hosting.</li>
        </ul>
      </Section>
      <Section n="5. Data Retention and Storage">
        <p>
          Unlike a single-session tool, a collaborative collection necessarily stores submissions for a period
          of time so that multiple contributors can add memories before the tribute is created. Contributor
          memories and names are stored encrypted at rest in a managed Postgres database. A collection and its
          submissions are automatically deleted if the collection is not finalized within thirty (30) days of
          creation. After a tribute is generated, retention is limited to what is necessary to deliver and
          support the Service.
        </p>
      </Section>
      <Section n="6. Security">
        We use reasonable administrative, technical, and organizational measures, including encryption of
        contributor submissions at rest, to protect the information we process against unauthorized access,
        loss, or misuse.
      </Section>
      <Section n="7. Your Privacy Rights">
        We do not sell or share your personal information. For any privacy inquiry, including a request to delete
        a collection, contact us at{' '}
        <a href="mailto:hello@wordsbywtm.com" style={{ color: 'var(--accent)' }}>hello@wordsbywtm.com</a>.
      </Section>
      <Section n="8. EU/EEA Privacy Rights (GDPR)">
        If you are located in the EU or EEA, we process submissions on the basis of performance of a contract
        (Article 6(1)(b) GDPR) and consent for contributor submissions. For GDPR requests, contact us at the
        address above; we will respond within 30 days.
      </Section>
      <Section n="9. Children’s Privacy">
        The Service is not directed to children under 18, and we do not knowingly collect their personal
        information.
      </Section>
      <Section n="10. Changes and Contact">
        We may update this Policy from time to time and will update the “Last updated” date above. Questions?
        Contact <a href="mailto:hello@wordsbywtm.com" style={{ color: 'var(--accent)' }}>hello@wordsbywtm.com</a>.
      </Section>
      <p style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: 'var(--accent)' }}>← Back to start</Link>
      </p>
    </LegalChrome>
  );
}

function Section({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '0.6rem' }}>{n}</h2>
      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}>{children}</div>
    </section>
  );
}
