# Attorney Brief — Collaborative "Collection" Product (LC-03)

**From:** Words That Matter LLC (Eilon Shai)
**Date:** 2026-06-17
**Re:** Terms of Service + Privacy Policy updates for a NEW product model (collaborative memory collection) launching at **wordsbywtm.com**. **Four occasions are now live** on one platform — **memorial, retirement, wedding, anniversary** (identical flow + legal posture; the deliverable is a tribute / send-off / toast). Memorial is the most sensitive (bereavement / special-category data).
**Status:** Engineering complete; **launch is gated on your review.** Please advise on the clauses below and confirm the retention/withdrawal positions so we can bump the Terms version + effective date.

> This is a new flow, materially different from our existing single-user speech/eulogy generators (vocalvow.com, tributewords.com, milestonescribe.com), which you previously reviewed. The product, payment timing, third-party data handling, and **automated deletion/generation** are different. Please treat the existing pages as a starting point but assume the data flows below are new.

---

## 1. What the product does (plain English)

1. An **organizer** creates a "collection" for an occasion (e.g., a memorial for a named person, the "honoree"). It is **free to create**.
2. The organizer gets a private link and shares a public link with friends/family (**contributors**).
3. Each **contributor** submits **one memory** about the honoree. They provide their **name, (optional) relationship, the memory text, and an email address**, and tick a **consent** box. No account is created.
4. The organizer reviews the memories on a dashboard (include/exclude) and adds their own.
5. The organizer **pays a one-time fee** (Merchant of Record: **Paddle**; no subscription). Payment can happen at finalize, **or in advance**.
6. After payment, our AI (**Anthropic Claude**) synthesizes all included memories into **one combined tribute**, which is emailed to the organizer and viewable via their private link.
7. **Optional spoken version:** the organizer may request an audio (text-to-speech) reading of the finished tribute. The tribute text is sent to **ElevenLabs** to synthesize the narration, which is stored with the collection and deleted on the same schedule.

## 2. The parts that need new legal language

These behaviors are **automated and time-based**, and they delete or process people's contributed content without a further click. They must be disclosed and authorized.

### (a) Deadline auto-actions (daily automated job)
The organizer sets an optional **deadline** (max ~1 month out). A daily automated job then:
- **3 days before** the deadline: emails the organizer a warning.
- **At the deadline, if the organizer has NOT paid:** the **collection and all contributed memories are permanently deleted** (and the organizer is emailed that it was deleted).
- **At the deadline, if the organizer HAS paid:** we **automatically generate the tribute on their behalf** using whatever memories were collected, and email it — **without a further action from the organizer**.
- **If paid but no memories were collected:** the deadline is **automatically extended** (a capped number of times) and the organizer is nudged.

### (b) Data retention + automatic purge
- A **finalized** collection's data (including contributor PII) is **automatically deleted ~30 days after the tribute is generated**.
- An **abandoned / never-finalized** collection is automatically deleted after its time-to-live.
- Deletion is by an automated daily job and **cascades to all contributions** (irreversible).
- **Question for you:** is **30 days** post-generation an acceptable retention period to state in the Privacy Policy, or do you recommend a different number? We will state whatever you approve and the code already enforces it.

### (c) Pay-in-advance + deferred/automatic performance (EU/UK withdrawal)
- The one-time fee may be paid **before** the tribute is generated (the actual "digital content" is produced later — at finalize or automatically at the deadline).
- We need your position on the **EU/UK 14-day right of withdrawal** for digital content: when is performance deemed to begin, and what acknowledgement/consent-to-immediate-performance language is required given that generation can occur automatically days after payment? (Our current single-user products waive the 14-day right at the point of immediate delivery; here delivery may be deferred.)
- **Implemented since this brief:** the pay-in-advance checkout now shows a deferred-performance acknowledgement checkbox and **records that waiver server-side** (terms version + timestamp + IP, keyed to the transaction). Please confirm the **exact checkbox wording** and that this acknowledgement model is sufficient.

### (d) Contributor data (third parties, not the buyer)
- Contributors are **third parties** who submit personal data (their name, relationship, **email**, and a memory that may include personal data about the deceased/honoree and others).
- We collect the **email** to enforce "one memory per person" (it is stored encrypted and also stored as a keyed hash for de-duplication) and to support removal requests.
- Contributors see a consent notice and tick a box; we **record proof of consent** (timestamp + consent-text version).
- Contributors are told they can request removal by emailing us (there is **no self-serve delete** for an individual contributor yet — the organizer can delete the whole collection).

