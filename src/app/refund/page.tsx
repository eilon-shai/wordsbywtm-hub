import type { Metadata } from 'next';
import Link from 'next/link';
import LegalChrome from '../_legal/LegalChrome';

// NOTE: Verbatim from the attorney-approved TributeWords Refund Policy (same LLC,
// same Paddle MoR), generalized to the Words That Matter service. DEC-P-007.

export const metadata: Metadata = { title: 'Refund Policy — Words That Matter' };

export default function RefundPage() {
  return (
    <LegalChrome title="Refund Policy" updated="April 22, 2026">
      <Section n="1. Our Commitment">
        We want you to be completely satisfied with your generated tribute. If you are not satisfied with the
        output, we are committed to making it right in accordance with the terms below.
      </Section>
      <Section n="2. Refund Eligibility">
        <p style={{ fontWeight: 600 }}>Full Refund — Within 14 Days.</p>
        <p style={{ marginTop: '0.25rem' }}>
          If you are not satisfied with the generated tribute for any reason, you may request a full refund
          within fourteen (14) calendar days of the date of purchase, no questions asked.
        </p>
        <p style={{ fontWeight: 600, marginTop: '1rem' }}>After 14 Days.</p>
        <p style={{ marginTop: '0.25rem' }}>
          Due to the digital nature of the Service and the immediate delivery of generated content, refund
          requests submitted more than fourteen (14) calendar days after purchase will not be accepted.
        </p>
        <p style={{ fontWeight: 600, marginTop: '1rem' }}>Paddle Merchant of Record.</p>
        <p style={{ marginTop: '0.25rem' }}>
          All payment transactions and billing are processed by Paddle, our merchant of record. The final
          processing of all refunds is handled by Paddle and is subject to Paddle’s Buyer Terms and Refund Policy.
        </p>
      </Section>
      <Section n="3. How to Request a Refund">
        <p>
          Email us at <a href="mailto:hello@wordsbywtm.com" style={{ color: 'var(--accent)' }}>hello@wordsbywtm.com</a>{' '}
          with the subject line “Refund Request.” Include:
        </p>
        <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', listStyle: 'decimal' }}>
          <li>The email address used at checkout; and</li>
          <li>The order number provided by Paddle in your purchase confirmation email.</li>
        </ol>
        <p style={{ marginTop: '0.75rem' }}>We will review your request and respond within three (3) business days.</p>
      </Section>
      <Section n="4. Processing Time">
        Approved refunds are returned to your original payment method. Processing typically takes 5 to 10
        business days after the refund is initiated, depending on your bank and Paddle’s processing schedule.
      </Section>
      <Section n="5. Contact">
        Questions regarding this Refund Policy? Contact{' '}
        <a href="mailto:hello@wordsbywtm.com" style={{ color: 'var(--accent)' }}>hello@wordsbywtm.com</a>.
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
