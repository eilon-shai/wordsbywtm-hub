import type { Metadata } from 'next';
import Link from 'next/link';
import LegalChrome from '../_legal/LegalChrome';

// NOTE: Base sections (1–4, 6–13) are verbatim from the attorney-approved
// TributeWords Terms (same LLC, same Paddle MoR, same AI disclosure),
// generalized to the Words That Matter service. The EU/EEA/UK Withdrawal
// Waiver wording in §3 derives from the attorney's "VocalVow Revisions —
// Terms" memo, adapted here for DEFERRED/AUTOMATIC generation.
//
// LC-03 REVISION (2026-06-17): The new "Collections" section (§5) and the
// deferred-performance / automatic-generation / automatic-deletion language
// were drafted by an AI legal-expert pass on 2026-06-17 to cover the
// collaborative-collection flows (organizer + N contributors → one synthesized
// tribute, optional deadline with automated generation/deletion, ~30-day
// post-generation purge, contributor third-party data). This revision is
// PROVISIONAL and is PENDING formal review by a licensed attorney (LC-03);
// it builds on, and does not remove, the previously attorney-approved text.

export const metadata: Metadata = { title: 'Terms of Service — Words That Matter' };

export default function TermsPage() {
  return (
    <LegalChrome title="Terms of Service" updated="June 17, 2026">
      <Section n="1. Acceptance of Terms">
        By accessing or using the Words That Matter website and services (collectively, the “Service”), you
        acknowledge that you have read, understood, and agree to be bound by these Terms of Service (“Terms”)
        and our Privacy Policy, which is incorporated herein by reference. If you do not agree to these Terms,
        you may not access or use the Service.
      </Section>
      <Section n="2. Service Description">
        Words That Matter LLC, a Delaware limited liability company effective as of April 21, 2026 (“we”, “us”,
        “our”), provides AI-assisted tribute content generation services. An organizer creates a collection and
        invites others to contribute memories about a person or occasion; we then generate a personalized
        tribute draft using the information provided. The Service is intended to provide creative drafting
        assistance only. It does not provide legal, professional, psychological, or personal advice.
      </Section>
      <Section n="3. Payment and Fees">
        <p>
          Access to the generated tribute requires a one-time payment. There are no subscriptions or recurring
          charges. The fee is the same whether you pay when you finalize a collection or pay in advance. All
          payments are processed securely by Paddle, our authorized merchant of record. By completing a purchase,
          you agree to Paddle’s Buyer Terms and Conditions in addition to these Terms. Paddle controls all
          billing and refund processing.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>Pay-Before-Generate and Deferred Performance.</p>
        <p style={{ marginTop: '0.5rem' }}>
          We do not generate a tribute until Paddle has confirmed your payment. You may pay at the moment you
          finalize your collection, in which case generation begins immediately, or you may pay in advance, in
          which case the tribute is generated later — either when you choose to finalize, or automatically at a
          deadline you have set (see Section 5). Where you pay in advance, you acknowledge and agree that the
          digital content is produced and delivered at that later time rather than at the moment of payment, and
          you authorize us to generate and deliver it then using the memories then collected.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>EU/EEA/UK Withdrawal Waiver.</p>
        <p style={{ marginTop: '0.5rem' }}>
          The Service provides digital content that is generated and made available after payment confirmation,
          customized based on the information you and your contributors submit. If you are a consumer located in
          the European Union, European Economic Area, or United Kingdom, you may have a statutory right to
          withdraw from certain online purchases within fourteen (14) days. Because generation may begin
          immediately after payment confirmation, or may be deferred and occur automatically at the deadline you
          set, you are asked at checkout to expressly request that we begin performance under these timing
          arrangements and to acknowledge that you will lose your 14-day withdrawal right once delivery of the
          digital content begins. Where generation is deferred, performance is deemed to begin, and the
          withdrawal right is lost, when the tribute is generated and made available to you (whether you finalize
          it or it is generated automatically at the deadline). By completing your purchase and checking the
          acknowledgement at checkout, you give that consent.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          This waiver applies only to statutory withdrawal or cooling-off rights that may otherwise apply to the
          delivery of digital content. It does not limit any separate refund rights we voluntarily provide under
          our Refund Policy, nor any non-waivable rights you may have under applicable consumer-protection law. We
          may retain a record of your withdrawal-waiver consent for up to ninety (90) days to document your
          consent and acknowledgment. Please see our Privacy Policy for additional information.
        </p>
      </Section>
      <Section n="4. AI-Generated Content and Disclosure">
        <p>
          All content is generated by artificial intelligence based on the information you and your contributors
          provide. The output is a draft intended to serve as a strong starting point. We strongly recommend
          reviewing and personalizing the content before delivery.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>AI Transparency Disclosure.</p>
        <p style={{ marginTop: '0.5rem' }}>
          You acknowledge and agree that all content provided by Words That Matter is generated using artificial
          intelligence technology, specifically large language models (Claude by Anthropic). You are not
          interacting with a human writer. By using the Service, you consent to the use of AI to process your
          inputs and generate the resulting content.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem' }}>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” WORDS THAT MATTER MAKES NO REPRESENTATIONS OR
          WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, AS TO THE ACCURACY, COMPLETENESS, APPROPRIATENESS, OR
          FITNESS FOR A PARTICULAR PURPOSE OF ANY GENERATED CONTENT. YOU ARE SOLELY RESPONSIBLE FOR REVIEWING
          THE CONTENT BEFORE USE.
        </p>
      </Section>
      <Section n="5. Collections, Contributors, and Automatic Processing">
        <p style={{ fontWeight: 600 }}>Organizers and contributors.</p>
        <p style={{ marginTop: '0.5rem' }}>
          The Service lets an “organizer” create a collection for a person or occasion (an “honoree”) and invite
          others (“contributors”) to submit memories about that honoree. Creating a collection is free. The
          organizer reviews the submitted memories, may add their own, and decides which to include in the
          tribute. As organizer, you are responsible for whom you invite and how you share your collection link,
          and you represent and warrant that you have the right to create the collection, to invite the
          contributors you invite, and to collect and submit the memories gathered, and that doing so does not
          violate the privacy or intellectual property rights of any third party.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>Contributor submissions and license.</p>
        <p style={{ marginTop: '0.5rem' }}>
          Each contributor submits one memory, providing their name, an optional indication of their relationship
          to the honoree, the memory text, and an email address, and confirms a consent notice. If you are a
          contributor, you represent and warrant that the content you submit is yours to share, is accurate to the
          best of your knowledge, and does not violate the rights of any third party, and you grant Words That
          Matter LLC a limited, non-exclusive license to use your submission solely to assemble and generate the
          tribute for that collection and to deliver and support the Service. A contributor may submit one memory
          per collection; we use the contributor’s email address solely to enforce this and to support removal
          requests, as described in the Privacy Policy.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>Optional deadline and authorization for automatic generation.</p>
        <p style={{ marginTop: '0.5rem' }}>
          An organizer may set an optional deadline for a collection (up to approximately one month out). An
          automated process runs daily to manage collections that have a deadline. Approximately three (3) days
          before the deadline, we email the organizer a reminder. By setting a deadline and paying (whether in
          advance or at finalize), you authorize us to generate the tribute automatically on your behalf at the
          deadline, using whatever memories have been collected at that time, and to email it to you, without any
          further action from you. If a collection has been paid but contains no memories at the deadline, the
          deadline will be automatically extended a limited number of times and you will be reminded, rather than
          generating an empty tribute.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem' }}>
          AUTOMATIC DELETION OF UNPAID COLLECTIONS.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          IF A COLLECTION HAS NOT BEEN PAID FOR BY ITS DEADLINE, THE COLLECTION AND ALL CONTRIBUTED MEMORIES ARE
          PERMANENTLY DELETED AT THE DEADLINE BY AN AUTOMATED PROCESS, AND THE ORGANIZER IS NOTIFIED BY EMAIL THAT
          THIS HAS OCCURRED. SIMILARLY, A COLLECTION THAT IS CREATED BUT NEVER FINALIZED IS AUTOMATICALLY DELETED
          AFTER ITS RETENTION PERIOD EXPIRES (SEE THE PRIVACY POLICY). DELETION CASCADES TO ALL CONTRIBUTIONS AND
          IS IRREVERSIBLE; DELETED CONTENT CANNOT BE RECOVERED. YOU AGREE THAT WORDS THAT MATTER LLC IS NOT LIABLE
          FOR ANY LOSS RESULTING FROM SUCH AUTOMATIC DELETION, AND THAT IT IS YOUR RESPONSIBILITY TO FINALIZE (AND,
          WHERE REQUIRED, PAY FOR) A COLLECTION BEFORE ITS DEADLINE OR RETENTION PERIOD ENDS.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600 }}>Retention after generation.</p>
        <p style={{ marginTop: '0.5rem' }}>
          After a tribute is generated, the collection and its data — including contributor memories and email
          addresses — are automatically deleted approximately thirty (30) days later. See our Privacy Policy for
          full details on storage, encryption, retention, and how a contributor may request removal of their
          memory.
        </p>
      </Section>
      <Section n="6. Acceptable Use">
        <p>You agree not to use the Service to generate or collect content that is:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', listStyle: 'disc' }}>
          <li>Defamatory, harassing, threatening, or harmful to any individual or group;</li>
          <li>Intended for commercial resale or redistribution without our express written permission; or</li>
          <li>In violation of any applicable law or regulation.</li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          We reserve the right to refuse service, cancel a transaction, or terminate access if we determine, in
          our sole discretion, that your use violates these Terms.
        </p>
      </Section>
      <Section n="7. Intellectual Property Rights">
        Upon payment, you receive a non-exclusive, perpetual license to use, edit, and deliver the generated
        content for personal, non-commercial purposes. You may not resell, sublicense, or redistribute generated
        content as a commercial service. Under current U.S. copyright law, content generated wholly by artificial
        intelligence without sufficient human creative input may not be eligible for copyright protection.
      </Section>
      <Section n="8. Third-Party Services">
        The Service relies on third-party providers, including Paddle for payment processing, Anthropic for AI text
        generation, ElevenLabs for optional text-to-speech (audio) generation, Neon for managed database storage,
        Resend for email, and Vercel for hosting. We are not responsible for the acts, omissions, errors, or service
        interruptions of any third-party providers.
      </Section>
      <Section n="9. Indemnification">
        You agree to indemnify, defend, and hold harmless Words That Matter LLC, its affiliates, officers,
        directors, employees, and agents from and against any and all claims, liabilities, damages, losses,
        costs, expenses, or fees (including reasonable attorneys’ fees) arising out of or relating to your use
        of the Service, your violation of these Terms, any content you submit, or your violation of any rights
        of a third party.
      </Section>
      <Section n="10. Limitation of Liability">
        <p style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem' }}>
          TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WORDS THAT MATTER LLC SHALL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. IN NO EVENT SHALL OUR TOTAL
          CUMULATIVE LIABILITY EXCEED THE TOTAL AMOUNT YOU PAID FOR THE SERVICE GIVING RISE TO THE CLAIM.
        </p>
      </Section>
      <Section n="11. Governing Law and Dispute Resolution">
        <p>
          These Terms are governed by the laws of the State of Delaware, without regard to its conflict of law
          provisions. Any dispute shall be resolved by binding arbitration administered by JAMS under its
          Streamlined Arbitration Rules, before a single arbitrator, in Wilmington, Delaware.
        </p>
        <p style={{ marginTop: '1rem', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem' }}>
          YOU AND WORDS THAT MATTER LLC AGREE THAT ANY DISPUTE WILL BE BROUGHT SOLELY IN YOUR INDIVIDUAL
          CAPACITY AND NOT AS PART OF A CLASS, COLLECTIVE, OR REPRESENTATIVE ACTION.
        </p>
      </Section>
      <Section n="12. Changes to These Terms">
        We reserve the right to modify these Terms at any time. If a revision is material, we will provide at
        least thirty (30) days’ notice. Continued use after revised Terms become effective constitutes acceptance.
      </Section>
      <Section n="13. Contact">
        Questions about these Terms? Contact us at{' '}
        <a href="mailto:hello@wordsbywtm.com" style={{ color: 'var(--primary)' }}>hello@wordsbywtm.com</a>.
      </Section>
      <p style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: 'var(--primary)' }}>← Back to start</Link>
      </p>
    </LegalChrome>
  );
}

function Section({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h2 className="font-serif" style={{ fontSize: '1.35rem', marginBottom: '0.6rem', color: 'var(--foreground)' }}>{n}</h2>
      <div style={{ color: 'var(--muted-foreground)', lineHeight: 1.65 }}>{children}</div>
    </section>
  );
}
