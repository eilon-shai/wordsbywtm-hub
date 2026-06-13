import type { NextRequest, NextResponse } from 'next/server';
import {
  createCreateCollectionHandler,
  createSubmitContributionHandler,
  createGetCollectionHandler,
  createCollectionCheckoutHandler,
  createCollectionGenerateHandler,
  createModerateContributionHandler,
} from '@eilon-shai/venture-core/api';
import { getConfig } from '@/products/registry';

type Handler = (req: NextRequest) => Promise<NextResponse>;
type Verb = 'create' | 'contribute' | 'get' | 'checkout' | 'generate' | 'moderate';

// Build all six handlers once per occasion and cache them. Route files call
// resolve(occasion, verb) — the [occasion] segment selects the ProductConfig,
// the verb selects the venture-core factory handler.
const cache = new Map<string, Record<Verb, Handler>>();

export function resolve(occasion: string, verb: Verb): Handler | null {
  const config = getConfig(occasion);
  if (!config) return null;

  let handlers = cache.get(occasion);
  if (!handlers) {
    handlers = {
      create: createCreateCollectionHandler(config),
      contribute: createSubmitContributionHandler(config),
      get: createGetCollectionHandler(config),
      checkout: createCollectionCheckoutHandler(config),
      generate: createCollectionGenerateHandler(config),
      moderate: createModerateContributionHandler(config),
    };
    cache.set(occasion, handlers);
  }
  return handlers[verb];
}
