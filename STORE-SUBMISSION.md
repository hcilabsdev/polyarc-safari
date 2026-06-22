# PolyArc.AI — App Store submission guide (HCI Labs LLC)

How to publish the Safari extension (macOS + iOS) **anonymously under the HCI Labs LLC
brand**. Public seller name = HCI Labs LLC; no individual's name is shown to users.

> Anonymity scope: this hides you from the **public**, not from Apple. Apple KYCs the
> account holder privately. Everything below keeps your personal identity off every
> public-facing surface.

---

## 0. Pre-flight: identity hygiene (do these first)

- [ ] **D-U-N-S number** for HCI Labs LLC — request/look up at
      <https://developer.apple.com/enroll> → "Look up your D-U-N-S number". **5–14 days; start now.**
- [ ] **Apple Developer Program — enroll as Organization** (NOT Individual). Individual
      enrollment publishes under your *personal legal name*. Organization publishes under
      **HCI Labs LLC**. $99/yr, paid from the LLC.
- [ ] Use a **role Apple ID** for the account: `admin@hcilabs.com` (you already run mail
      on that domain). Never the personal Gmail.
- [ ] **WHOIS privacy/redaction** on `hcilabs.com` and `polyarc.ai` so the registrant
      isn't your name.
- [ ] Confirm the App Store Connect **"Seller" / legal entity** displays **HCI Labs LLC**.

---

## 1. App Store Connect metadata (all on-brand, zero personal data)

| Field | Value |
|---|---|
| **App name** | PolyArc.AI |
| **Subtitle** | Know before you bet |
| **Category (primary)** | Utilities (secondary: Finance) — see §4 risk note before choosing Finance |
| **Bundle ID** | `ai.polyarc.safari` |
| **Support URL** | https://polyarc.ai/support (or hcilabs.com/support) |
| **Marketing URL** | https://polyarc.ai |
| **Privacy Policy URL** | https://polyarc.ai/privacy |
| **Copyright** | © HCI Labs LLC |
| **Support email** | support@hcilabs.com (role, not personal) |

**Description (draft):**
> PolyArc.AI overlays honest, free decision-support on Polymarket market pages. It flags
> structural traps (SafeBet) and shows fee-adjusted base rates (PolyTruth) so you can see
> the facts before you act.
>
> Facts, not advice. No tips. No "safe bet" promises. PolyArc.AI never tells you what or
> how much to bet — it observes and informs, and it is honest regardless of any position
> anyone holds. Independent; not affiliated with or endorsed by Polymarket.
>
> Privacy: PolyArc.AI logs only anonymized usage (which markets are viewed, when, and the
> price at view) under a random per-install id. No identity, no wallet, no bets, never sold.

**Keywords (draft):** polymarket, prediction market, base rate, odds, decision, fees,
expected value, research, honest, overlay

**Promotional text (draft):** Facts before you bet — trap flags and fee-adjusted base
rates, free and honest.

---

## 2. Privacy "nutrition label" — mapped to the ACTUAL payload

The only data that leaves the browser is in `content.js` → `logEvent`:
`{ event, market(slug), yes_price, session_id (random per-install UUID), ts }`, POSTed to
`https://polyarc.ai/event`. Nothing else. No identity, wallet, or bet data.

Answer App Privacy as:

- **Data used to track you:** **None.** (No cross-app/website tracking, no third-party
  ad/analytics SDKs, no data shared with data brokers.)
- **Data linked to you:** **None.** (`session_id` is random and not tied to identity,
  account, name, email, or device identifier.)
- **Data NOT linked to you:**
  - **Usage Data → Product Interaction** — the `view`/`install` events, market slug, and
    `yes_price`. Purpose: **Analytics** (and Product Personalization? No — leave Analytics only).
  - **Identifiers → User ID** — the random per-install `session_id`. Purpose: **Analytics**
    (measuring retention / aggregate flow). Declare it because Apple counts any app-generated
    persistent identifier here, even anonymous ones.

Everything is collected, **not** linked to identity, **not** used for tracking. That is the
honest and accurate mapping — keep it that way.

> **Do NOT declare email / Contact Info.** The website privacy policy mentions a Premium
> *waitlist email*, but the **shipped Safari extension collects no email** (no waitlist UI in
> `content.js`/`popup`). Apple's label must reflect the **binary**, not the website — declaring
> email would be a mismatch. Only Usage Data + the random User ID apply.

**Privacy Policy & Terms — already LIVE** (required before submission):
- https://polyarc.ai/privacy/ — accurate to the code, HCI Labs LLC, updated 2026-06-16 ✅
- https://polyarc.ai/terms/ — HCI Labs LLC (Georgia), governs the extension ✅

---

## 3. Build, sign (LLC org), and submit

Signing must use the **HCI Labs LLC Organization team**, set **locally and never committed**
(the public repo intentionally carries no DEVELOPMENT_TEAM):

```bash
# replace ORGTEAMID with the LLC Organization Team ID from Apple Developer > Membership
./build.sh macos DEVELOPMENT_TEAM=ORGTEAMID CODE_SIGN_STYLE=Automatic
# then archive + upload via Xcode: Product > Archive > Distribute App > App Store Connect
```

Or in Xcode: open `PolyArc-Xcode/PolyArc.AI/PolyArc.AI.xcodeproj`, set the **Team** to
**HCI Labs LLC** on all four targets (app + extension, macOS + iOS), then
**Product → Archive → Distribute App**.

- macOS and iOS are **separate App Store records** but share this one extension codebase.
- Screenshots required: macOS (the card on a market page) and iPhone/iPad (same).
- First submission of each platform goes through **App Review**.

---

## 4. ⚠️ App Review risk — read before submitting

PolyArc.AI overlays **Polymarket, a real-money prediction market**. Apple App Review is
strict about gambling-adjacent apps, even ones that don't take bets:

- **Likely 17+ age rating**; expect questions under "Gambling and Contests."
- Reviewers may treat proximity to real-money betting as needing a **gambling license** or
  **geo-restriction**, even though this extension only *informs* and places no wagers.
- **Lead with harm-reduction in the review notes:** "Informational only. Reads public market
  data and displays base rates and risk flags. Places no bets, holds no funds, gives no
  tips, and is not affiliated with Polymarket. Comparable to a read-only research overlay."
- Have the **Privacy Policy** and **Terms** live at the URLs above before submitting.
- Be ready for rejection and a back-and-forth; this is the single biggest unknown.

> This section is a risk flag, not legal advice. If real-money-markets policy/licensing is
> in play, get it reviewed by counsel.

---

## 5. Final anonymity checklist (before hitting Submit)

- [ ] Apple Developer account = **Organization (HCI Labs LLC)**, not Individual
- [ ] Account/role Apple ID = `admin@hcilabs.com`, not personal
- [ ] App Store seller name shows **HCI Labs LLC** publicly
- [ ] All URLs/emails in the listing are role/brand (`hcilabs.com` / `polyarc.ai`)
- [ ] Build signed by the **LLC org team** (never the personal "Apple Development: <name>" cert)
- [ ] `hcilabs.com` + `polyarc.ai` WHOIS privacy on
- [ ] Public repo history shows only **HCI Labs LLC** (done ✓)
