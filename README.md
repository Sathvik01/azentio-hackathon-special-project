# azentio.ai — Website & Intelligent Collaboration Portal (hackathon prototype)

This prototype is a public website and a governed collaboration portal for employees and client organisations. Clients contribute market observations. Those observations become reviewed, de-identified collective learning, and that learning feeds product improvement ideas. Every access decision is made **on the server**, including direct API and media requests.

Everything runs **locally**: Postgres and Mailpit in Docker, and the app with `npm run dev`. All data is synthetic.

## Quick start (Windows / macOS / Linux)

Prerequisites: Docker Desktop and Node 20 or later.

```bash
npm install
```

```bash
cp .env.example .env
```

Then edit `.env`:
- Set `AUTH_SECRET` to a long random string.
- Optionally paste a free NVIDIA key into `AI_API_KEY` (see AIRA below).

```bash
npm run setup
```

```bash
npm run dev
```

- App: http://localhost:3000
- Mail inbox, where magic links and invitations land: http://localhost:8025
- Reset all demo data: `npm run demo:reset`

Postgres is published on host port **5433**, so it doesn't clash with a local Postgres on 5432.

## Seeded personas

Sign in at `/signin` with any address below. The single-use link arrives in Mailpit and is valid for 15 minutes.

| Persona | Email | Notes |
|---|---|---|
| Employee | asha.employee@azentio.com | No extra grants. Owns one assigned idea. |
| Content publisher | priya.publisher@azentio.com | `PUBLISH_CONTENT` |
| Learning moderator | omar.moderator@azentio.com | `MODERATE_LEARNING` |
| Product owner | lena.product@azentio.com | `PRODUCT_OWNER` |
| Portal administrator | sam.admin@azentio.com | `PORTAL_ADMIN`. Has no implicit access to client content. |
| Client admin, Northwind Bank | nora.admin@northwind.example | Has a submitted item with sensitive flags. |
| Client member, Northwind Bank | nate.member@northwind.example | Has a private draft and published items. |
| Client admin, Harbor Finance | hari.admin@harbor.example | Has an item returned for clarification. |
| Client member, Harbor Finance | hema.member@harbor.example | |
| Client admin, Cedar Credit Union | cara.admin@cedar.example | |
| Client member, Cedar Credit Union | colm.member@cedar.example | |
| Multi-membership client | maya.multi@consult.example | Member of Northwind and Cedar; must pick a workspace. |

Unknown addresses see the same "check your inbox" page but receive no link, so nobody can probe which addresses are registered.

## 10-minute demo script (the brief's seasonality scenario)

1. **Public visitor.**
   - Browse `/`, `/offerings` and `/insights`.
   - Submit `/demo` or `/hackathon`.
   - Ask AIRA at `/aira`. It only has public scope.
2. **Client: nate@Northwind.**
   - The dashboard shows the active org, entitled offerings, contribution status and improvement updates.
   - Under *My observations*, create a new observation. Saving creates a **private draft**.
   - Edit it, choose *Propose for the approved learning community* and tick publish permission, then click **Submit for review**.
   - The detail page shows "Who can see this" and the four separate consents.
3. **Moderator: omar.**
   - Open *Moderation*. The queue shows only submitted community proposals. Nate's private draft "Notes from branch visits" is not there.
   - Open "Trade-finance document turnaround" and look at the sensitive-content flags.
   - Redact the shared text, keep the coarsened region and quarter, and publish. A new `LRN-xxxx` copy appears.
   - Optionally, return an item for clarification. The author gets an in-app notification.
4. **Shared learning, as any client.**
   - Open *Shared learning*, filter and search.
   - The *Distinct contributing organisations* count is suppressed when fewer than 3 organisations are in the result.
   - The *Themes* page shows **Seasonality context**: 3 organisations, a small-sample warning and links to the evidence.
   - **Bilingual document extraction** has only 1 organisation, so its count is suppressed.
5. **Product owner: lena.**
   - Open *Improvement ideas*. **Seasonality-aware comparison explanation** is *Under review* and linked to the theme and its evidence.
   - Change its status. Linked contributors get a theme-level in-app update, and the change is audited.
6. **Client: hema@Harbor.**
   - *Improvement updates* shows the plain-language status. It shows no priority, no owner identity and no private sources.
7. **Withdrawal.**
   - As nate, open a published observation and click **Withdraw**.
   - It disappears immediately from the feed, search, theme counts and AIRA citations.
8. **Employee experience: asha.**
   - Use the Playground: inspect inputs, run a scenario, read the evidence and caveats, and leave feedback.
   - *Live & recordings* has employee-only media. Opening `/api/media/<id>` as a client returns 404.
   - *Knowledge* lists owners and review dates.
9. **Client admin: nora.**
   - Under *Organisation admin*, invite `new.person@northwind.example`. The invitation email lands in Mailpit.
   - Sign in as that address and open the invite link. You'll see the terms and sharing explanation before landing in the Northwind workspace.
   - The role selector only offers *Member* and *Client administrator*.
