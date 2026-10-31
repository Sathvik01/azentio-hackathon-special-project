# Reference prototype inventory

Source: https://azentio-ai-ipad.ssaha999.chatgpt.site/. Scraped and viewed on 2026-10-30.

The brief says to "reuse its visual direction, routes and existing content where useful". Its public Admin, Playground and Live access is "a demonstration convenience, not the security model".

## Routes

| Prototype route | Purpose | Our equivalent | Status |
|---|---|---|---|
| `/` | Home | `/` | ✅ Restyled. Copy partly differs. |
| `/products`, `/products/[slug]` | Catalogue of 8 products in 3 groups | `/offerings`, `/offerings/[slug]` | ⚠️ Different route name and different product list. |
| `/solutions` | Solutions | — | ❌ Missing. |
| `/lab` | AI Lab (innovation) | — (experiments are employee-only in the portal) | ❌ No public page. |
| `/technology` | Technology | — | ❌ Missing. |
| `/media` | Media & videos | `/insights` (videos are mixed in) | ⚠️ Merged into insights. |
| `/insights` | Perspectives | `/insights` | ✅ |
| `/about` | About | `/about` | ✅ |
| `/connect` | Request demo / collaborate / contact | `/demo` | ⚠️ Different route name. |
| `/hackathon/register` | Hackathon interest | `/hackathon` | ⚠️ Different route name. |
| `/configurator` | **Public** admin: stream settings, past recordings, homepage | `/portal/publish` (needs `PUBLISH_CONTENT`) | ✅ Now server-protected. Live-stream embed URL settings are missing. |
| `/playground` | **Public** "Employee Playground": choose a product, describe a scenario, preview the workflow | `/portal/employee/playground`, `/portal/client/sandbox` | ✅ Now server-protected and entitlement-scoped. |
| `/live` | **Public** live zone (off-air state) and past recordings | `/portal/employee/live` | ✅ Now employee-only. No embed player or off-air state yet. |
| AIRA floating button | Assistant on every page | `/aira`, `/portal/aira` | ⚠️ We have a page, not a floating launcher. |

## Products (prototype content)

- **Credit Intelligence:**
  - Credit Strategy Simulator: simulate credit policy changes before deployment.
  - SME Credit Decisioning Workbench: financial analysis, policy evaluation, risk review and recommendations, with evidence and human oversight.
  - Similar Portfolio Intelligence: compare applications with historical portfolio segments.
  - Rejection Intelligence: analyse declined applications and simulate changes.
- **Reporting & Analytics:**
  - RIVA (Reporting Intelligence, Validation & Analytics): a configurable reporting environment.
  - Financial Analysis Intelligence: turns statements into ratios, trends and credit insights.
- **AI Applications:**
  - Document Intelligence: extract, classify, structure and validate.
  - Persona Newsroom: match market news to executive personas and draft thought leadership.

Our seed has 5 invented offerings. Only *Financial Analysis Intelligence* and *Document Intelligence* match.

## Homepage copy (prototype)

- Hero: "Build Intelligence. Create Impact." with the sub-lines "From ideas to intelligent products. From complexity to clarity…"
- Hackathon banner: "Your next idea. Our next breakthrough."
- Who we are: "Intelligence, Engineered for the Real World."
- What we do: "Intelligence in Every Layer." There are 6 capabilities, each with 4 sub-points. For example, Intelligent Decisioning covers evaluating applications against configurable policies, analysing risk, simulating policy changes, and making evidence-backed recommendations.
- Featured products: "Built to Work. Designed to Evolve."
- Showcase: "Don't Just Imagine What AI Can Do. See It."
- Trust by design: "Innovation Without Compromising Trust." with 01 Identity & SSO, 02 Role-Based Access, 03 Auditability, 04 Data Protection, 05 Human Oversight, 06 Secure Deployment.
- Ideas in motion: AI Lab, azentio.ai Live, Perspectives.
- Footer disclaimer: "Product information is indicative and subject to validation."

## Visual direction (observed)

- **Worth reusing:**
  - deep navy hero `#102031` with green `#69D393`;
  - large two-line headline with the second line in green;
  - mono-ish green eyebrow labels;
  - dark product illustrations showing charts and workflow UIs;
  - white and light-gray alternating sections.
- **Not reusing,** because the user's design rules ban them:
  - the glowing geometric orb in the hero;
  - rounded white cards with soft borders in 3-up grids;
  - the centred card carousel.
