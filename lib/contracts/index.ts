/**
 * The frozen API contract. Import everything from here:
 *
 *     import { CategorySchema, CreateReportRequestSchema } from '@/lib/contracts';
 *
 * PRD §11 rule 2. Every endpoint's request and response shape lives in this
 * folder, and the MSW mocks in `mocks/` are generated from these schemas rather
 * than hand-written to match them — hand-written mocks drift, and then A and D
 * build against fiction.
 *
 * Contracts are additive-only once published. Adding an optional field is free.
 * Renaming or removing one breaks four workstreams at runtime, not at compile
 * time. If you need a breaking change, post a Heads up in your status file first.
 *
 * Owner: E (integration).
 */
export * from './enums';
export * from './common';
export * from './report';
export * from './upload';
export * from './incident';
