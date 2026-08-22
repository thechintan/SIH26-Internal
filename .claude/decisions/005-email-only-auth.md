# 005 — Email/password auth for everyone, no phone OTP

**Status:** 🟢 Accepted · **Decided:** 2026-08-22 by Durgesh
**Supersedes:** the "Auth" row of PRD §3 and the auth line of PRD §11 Person B.

## Decision

Both citizens and staff sign in with email + password on Supabase Auth. Phone
OTP is out.

## Why

Phone OTP for citizens is the PRD's default because it removes the friction of
inventing an account. Two things push against it in this build:

- **It needs a paid SMS provider linked to Supabase** (Twilio, MSG91, etc.). No
  provider is linked, so no SMS goes anywhere. Setting one up mid-hackathon is
  billing paperwork the team should not be doing.
- **The 45-second submission budget is not endangered** by an email field. The
  actual friction sink on a phone is the six-digit code arriving 20–90 seconds
  later, mid-report — which is precisely when the citizen is most likely to
  abandon. Email + password is one more field and no wait.

Email + password was already the choice for admins, so this collapses two auth
paths into one and lets the login screen ship without a second provider hookup.

## What changes

- **Nothing in the schema.** `public.users.phone` stays — it holds the seed
  script's synthetic email today, and if phone OTP is ever added back the column
  is already there.
- **A (citizen app)** builds one email/password form for the citizen wizard's
  Step 6 (auth-at-submit). PRD §9.2's "phone number → OTP → session" becomes
  "email + password → session".
- **`lib/supabase/client.ts`** — comments that referenced `signInWithOtp` are
  updated. The client itself is provider-agnostic; nothing to change in code.
- **B** does not need to enable the Phone provider in the Supabase dashboard.

## Explicit non-goals

- Not adding social login (Google, Apple). One provider, one form.
- Not re-enabling phone OTP later in this build. If the pitch needs it, add it
  as a stretch item after the demo is stable — the schema and comments make it
  a small change, not a rewrite.
