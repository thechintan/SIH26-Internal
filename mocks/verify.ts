/**
 * Contract conformance check for the mock layer.
 *
 *     npm run verify:mocks
 *
 * Parses every fixture through the real Zod schema it claims to satisfy. This is
 * the guard that keeps mocks from drifting: the moment a contract changes and a
 * fixture does not, this fails, instead of A and D discovering it when the real
 * API lands three hours before submission.
 *
 * Owner: E (integration).
 */
import {
  IncidentDetailSchema,
  IncidentSummarySchema,
  PublicStatsSchema,
} from '../lib/contracts/incident';
import {
  MyReportListItemSchema,
  ReportDetailSchema,
} from '../lib/contracts/report';
import { CATEGORIES, STATUSES, priorityTier } from '../lib/contracts/enums';
import {
  INCIDENTS,
  INCIDENT_SUMMARIES,
  MY_REPORTS,
  MY_REPORT_DETAILS,
  PUBLIC_STATS,
} from './fixtures';

let failures = 0;

function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok    ${label}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL  ${label}`);
    console.error(`        ${err instanceof Error ? err.message.split('\n')[0] : err}`);
  }
}

console.log('\nfixtures vs contracts');
check(`${INCIDENTS.length} incident details`, () => {
  for (const i of INCIDENTS) IncidentDetailSchema.parse(i);
});
check(`${INCIDENT_SUMMARIES.length} incident summaries`, () => {
  for (const s of INCIDENT_SUMMARIES) IncidentSummarySchema.parse(s);
});
check(`${MY_REPORTS.length} report list items`, () => {
  for (const r of MY_REPORTS) MyReportListItemSchema.parse(r);
});
check(`${Object.keys(MY_REPORT_DETAILS).length} report details`, () => {
  for (const r of Object.values(MY_REPORT_DETAILS)) ReportDetailSchema.parse(r);
});
check('public stats', () => PublicStatsSchema.parse(PUBLIC_STATS));

console.log('\ninvariants');
check('report_count is always >= 1', () => {
  const bad = INCIDENTS.filter((i) => i.report_count < 1);
  if (bad.length) throw new Error(`${bad.length} incidents with no reporters`);
});
check('priority_tier agrees with priority_score', () => {
  const bad = INCIDENTS.filter((i) => priorityTier(i.priority_score) !== i.priority_tier);
  if (bad.length) throw new Error(`${bad.length} incidents with a mismatched tier`);
});
check('breakdown terms sum to the total', () => {
  for (const i of INCIDENTS) {
    const b = i.priority_breakdown;
    if (!b) continue;
    const sum = b.severity.weighted + b.reports.weighted + b.age.weighted + b.recurrence.weighted;
    if (Math.abs(sum - b.total) > 0.05) {
      throw new Error(`${i.incident_id}: terms sum to ${sum.toFixed(2)}, total says ${b.total}`);
    }
  }
});
check('breakdown total equals priority_score', () => {
  for (const i of INCIDENTS) {
    if (i.priority_breakdown && Math.abs(i.priority_breakdown.total - i.priority_score) > 0.01) {
      throw new Error(`${i.incident_id}: breakdown and score disagree`);
    }
  }
});
check('a resolved incident always has a resolution photo', () => {
  const bad = INCIDENTS.filter((i) => i.status === 'RESOLVED' && !i.resolution_photo_url);
  if (bad.length) throw new Error(`${bad.length} resolved incidents with no proof of work`);
});
check('every category appears in the fixture set', () => {
  const seen = new Set(INCIDENTS.map((i) => i.category));
  const missing = CATEGORIES.filter((c) => !seen.has(c));
  if (missing.length) throw new Error(`never generated: ${missing.join(', ')}`);
});
check('every fixture status is a frozen enum member', () => {
  const bad = INCIDENTS.filter((i) => !STATUSES.includes(i.status));
  if (bad.length) throw new Error(`${bad.length} incidents with an unknown status`);
});
check('queue is ranked by score, descending', () => {
  for (let i = 1; i < INCIDENTS.length; i++) {
    if (INCIDENTS[i].priority_score > INCIDENTS[i - 1].priority_score) {
      throw new Error(`out of order at index ${i}`);
    }
  }
});

const tiers = INCIDENTS.reduce<Record<string, number>>((acc, i) => {
  acc[i.priority_tier] = (acc[i.priority_tier] ?? 0) + 1;
  return acc;
}, {});
console.log('\ntier spread (a wall of one colour means the thresholds are wrong)');
for (const [tier, n] of Object.entries(tiers)) console.log(`  ${tier.padEnd(9)} ${n}`);

if (failures) {
  console.error(`\n${failures} check(s) failed\n`);
  process.exit(1);
}
console.log('\nall contract checks pass\n');
