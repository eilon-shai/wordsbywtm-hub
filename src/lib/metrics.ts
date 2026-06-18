import type { SqlClient } from '@eilon-shai/venture-core/db';
import { ensureFeedbackTable } from '@eilon-shai/venture-core/db';
import type { ProductConfig } from '@eilon-shai/venture-core/types';
import { getConfig, OCCASIONS } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Business metrics — sourced entirely from our own Postgres (no third-party
// analytics for purchase/feedback data; grief/PII context stays in-house and is
// covered by the 30-day purge). Funnel counts come from collections +
// contributions; feedback is persisted by venture-core's feedback handler into
// the collection_feedback table (we only READ it here for the dashboard).
// Read by the Basic-Auth'd /support/metrics page.
// ---------------------------------------------------------------------------

// ---- dashboard read model -------------------------------------------------

export interface OccasionMetrics {
  occasion: string;
  title: string;
  created: number; // collections started
  finalized: number; // paid + tribute generated
  memories: number; // contributions across this occasion's collections
  conversion: number; // finalized / created (0..1)
  feedbackCount: number;
  avgRating: number | null; // 1..5
  ratingDist: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface MetricsSnapshot {
  generatedAt: string;
  totals: Omit<OccasionMetrics, 'occasion' | 'title'>;
  byOccasion: OccasionMetrics[];
  weekly: { week: string; created: number; finalized: number }[]; // last 12 weeks, all occasions
}

interface ProdRow { product: string; created: string; finalized: string; memories: string }
interface FbRow { product: string; n: string; avg: string | null; r1: string; r2: string; r3: string; r4: string; r5: string }
interface WeekRow { week: string; created: string; finalized: string }

const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v));

export async function getMetrics(db: SqlClient): Promise<MetricsSnapshot> {
  await ensureFeedbackTable(db);

  // Map live occasions' Paddle product id → occasion meta (the isolation key).
  const live = OCCASIONS.filter((o) => o.live)
    .map((o) => ({ occasion: o.slug, title: o.title, config: getConfig(o.slug) }))
    .filter((x): x is { occasion: string; title: string; config: ProductConfig } => !!x.config?.collectionConfig);
  const byProduct = new Map(live.map((x) => [x.config.brand.paddleProductId, x]));
  const productIds = [...byProduct.keys()];

  // Funnel counts per product (collections + their contributions). "finalized"
  // = tribute generated (pay-before-generate, so generated ⇒ paid).
  const funnel = await db.query<ProdRow>(
    `select c.product,
            count(*)                                          as created,
            count(*) filter (where c.status = 'generated')    as finalized,
            coalesce(sum(cc.n), 0)                             as memories
       from collections c
       left join (
         select collection_id, count(*) as n from contributions group by collection_id
       ) cc on cc.collection_id = c.id
      where c.product = any($1::text[])
      group by c.product`,
    [productIds],
  );

  const fb = await db.query<FbRow>(
    `select product,
            count(*)                                   as n,
            avg(rating)                                as avg,
            count(*) filter (where rating = 1)         as r1,
            count(*) filter (where rating = 2)         as r2,
            count(*) filter (where rating = 3)         as r3,
            count(*) filter (where rating = 4)         as r4,
            count(*) filter (where rating = 5)         as r5
       from collection_feedback
      where product = any($1::text[])
      group by product`,
    [productIds],
  );

  const weeklyRows = await db.query<WeekRow>(
    `select to_char(date_trunc('week', created_at), 'YYYY-MM-DD')      as week,
            count(*)                                                   as created,
            count(*) filter (where status = 'generated')               as finalized
       from collections
      where product = any($1::text[])
        and created_at >= now() - interval '12 weeks'
      group by 1
      order by 1`,
    [productIds],
  );

  const funnelByProduct = new Map(funnel.map((r) => [r.product, r]));
  const fbByProduct = new Map(fb.map((r) => [r.product, r]));

  const byOccasion: OccasionMetrics[] = live.map(({ occasion, title, config }) => {
    const f = funnelByProduct.get(config.brand.paddleProductId);
    const g = fbByProduct.get(config.brand.paddleProductId);
    const created = num(f?.created);
    const finalized = num(f?.finalized);
    return {
      occasion,
      title,
      created,
      finalized,
      memories: num(f?.memories),
      conversion: created > 0 ? finalized / created : 0,
      feedbackCount: num(g?.n),
      avgRating: g?.avg != null ? Number(g.avg) : null,
      ratingDist: { 1: num(g?.r1), 2: num(g?.r2), 3: num(g?.r3), 4: num(g?.r4), 5: num(g?.r5) },
    };
  });

  // Roll up totals (weighted average rating across occasions).
  const ratingSum = byOccasion.reduce((s, o) => s + (o.avgRating ?? 0) * o.feedbackCount, 0);
  const fbTotal = byOccasion.reduce((s, o) => s + o.feedbackCount, 0);
  const createdTotal = byOccasion.reduce((s, o) => s + o.created, 0);
  const finalizedTotal = byOccasion.reduce((s, o) => s + o.finalized, 0);
  const totals: MetricsSnapshot['totals'] = {
    created: createdTotal,
    finalized: finalizedTotal,
    memories: byOccasion.reduce((s, o) => s + o.memories, 0),
    conversion: createdTotal > 0 ? finalizedTotal / createdTotal : 0,
    feedbackCount: fbTotal,
    avgRating: fbTotal > 0 ? ratingSum / fbTotal : null,
    ratingDist: {
      1: byOccasion.reduce((s, o) => s + o.ratingDist[1], 0),
      2: byOccasion.reduce((s, o) => s + o.ratingDist[2], 0),
      3: byOccasion.reduce((s, o) => s + o.ratingDist[3], 0),
      4: byOccasion.reduce((s, o) => s + o.ratingDist[4], 0),
      5: byOccasion.reduce((s, o) => s + o.ratingDist[5], 0),
    },
  };

  return {
    generatedAt: new Date().toISOString(),
    totals,
    byOccasion,
    weekly: weeklyRows.map((w) => ({ week: w.week, created: num(w.created), finalized: num(w.finalized) })),
  };
}