10. **Portal admin: sam.**
    - Toggle entitlements, provision an employee, grant a time-boxed `SUPPORT_ACCESS`, and inspect the *Audit log*.

## Architecture

```
Browser → middleware (redirect only — not authority)
        → Server Components / Server Actions / Route Handlers
             getActor()   session → memberships, grants, entitlements from DB → validated active workspace
             policy.*     deny-by-default rules (src/server/policy/index.ts)
             repo/*       the only Prisma callers; every query takes the actor and filters in SQL, then re-checks with policy
             /api/media/[id]  streams files from storage/media after the parent content's audience check
             AIRA         retrieve(actor-scoped, PUBLISHED only) → LangChain ChatOpenAI → NVIDIA NIM (or any OpenAI-compatible host)
```

| Area | Where |
|---|---|
| Access rules (IAM-01/02) | `src/server/policy/` |
| Actor resolution | `src/server/auth/actor.ts`, `src/server/repo/identity.ts` |
| Lifecycle state machine | `src/server/learning/stateMachine.ts` |
| Sensitive-content scan | `src/server/learning/scan.ts` (deterministic and local; drafts never go to an AI provider) |
| De-identification helpers | `src/server/learning/coarsen.ts` |
| Cohort suppression | `src/server/learning/aggregate.ts` (`MIN_COHORT_ORGS`, default and minimum 3) |
| Allow-list DTOs | `src/server/dto/index.ts` |
| AIRA | `src/server/aira/index.ts`, `src/server/ai/client.ts` |
| Schema | `prisma/schema.prisma`. The private `Observation` is kept separate from the approved `SharedObservation`, and a moderator-only `SharedSourceLink` connects them. |

### AIRA and the free AI provider

AIRA uses LangChain's `ChatOpenAI` pointed at NVIDIA's OpenAI-compatible endpoint, with `withStructuredOutput` for cited answers.

To set it up:
1. Get a free key at https://build.nvidia.com.
2. Set `AI_API_KEY=nvapi-...` in `.env`.
3. Change `AI_CHAT_MODEL` if you want a different catalogue model.

To use another free host (Groq, OpenRouter, a local server), change `AI_BASE_URL`, `AI_API_KEY` and `AI_CHAT_MODEL`. No code changes are needed.

Without a key, AIRA falls back to an extractive listing of the same permitted sources.

How retrieval is scoped and checked:
- **Public visitors** see public content only.
- **Clients** see approved shared copies, themes and content their workspace is entitled to.
- **Employees** additionally see employee content.
- Postgres full-text search runs over `status = 'PUBLISHED'` rows, so a withdrawal takes effect immediately.
- The server drops any citation the model invents.

## Tests

```bash
npm test
```

```bash
npm run test:integration
```

```bash
npm run test:acceptance
```

- `npm test` runs unit tests: the policy matrix, state machine, scan, suppression and DTO leak checks.
- `npm run test:integration` runs the repositories against the seeded database: tenant isolation, the save-never-shares rule, publish → withdraw propagation, theme counts, AIRA scope and client-admin escalation.
- `npm run test:acceptance` runs HTTP checks against the running app: IDOR, media, forged workspace cookies, payload leakage and session-token exposure. Run `npm run dev` first.

## Governance notes

- **Withdrawal SLA.**
  - In this prototype, withdrawal is synchronous: shared status changes in the same transaction, and feed, search, counts, themes and AIRA all query live.
  - The proposed production SLA is ≤ 60 seconds for any search index or cache.
  - Content that people have already viewed, exported or quoted elsewhere cannot be recalled.
- **Consents.** These are four separate, append-only permissions: store/process, publish a shared copy, organisation attribution, and future training. No training programme exists, and nothing claims withdrawal can "untrain" a model.
- **Retention (proposed).**
  - Private sources are kept while the membership is active plus 90 days.
  - Approved versions, moderation decisions, consent history and audit events are kept for 7 years.
  - Withdrawn shared copies stay out of every read path and are retained only for audit.
- **Notifications.** In-app notifications are the P0 channel. Email is queued in `Outbox` with idempotency keys.
  - Invitation emails are handed to the local SMTP server. `SENT` means handed off, not delivered.
- **Threat model.** These controls are in place:
  - IDOR is blocked by policy checks on every read and write, with denials returned as 404.
  - Tenant spoofing is blocked: the workspace cookie is re-validated against memberships, and tenant IDs are never accepted from forms.
  - Privilege escalation is blocked: client admins can assign client roles only, and grants are separate and audited.
  - Re-identification risk is reduced by moderator redaction, coarsening, opt-in attribution and k ≥ 3 suppression, including suppressing whole breakdowns to prevent differencing.
  - Prompt and data leakage is limited because only reviewed shared text reaches the LLM.
- **Known gaps.**
  - The sensitive-content scan is heuristic, and a minimum cohort size is not a formal privacy guarantee.
  - The production propagation SLA and suppression policy need approval.
  - Entra ID / OIDC would replace email links in production.
