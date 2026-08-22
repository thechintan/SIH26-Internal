'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '../../_lib/theme-context';
import {
  CATEGORY_LABEL,
  DEPARTMENT_LABEL,
  STATUS_TRANSITIONS,
  canTransition,
  type Department,
  type Status,
} from '../../../../lib/contracts/enums';
import type {
  IncidentDetail,
  PriorityBreakdown,
} from '../../../../lib/contracts/incident';
import { INCIDENTS, INCIDENT_SUMMARIES } from '../../../../mocks/fixtures';
import {
  TIER_COLORS,
  STATUS_COLORS,
  CATEGORY_ICONS,
} from '../../_lib/constants';
import Map from '../../_components/Map';

// ── Shared Card Wrapper ──
function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--admin-bg-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 12,
        padding: 20,
        boxShadow: 'var(--admin-shadow-card)',
      }}
      className={className}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--admin-text-primary)',
        marginBottom: 12,
      }}
    >
      {children}
    </h3>
  );
}

function BreakdownPanel({
  breakdown,
}: {
  breakdown: PriorityBreakdown;
}) {
  const terms = [
    {
      label: 'Severity',
      sublabel: 'Category base score',
      input: breakdown.factors.severity.baseSeverity.toString(),
      weighted: breakdown.factors.severity.weighted,
      color: 'var(--color-semantic-danger)',
    },
    {
      label: 'Reports',
      sublabel: `${breakdown.factors.reportCount.uniqueUsers} unique reporter(s)`,
      input: `ln(1+${breakdown.factors.reportCount.uniqueUsers})`,
      weighted: breakdown.factors.reportCount.weighted,
      color: 'var(--color-semantic-info)',
    },
    {
      label: 'Age',
      sublabel: `${breakdown.factors.age.daysOpen} day(s) open`,
      input: `${breakdown.factors.age.daysOpen}d`,
      weighted: breakdown.factors.age.weighted,
      color: 'var(--color-semantic-warning)',
    },
    {
      label: 'Recurrence',
      sublabel: breakdown.factors.recurrence.isRecurring
        ? 'Location failed before'
        : 'First occurrence',
      input: breakdown.factors.recurrence.isRecurring ? 'Yes' : 'No',
      weighted: breakdown.factors.recurrence.weighted,
      color: 'var(--color-semantic-brand)',
    },
  ];

  const maxWeighted = Math.max(
    ...terms.map((t) => t.weighted),
    1
  );

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <SectionTitle>Priority Breakdown</SectionTitle>

        <span
          style={{
            fontSize: 11,
            color: 'var(--admin-text-muted)',
          }}
        >
          Computed {new Date(breakdown.computedAt).toLocaleString()}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {terms.map((t) => (
          <div key={t.label}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--admin-text-primary)',
                  }}
                >
                  {t.label}
                </span>

                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--admin-text-muted)',
                    marginLeft: 8,
                  }}
                >
                  {t.sublabel}
                </span>
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: 'var(--admin-text-secondary)',
                }}
              >
                {t.weighted.toFixed(2)}
              </span>
            </div>

            <div
              style={{
                height: 8,
                background: 'var(--admin-bg-active)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 4,
                  background: t.color,
                  transition: 'width 0.5s ease',
                  width: `${(t.weighted / maxWeighted) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid var(--admin-border)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--admin-text-primary)',
          }}
        >
          Total Score
        </span>

        <span
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--admin-text-primary)',
          }}
        >
          {breakdown.score.toFixed(2)}
        </span>
      </div>
    </Card>
  );
}

function StatusControls({
  incident,
  onTransition,
}: {
  incident: IncidentDetail;
  onTransition: (to: Status, note?: string) => void;
}) {
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState('');

  const availableTransitions = useMemo(() => {
    return STATUS_TRANSITIONS[incident.status].filter((to) =>
      canTransition(incident.status, to)
    );
  }, [incident.status]);

  const mergeCandidates = useMemo(() => {
    return INCIDENT_SUMMARIES.filter(
      (i) =>
        i.incident_id !== incident.incident_id &&
        ![
          'RESOLVED',
          'VERIFIED',
          'REJECTED',
          'DUPLICATE',
        ].includes(i.status)
    );
  }, [incident.incident_id]);

  const selectedMergeCandidate = useMemo(() => {
    return mergeCandidates.find(
      (candidate) => candidate.incident_id === mergeTarget
    );
  }, [mergeCandidates, mergeTarget]);

  const handleConfirmMerge = () => {
    if (!mergeTarget) return;

    const targetLabel = selectedMergeCandidate
      ? `${CATEGORY_LABEL[selectedMergeCandidate.category]} - ${selectedMergeCandidate.address}`
      : mergeTarget;

    onTransition(
      'DUPLICATE',
      `Incident merged as duplicate into incident ${mergeTarget} (${targetLabel})`
    );

    setMergeModalOpen(false);
    setMergeTarget('');
  };

  return (
    <Card>
      <SectionTitle>Actions</SectionTitle>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--admin-text-muted)',
            }}
          >
            Current:
          </span>

          <span
            style={{
              display: 'inline-flex',
              padding: '2px 10px',
              borderRadius: 9999,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: STATUS_COLORS[incident.status].bg,
              color: STATUS_COLORS[incident.status].text,
              border: `1px solid ${STATUS_COLORS[incident.status].border}`,
            }}
          >
            {incident.status.replace('_', ' ')}
          </span>
        </div>

        {availableTransitions.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
            }}
          >
            {availableTransitions.map((to) => {
              const isPositive = [
                'ACKNOWLEDGED',
                'ASSIGNED',
                'IN_PROGRESS',
                'RESOLVED',
                'VERIFIED',
              ].includes(to);

              const isNegative = [
                'REJECTED',
                'DUPLICATE',
              ].includes(to);

              let bg = 'var(--admin-bg-base)';
              let border = 'var(--admin-border)';
              let text = 'var(--admin-text-secondary)';

              if (isPositive) {
                bg = 'var(--bg-semantic-info)';
                border = 'var(--color-semantic-info)';
                text = 'var(--color-semantic-info)';
              }

              if (isNegative) {
                bg = 'var(--bg-semantic-danger)';
                border = 'var(--color-semantic-danger)';
                text = 'var(--color-semantic-danger)';
              }

              return (
                <button
                  key={to}
                  type="button"
                  onClick={() => onTransition(to)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: bg,
                    border: `1px solid ${border}`,
                    color: text,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Transition to ${to.replace('_', ' ')}`}
                >
                  → {to.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        )}

        {availableTransitions.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--admin-text-muted)',
              fontStyle: 'italic',
            }}
          >
            Terminal status — no further transitions.
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          {!mergeModalOpen ? (
            <button
              type="button"
              onClick={() => setMergeModalOpen(true)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: '1px dashed var(--admin-border)',
                background: 'transparent',
                color: 'var(--admin-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--admin-text-muted)';
                e.currentTarget.style.color =
                  'var(--admin-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--admin-border)';
                e.currentTarget.style.color =
                  'var(--admin-text-secondary)';
              }}
            >
              <svg
                style={{ width: 14, height: 14 }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>

              Merge Duplicate Incidents
            </button>
          ) : (
            <div
              style={{
                padding: 12,
                border: '1px solid var(--admin-border)',
                borderRadius: 8,
                background: 'var(--admin-bg-base)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--admin-text-primary)',
                }}
              >
                Select incident to merge into:
              </div>

              <select
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-bg-surface)',
                  color: 'var(--admin-text-primary)',
                  fontSize: 12,
                }}
              >
                <option value="">-- Select Target --</option>

                {mergeCandidates.map((c) => (
                  <option
                    key={c.incident_id}
                    value={c.incident_id}
                  >
                    {CATEGORY_LABEL[c.category]} - {c.address}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  disabled={!mergeTarget}
                  onClick={handleConfirmMerge}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--bg-semantic-info)',
                    border: '1px solid var(--color-semantic-info)',
                    color: 'var(--color-semantic-info)',
                    cursor: mergeTarget
                      ? 'pointer'
                      : 'not-allowed',
                    opacity: mergeTarget ? 1 : 0.5,
                  }}
                >
                  Confirm Merge
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMergeModalOpen(false);
                    setMergeTarget('');
                  }}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--admin-bg-surface)',
                    border: '1px solid var(--admin-border)',
                    color: 'var(--admin-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid var(--admin-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--admin-text-muted)',
            }}
          >
            Department
          </span>

          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--admin-text-primary)',
            }}
          >
            {incident.department
              ? DEPARTMENT_LABEL[
              incident.department as Department
              ]
              : 'Triage Queue'}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--admin-text-muted)',
            }}
          >
            Assigned to
          </span>

          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--admin-text-primary)',
            }}
          >
            {incident.assigned_to?.name ?? 'Unassigned'}
          </span>
        </div>

        {incident.sla_due_at && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'var(--admin-text-muted)',
              }}
            >
              SLA Due
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--admin-text-primary)',
              }}
            >
              {new Date(
                incident.sla_due_at
              ).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function StatusTimeline({
  incident,
}: {
  incident: IncidentDetail;
}) {
  return (
    <Card>
      <SectionTitle>Status History</SectionTitle>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {incident.status_history.map((entry, i) => (
          <div
            key={`${entry.at}-${i}`}
            style={{
              display: 'flex',
              gap: 12,
              position: 'relative',
            }}
          >
            {i < incident.status_history.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 20,
                  width: 1,
                  height: '100%',
                  background: 'var(--admin-border)',
                }}
              />
            )}

            <div
              style={{
                width: 15,
                height: 15,
                borderRadius: '50%',
                flexShrink: 0,
                marginTop: 2,
                border:
                  i === incident.status_history.length - 1
                    ? '2px solid var(--color-semantic-info)'
                    : '2px solid var(--admin-text-muted)',
                background:
                  i === incident.status_history.length - 1
                    ? 'var(--bg-semantic-info)'
                    : 'var(--admin-bg-surface)',
              }}
            />

            <div
              style={{
                paddingBottom: 16,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    padding: '1.5px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background:
                      STATUS_COLORS[entry.to_status].bg,
                    color:
                      STATUS_COLORS[entry.to_status].text,
                    border: `1px solid ${STATUS_COLORS[entry.to_status].border}`,
                  }}
                >
                  {entry.to_status.replace('_', ' ')}
                </span>

                {entry.actor_name && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--admin-text-muted)',
                    }}
                  >
                    by {entry.actor_name}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: 'var(--admin-text-muted)',
                  marginTop: 2,
                }}
              >
                {new Date(entry.at).toLocaleString()}
              </div>

              {entry.note && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--admin-text-secondary)',
                    marginTop: 4,
                  }}
                >
                  {entry.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeverityConsensus({
  consensus,
}: {
  consensus: IncidentDetail['severity_consensus'];
}) {
  const total =
    consensus.MINOR +
    consensus.MODERATE +
    consensus.SEVERE;

  if (total === 0) return null;

  return (
    <Card>
      <SectionTitle>
        Reporter Severity Consensus
      </SectionTitle>

      <div
        style={{
          fontSize: 10,
          color: 'var(--admin-text-muted)',
          marginTop: -8,
          marginBottom: 12,
        }}
      >
        Advisory only — does not feed the priority score
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
        }}
      >
        {[
          {
            label: 'Minor',
            value: consensus.MINOR,
            color: 'var(--color-semantic-success)',
          },
          {
            label: 'Moderate',
            value: consensus.MODERATE,
            color: 'var(--color-semantic-warning)',
          },
          {
            label: 'Severe',
            value: consensus.SEVERE,
            color: 'var(--color-semantic-danger)',
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: s.color,
                opacity: 0.8,
                marginBottom: 4,
                width: `${(s.value / total) * 100}%`,
                minWidth: s.value > 0 ? 8 : 0,
                margin: '0 auto',
              }}
            />

            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--admin-text-primary)',
              }}
            >
              {s.value}
            </div>

            <div
              style={{
                fontSize: 10,
                color: 'var(--admin-text-muted)',
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecurrenceChain({
  chain,
}: {
  chain: IncidentDetail['recurrence_chain'];
}) {
  if (chain.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--bg-semantic-danger)',
        border: '1px solid var(--color-semantic-danger)',
        borderRadius: 12,
        padding: 20,
        boxShadow: 'var(--admin-shadow-card)',
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--color-semantic-danger)',
          marginBottom: 8,
        }}
      >
        🔄 Recurrence Chain — {chain.length + 1}{' '}
        incident(s) at this location
      </h3>

      <div
        style={{
          fontSize: 12,
          color: 'var(--admin-text-secondary)',
          marginBottom: 12,
        }}
      >
        This location has had repeated failures.{' '}
        {chain.length >= 2
          ? 'Infrastructure replacement may be needed, not just patching.'
          : ''}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {chain.map((c) => (
          <div
            key={c.incident_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
            }}
          >
            <span
              style={{
                color: 'var(--admin-text-muted)',
              }}
            >
              {new Date(
                c.first_reported_at
              ).toLocaleDateString()}
            </span>

            <span
              style={{
                color: 'var(--admin-text-secondary)',
              }}
            >
              →
            </span>

            <span
              style={{
                color: c.resolved_at
                  ? 'var(--color-semantic-success)'
                  : 'var(--color-semantic-warning)',
                fontWeight: 500,
              }}
            >
              {c.resolved_at
                ? `Resolved ${new Date(
                  c.resolved_at
                ).toLocaleDateString()}`
                : 'Still open'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerificationTally({
  verification,
  status,
}: {
  verification: IncidentDetail['verification'];
  status: Status;
}) {
  if (
    status !== 'RESOLVED' &&
    status !== 'VERIFIED' &&
    status !== 'REOPENED'
  ) {
    return null;
  }

  const total =
    verification.fixed +
    verification.not_fixed +
    verification.pending;

  if (total === 0) return null;

  const pctNotFixed =
    total > 0
      ? verification.not_fixed /
      (verification.fixed +
        verification.not_fixed ||
        1)
      : 0;

  return (
    <Card>
      <SectionTitle>Citizen Verification</SectionTitle>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-semantic-success)',
            }}
          >
            {verification.fixed}
          </div>

          <div
            style={{
              fontSize: 10,
              color: 'var(--admin-text-muted)',
            }}
          >
            Fixed
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-semantic-danger)',
            }}
          >
            {verification.not_fixed}
          </div>

          <div
            style={{
              fontSize: 10,
              color: 'var(--admin-text-muted)',
            }}
          >
            Not Fixed
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--admin-text-secondary)',
            }}
          >
            {verification.pending}
          </div>

          <div
            style={{
              fontSize: 10,
              color: 'var(--admin-text-muted)',
            }}
          >
            Pending
          </div>
        </div>
      </div>

      {pctNotFixed > 0.4 && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-semantic-danger)',
            marginTop: 12,
          }}
        >
          ⚠ &gt;40% say not fixed — auto-reopen threshold
          reached
        </div>
      )}
    </Card>
  );
}

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params.id as string;

  const initialIncident = useMemo(
    () =>
      INCIDENTS.find(
        (i) => i.incident_id === incidentId
      ),
    [incidentId]
  );

  const [incident, setIncident] =
    useState<IncidentDetail | undefined>(
      initialIncident
    );

  const { isDark } = useTheme();

  if (!incident) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 36 }}>🔍</div>

          <div
            style={{
              fontSize: 14,
              color: 'var(--admin-text-muted)',
            }}
          >
            Incident not found
          </div>

          <Link
            href="/admin"
            style={{
              fontSize: 12,
              color: 'var(--color-semantic-info)',
              textDecoration: 'none',
            }}
          >
            ← Back to queue
          </Link>
        </div>
      </div>
    );
  }

  const tierColors = TIER_COLORS[incident.priority_tier];

  const handleTransition = (
    newStatus: Status,
    note = 'Status updated via admin dashboard'
  ) => {
    setIncident((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        status: newStatus,
        status_history: [
          ...prev.status_history,
          {
            from_status: prev.status,
            to_status: newStatus,
            at: new Date().toISOString(),
            actor_name: 'Super Admin',
            note,
          },
        ],
      };
    });
  };

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: 1280,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <Link
            href="/admin"
            style={{
              fontSize: 12,
              color: 'var(--color-semantic-info)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 500,
            }}
          >
            <svg
              style={{ width: 12, height: 12 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Queue
          </Link>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--admin-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: '8px 0 0',
            }}
          >
            <span>
              {CATEGORY_ICONS[incident.category]}
            </span>

            {CATEGORY_LABEL[incident.category]}
          </h1>

          <div
            style={{
              fontSize: 14,
              color: 'var(--admin-text-secondary)',
            }}
          >
            {incident.address}
          </div>

          {incident.ward_name && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--admin-text-muted)',
              }}
            >
              Ward: {incident.ward_name}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 14,
              fontWeight: 700,
              background: tierColors.bg,
              color: tierColors.text,
              border: `1px solid ${tierColors.border}`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: tierColors.text,
              }}
            />

            {incident.priority_score.toFixed(1)}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-semantic-success)',
              padding: '4px 10px',
              borderRadius: 20,
              border:
                '1px solid var(--color-semantic-success)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background:
                  'var(--color-semantic-success)',
                boxShadow:
                  '0 0 8px var(--color-semantic-success)',
                animation: 'pulse 2s infinite',
              }}
            />

            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--color-semantic-success)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Live Sync
            </span>
          </div>

          <span
            style={{
              display: 'inline-flex',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background:
                STATUS_COLORS[incident.status].bg,
              color:
                STATUS_COLORS[incident.status].text,
              border: `1px solid ${STATUS_COLORS[incident.status].border}`,
            }}
          >
            {incident.status.replace('_', ' ')}
          </span>

          {incident.manual_override && (
            <span
              style={{
                fontSize: 10,
                padding: '4px 8px',
                borderRadius: 4,
                background:
                  'var(--bg-semantic-warning)',
                color:
                  'var(--color-semantic-warning)',
                fontWeight: 600,
                border:
                  '1px solid var(--color-semantic-warning)',
              }}
            >
              📌 Pinned
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 24,
        }}
      >
        {/* Left column */}
        <div
          style={{
            gridColumn: 'span 12',
          }}
          className="lg:col-span-8 space-y-6"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            <Card>
              <SectionTitle>
                Report Photos{' '}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: 'var(--admin-text-muted)',
                    marginLeft: 8,
                  }}
                >
                  {incident.reports.length} of{' '}
                  {incident.report_count} reports shown
                </span>
              </SectionTitle>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(4, 1fr)',
                  gap: 8,
                }}
              >
                {incident.reports.map((r) => (
                  <div
                    key={r.report_id}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 8,
                      overflow: 'hidden',
                      position: 'relative',
                      background:
                        'var(--admin-bg-active)',
                      border:
                        '1px solid var(--admin-border)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                      }}
                    >
                      {r.photo_url ? (
                        <img
                          src={r.photo_url}
                          alt={`Report ${r.ticket_id}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent:
                              'center',
                            fontSize: 24,
                          }}
                        >
                          📷
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle>Location</SectionTitle>

              <div
                style={{
                  height: 260,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border:
                    '1px solid var(--admin-border)',
                  background:
                    'var(--admin-bg-active)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                  }}
                >
                  <Map
                    markers={[
                      ...incident.reports.map((r) => ({
                        id: r.report_id,
                        lat: r.location.lat,
                        lng: r.location.lng,
                        title: `Report #${r.ticket_id}`,
                        isCentroid: false,
                      })),
                      {
                        id: 'centroid',
                        lat: incident.centroid.lat,
                        lng: incident.centroid.lng,
                        title: 'Calculated Centroid',
                        isCentroid: true,
                      },
                    ]}
                    center={[
                      incident.centroid.lat,
                      incident.centroid.lng,
                    ]}
                    zoom={14}
                    isDark={isDark}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  marginTop: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color:
                      'var(--admin-text-muted)',
                  }}
                >
                  Centroid:{' '}
                  {incident.centroid.lat.toFixed(4)},{' '}
                  {incident.centroid.lng.toFixed(4)}
                </span>

                <a
                  href={`https://www.google.com/maps?q=${incident.centroid.lat},${incident.centroid.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    color:
                      'var(--color-semantic-info)',
                    textDecoration: 'none',
                  }}
                >
                  Open in Google Maps ↗
                </a>
              </div>
            </Card>

            {incident.reports.some(
              (r) => r.description
            ) && (
                <Card>
                  <SectionTitle>
                    Citizen Notes
                  </SectionTitle>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {incident.reports
                      .filter((r) => r.description)
                      .map((r) => (
                        <div
                          key={r.report_id}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            background:
                              'var(--admin-bg-base)',
                            border:
                              '1px solid var(--admin-border)',
                            fontSize: 13,
                            color:
                              'var(--admin-text-secondary)',
                          }}
                        >
                          <span
                            style={{
                              color:
                                'var(--admin-text-muted)',
                              marginRight: 8,
                              fontWeight: 600,
                            }}
                          >
                            #{r.ticket_id}
                          </span>

                          {r.description}
                        </div>
                      ))}
                  </div>
                </Card>
              )}

            {incident.resolution_photo_url && (
              <div
                style={{
                  background:
                    'var(--bg-semantic-success)',
                  border:
                    '1px solid var(--color-semantic-success)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color:
                      'var(--color-semantic-success)',
                    marginBottom: 12,
                  }}
                >
                  ✅ Resolution Photo
                </h3>

                <div
                  style={{
                    height: 200,
                    borderRadius: 8,
                    background:
                      'var(--admin-bg-active)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <img
                    src={incident.resolution_photo_url}
                    alt="Resolution"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div
          style={{
            gridColumn: 'span 12',
          }}
          className="lg:col-span-4 space-y-6"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {incident.priority_breakdown && (
              <BreakdownPanel
                breakdown={incident.priority_breakdown}
              />
            )}

            <StatusControls
              incident={incident}
              onTransition={handleTransition}
            />

            <StatusTimeline incident={incident} />

            <SeverityConsensus
              consensus={incident.severity_consensus}
            />

            <RecurrenceChain
              chain={incident.recurrence_chain}
            />

            <VerificationTally
              verification={incident.verification}
              status={incident.status}
            />

            <Card>
              <SectionTitle>Details</SectionTitle>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--admin-text-muted)',
                    }}
                  >
                    First reported
                  </span>

                  <span
                    style={{
                      color:
                        'var(--admin-text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {new Date(
                      incident.first_reported_at
                    ).toLocaleDateString()}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--admin-text-muted)',
                    }}
                  >
                    Report count
                  </span>

                  <span
                    style={{
                      color:
                        'var(--admin-text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {incident.report_count} unique
                    reporters
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--admin-text-muted)',
                    }}
                  >
                    Age
                  </span>

                  <span
                    style={{
                      color:
                        'var(--admin-text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {incident.age_days.toFixed(1)} days
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--admin-text-muted)',
                    }}
                  >
                    Category
                  </span>

                  <span
                    style={{
                      color:
                        'var(--admin-text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {CATEGORY_LABEL[
                      incident.category
                    ]}
                  </span>
                </div>

                {incident.flagged_mismatch && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                    }}
                  >
                    <span
                      style={{
                        color:
                          'var(--color-semantic-warning)',
                        fontWeight: 600,
                      }}
                    >
                      ⚠ Flagged mismatch
                    </span>

                    <span
                      style={{
                        color:
                          'var(--color-semantic-warning)',
                        fontSize: 10,
                      }}
                    >
                      Category may be wrong
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}