## 3. Personal data inventory (for the Privacy Policy)

| Subject | Data collected | Stored | Legal basis (proposed) | Retention |
|---|---|---|---|---|
| Organizer | email, honoree name, tone/length prefs | Neon Postgres | Contract / legitimate interest | 30 days post-generation; or TTL if abandoned |
| Contributor | name, relationship (optional), **email**, memory text | Neon Postgres, **AES-256-GCM encrypted at rest**; email also stored as a keyed HMAC hash for dedup | **Consent** (recorded: timestamp + version) | deleted with the collection (30 days post-generation, or TTL if abandoned) |
| Both | IP address | transient (Redis) for rate-limiting / abuse prevention | Legitimate interest | short-lived |
| Payment | handled by Paddle (Merchant of Record) — we do **not** store card data | Paddle | Contract | per Paddle |

**Sub-processors / third parties data is shared with:** Paddle (payments/MoR), Neon (database hosting), Upstash (Redis cache/rate-limiting), Resend (transactional email), **Anthropic (the memory text is sent to Anthropic's API to generate the tribute)**, and **ElevenLabs (the finished tribute text is sent to ElevenLabs' API to generate the optional spoken/audio version)**. The Anthropic + ElevenLabs processing of contributed memories is the most sensitive disclosure — both are now disclosed in the interim in-app Privacy §4 + Terms §8; please confirm how you want each described. (Both are contractually no-training; please confirm that representation.)

## 4. Specific changes we believe are needed (please confirm/redraft)

**Terms of Service — add a "Collections" section covering:**
1. Roles: organizer vs contributor; the organizer is responsible for who they invite and represents they may collect these memories.
2. One-time fee, Merchant of Record (Paddle), no subscription; the fee is the same whether paid in advance or at finalize.
3. **Authorization for automatic generation:** by setting a deadline (or paying in advance), the organizer authorizes us to generate the tribute automatically at the deadline using the memories then available.
4. **Automatic deletion disclaimer:** if not finalized by the deadline, the collection and all memories are permanently deleted and unrecoverable; we are not liable for that loss.
5. **Automatic deadline extension** for paid-but-empty collections.
6. AI-generated nature of the output; no guarantee of accuracy; human review recommended.
7. Contributor content: license to use submitted memories solely to produce the tribute; contributor warrants their submission.
8. Refund / EU-UK withdrawal handling for deferred digital content (see 2c).

**Privacy Policy — add/adjust:**
1. The data inventory in §3 (esp. that we now collect **contributor email**).
2. Encryption at rest + keyed-hash dedup purpose.
3. **Retention**: state the post-generation retention period (proposed 30 days) and the automated purge; abandoned-collection deletion.
4. **Right to erasure**: contributors may email [support] to have their memory removed; organizer may delete the whole collection.
5. IP address used for rate-limiting / abuse prevention (legitimate interest).
6. Sub-processor list incl. **Anthropic** (memories processed by AI to generate the tribute).
7. Disclosure that, at the deadline, a contributor's memory may be auto-included in the tribute or, if unfinalized, auto-deleted.

**Refund Policy:** clarify the 14-day window relative to **purchase vs. generation** for the pay-in-advance + auto-generate case.

## 5. What we need back from you

1. Approve / redraft the ToS "Collections" section and the Privacy additions above.
2. **Confirm the retention period** to state (we proposed 30 days post-generation).
3. **Confirm the EU/UK withdrawal position** for pay-in-advance + deferred/automatic generation, and the exact acknowledgement wording to show at payment.
4. Confirm the **Anthropic + ElevenLabs (AI sub-processor)** disclosure wording.
5. Confirm this covers **all four live occasions** (memorial / retirement / wedding / anniversary) — same flow, one set of legal pages.
5. Once approved, we will update the rendered Terms/Privacy/Refund pages and **bump the Terms version + effective date** (our consent records store the version, so a version bump matters).

*Reference: this corresponds to internal finding **LC-03** (plus LC-04/LC-06/LC-08) in our pre-launch review (`docs/EXPERT_PANEL_REVIEW_SES044.md`). The engineering for all of the above (encryption, consent recording, automated deletion, retention purge, disclosures in-app) is already implemented and live; only the attorney-authored legal-page wording remains before paid launch.*
