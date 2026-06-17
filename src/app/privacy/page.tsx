import type { Metadata } from 'next';
import Link from 'next/link';
import LegalChrome from '../_legal/LegalChrome';

// NOTE: Base structure adapted from the attorney-approved TributeWords Privacy
// Policy (same LLC, same processors).
//
// LC-03 REVISION (2026-06-17): The collaborative-collection disclosures — the
// data inventory / legal-basis / retention table (§2A), contributor email
// collection with AES-256-GCM encryption at rest and a keyed-hash dedup, the
// ~30-day post-generation purge and abandoned-collection deletion, the
// automatic generation/deletion behaviors, contributor right to erasure by
// email, IP-for-rate-limiting basis, and the Anthropic AI sub-processor
// disclosure — were drafted by an AI legal-expert pass on 2026-06-17 to cover
// the new collection flows. This revision is PROVISIONAL and is PENDING formal
// review by a licensed attorney (LC-03); it builds on, and does not remove, the
// previously attorney-approved text.

export const metadata: Metadata = { title: 'Privacy Policy — Words That Matter' };

export default function PrivacyPage() {
  return (
    <LegalChrome title="Privacy Policy" updated="June 17, 2026">
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
            <strong>Contributor submissions.</strong> The name, optional relationship, memory text, and email
            address each contributor voluntarily submits to a collection. We collect the contributor’s email
            address to enforce one memory per person and to support removal requests; it is not used for
            marketing. A memory may itself contain personal data about the honoree and other people; contributors
            should submit only what they are comfortable sharing for the tribute.
          </li>
          <li style={{ marginTop: '0.5rem' }}>
            <strong>Payment information.</strong> Processed securely by Paddle, our merchant of record. We do not
            receive or store your full payment credentials.
          </li>
          <li style={{ marginTop: '0.5rem' }}>
            <strong>Consent records.</strong> When a contributor confirms the consent notice, we record proof of
            consent — a timestamp and the version of the consent text shown. Where an organizer waives the EU/UK
            14-day withdrawal right at checkout, we similarly record that acknowledgement.
          </li>
          <li style={{ marginTop: '0.5rem' }}>
            <strong>Technical information.</strong> Standard server logs (browser type, timestamps) collected by
            our hosting provider, and your IP address, which we process transiently to apply rate limiting and to
            prevent abuse of the Service.
          </li>
        </ul>
      </Section>
      <Section n="2A. Personal Data Inventory, Legal Basis, and Retention">
        <p style={{ marginBottom: '0.75rem' }}>
          The table below summarizes the personal data we process for the collaborative-collection service, the
          basis on which we process it, and how long we keep it.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.92rem' }}>
            <thead>
              <tr>
                <th style={th}>Whose data</th>
                <th style={th}>Data we process</th>
                <th style={th}>How it is stored</th>
                <th style={th}>Legal basis</th>
                <th style={th}>Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={td}>Organizer</td>
                <td style={td}>Email address; honoree/occasion name; tone and length preferences</td>
                <td style={td}>Managed Postgres database (Neon)</td>
                <td style={td}>Performance of a contract, and our legitimate interest in operating the Service</td>
                <td style={td}>~30 days after the tribute is generated; or, if the collection is abandoned, when its time-to-live expires</td>
              </tr>
              <tr>
                <td style={td}>Contributor</td>
                <td style={td}>Name; relationship (optional); email address; memory text (which may include personal data about the honoree and others)</td>
                <td style={td}>Managed Postgres database (Neon), encrypted at rest (AES-256-GCM); the email is also stored as a keyed (HMAC) hash to deduplicate submissions and to support removal</td>
                <td style={td}>Consent (recorded with timestamp and consent-text version)</td>
                <td style={td}>Deleted together with the collection — ~30 days after generation, or when an abandoned collection’s time-to-live expires</td>
              </tr>
              <tr>
                <td style={td}>Organizer / contributor</td>
                <td style={td}>IP address</td>
                <td style={td}>Transient cache (Upstash Redis)</td>
                <td style={td}>Legitimate interest (rate limiting and abuse prevention)</td>
                <td style={td}>Short-lived; automatically purged</td>
              </tr>
              <tr>
                <td style={td}>Purchaser</td>
                <td style={td}>Payment details</td>
                <td style={td}>Handled by Paddle; we do not store card data</td>
                <td style={td}>Performance of a contract</td>
                <td style={td}>Per Paddle’s retention schedules</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
      <Section n="3. How We Use Your Information">
        Organizer and contributor submissions are used solely to assemble and generate the requested tribute,
        and to send the relevant magic-link and deliverable emails. We do not use your personal information to
        train, fine-tune, or improve AI models.
      </Section>
      <Section n="4. Third-Party Service Providers">
        <ul style={{ paddingLeft: '1.5rem', listStyle: 'disc' }}>
          <li><strong>Paddle</strong> — merchant of record; handles all payment processing.</li>
          <li style={{ marginTop: '0.4rem' }}>
            <strong>Anthropic</strong> — provides the Claude AI model used to generate the tribute. When a tribute
            is generated, the included memories (which may contain personal data about the honoree and others) are
            transmitted to Anthropic’s API to produce the combined tribute. We do not use this content, and do not
            permit it to be used, to train or improve AI models.
          </li>
          <li style={{ marginTop: '0.4rem' }}><strong>Neon</strong> — managed Postgres database where collection submissions are stored, encrypted at rest.</li>
          <li style={{ marginTop: '0.4rem' }}><strong>Upstash</strong> — Redis cache used for rate limiting and abuse prevention.</li>
          <li style={{ marginTop: '0.4rem' }}><strong>Resend</strong> — transactional email delivery (magic links, reminders, deliverables).</li>
          <li style={{ marginTop: '0.4rem' }}><strong>Vercel</strong> — web application hosting.</li>
        </ul>
      </Section>
      <Section n="5. Data Retention, Automatic Purge, and Encryption">
        <p>
          Unlike a single-session tool, a collaborative collection necessarily stores submissions for a period of
          time so that multiple contributors can add memories before the tribute is created. Contributor names,
          memories, and email addresses are stored encrypted at rest (AES-256-GCM) in a managed Postgres database.
          Each contributor’s email address is additionally stored as a keyed (HMAC) hash so we can enforce one
          memory per person and locate a submission if removal is requested, without exposing the address.
        </p>
        <p style={{ marginTop: '1rem' }}>
          Retention is enforced automatically by a daily process:
        </p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', listStyle: 'disc' }}>
          <li>
            <strong>After a tribute is generated</strong>, the collection and all of its data — including
            contributor names, memories, and email addresses — are automatically deleted approximately thirty
            (30) days later.
          </li>
          <li style={{ marginTop: '0.4rem' }}>
            <strong>Abandoned collections</strong> (created but never finalized) are automatically deleted when
            their time-to-live expires.
          </li>
          <li style={{ marginTop: '0.4rem' }}>
            <strong>Unpaid collections with a deadline</strong> are deleted at the deadline if no payment has been
            made.
          </li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          Deletion is carried out by an automated process, cascades to all contributions in the collection, and is
          irreversible — deleted content cannot be recovered. If a collection has a deadline and has been paid for,
          the tribute may be generated automatically at the deadline from the memories then collected, and the
          collection’s data then follows the ~30-day post-generation retention above. Payment records held by
          Paddle are retained by Paddle under its own schedules; consent and withdrawal-waiver records are kept for
          a limited period to document consent.
        </p>
      </Section>
      <Section n="6. Security">
        We use reasonable administrative, technical, and organizational measures, including encryption of
        contributor submissions at rest, to protect the information we process against unauthorized access,
        loss, or misuse.
      </Section>
      <Section n="7. Your Privacy Rights and Removal Requests">
        <p>
          We do not sell or share your personal information. Subject to applicable law, you may request access to,
          correction of, or deletion of your personal information.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <strong>Organizers</strong> can delete an entire collection, which removes all contributions within it.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Contributors.</strong> There is not yet a self-serve option for an individual contributor to
          delete only their own memory. If you are a contributor and want your memory removed, email us at{' '}
          <a href="mailto:hello@wordsbywtm.com" style={{ color: 'var(--primary)' }}>hello@wordsbywtm.com</a>{' '}
          and we will locate your submission (using the keyed hash of your email) and remove it. Note that once a
          tribute has been generated, your memory may already be woven into the combined text.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          Please also be aware that, for a collection with a deadline, your memory may be automatically included in
          the generated tribute at the deadline, or, if the collection is not paid for, the entire collection and
          your memory may be automatically deleted at the deadline, as described in Section 5.
        </p>
        <p style={{ marginTop: '1rem' }}>
          For any privacy inquiry, including a request to delete a collection or remove a contribution, contact us
          at{' '}
          <a href="mailto:hello@wordsbywtm.com" style={{ color: 'var(--primary)' }}>hello@wordsbywtm.com</a>.
        </p>
      </Section>
      <Section n="8. EU/EEA/UK Privacy Rights (GDPR / UK GDPR)">
        <p>
          If you are located in the EU, EEA, or UK, our legal bases for processing are: performance of a contract
          (Article 6(1)(b)) for organizer data needed to provide the Service; consent (Article 6(1)(a)) for
          contributor submissions, which a contributor records by confirming the consent notice and may withdraw at
          any time by contacting us; and our legitimate interests (Article 6(1)(f)) in securing the Service and
          preventing abuse, for transient processing of IP addresses. Withdrawing consent does not affect
          processing carried out before withdrawal.
        </p>
        <p style={{ marginTop: '1rem' }}>
          You have the rights of access, rectification, erasure, restriction, objection, and data portability. To
          exercise any of these, contact us at the address above; we will respond within 30 days. The keyed-hash
          of a contributor’s email lets us locate and erase a specific contribution on request.
        </p>
      </Section>
      <Section n="9. Children’s Privacy">
        The Service is not directed to children under 18, and we do not knowingly collect their personal
        information.
      </Section>
      <Section n="10. Changes and Contact">
        We may update this Policy from time to time and will update the “Last updated” date above. Questions?
        Contact <a href="mailto:hello@wordsbywtm.com" style={{ color: 'var(--primary)' }}>hello@wordsbywtm.com</a>.
      </Section>
      <p style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: 'var(--primary)' }}>← Back to start</Link>
      </p>
    </LegalChrome>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  verticalAlign: 'top',
  padding: '0.5rem 0.6rem',
  borderBottom: '2px solid var(--border, #d8cdbb)',
  color: 'var(--foreground)',
  fontWeight: 600,
};

const td: React.CSSProperties = {
  textAlign: 'left',
  verticalAlign: 'top',
  padding: '0.5rem 0.6rem',
  borderBottom: '1px solid var(--border, #e6ddcd)',
};

function Section({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h2 className="font-serif" style={{ fontSize: '1.35rem', marginBottom: '0.6rem', color: 'var(--foreground)' }}>{n}</h2>
      <div style={{ color: 'var(--muted-foreground)', lineHeight: 1.65 }}>{children}</div>
    </section>
  );
}
