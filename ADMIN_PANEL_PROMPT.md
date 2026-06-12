# Build Prompt: Nucleus Website Admin Panel (v2)

Copy everything below this line and give it to the AI/developer who will build the admin panel.

---

## What you are building

A complete admin panel (`admin.html`) for the Nucleus Consulting static website, plus the small serverless backend it needs. The admin must let the owner edit **every piece of content on every page** — all text, all images, all media, all lists — organized **page-wise**, and manage **all socials and site connections** from a Settings section.

## Context: the site as it exists today

- Static site: vanilla HTML/CSS/JS, no framework, no build step.
- Hosted on **Vercel**, repo `arpit4645/NucleusWebsite`, production branch `main`.
- 10 public pages: `index.html`, `about.html`, `services.html`, `programs.html`, `case-studies.html`, `blog.html`, `careers.html`, `contact.html`, `thank-you.html`, `404.html`.
- `assets/site.js` already renders dynamic lists (services, programs, case studies, testimonials, careers benefits, blog posts) **from `localStorage` keys, with hardcoded defaults** when a key is absent. Public pages also carry `data-set="…"`/`data-live="…"` attributes on editable text elements, keyed to the same store.
- `api/save-lead.js` already exists: a Vercel serverless function that commits contact-form leads to `content/leads.json` using a `GITHUB_TOKEN` **environment variable**. Use this same pattern for all admin writes.
- A previous admin panel was removed. Its fatal flaws — **do not repeat them**:
  1. It put a GitHub Personal Access Token in the browser (localStorage + cookie). Users constantly hit token-permission errors, CORS workarounds, and once pasted the token into a chat. **The new admin must never handle a GitHub token client-side.**
  2. The admin password had a hardcoded client-side fallback (`nucleusadmin`). **The new admin must verify the password server-side only.**
  3. Sync status was confusing (showed "Connected" then failed on write). **The new admin must test the full write path on login and report publish status truthfully.**

## Architecture (required — do not deviate)

```
Admin browser ──(password)──▶ POST /api/admin/login ──▶ checks ADMIN_PASSWORD env var
                                                        sets HMAC-signed httpOnly session cookie

Admin browser ──(edits)─────▶ POST /api/admin/save   ──▶ verifies session cookie
                                                        commits content/site-data.json to GitHub
                                                        using GITHUB_TOKEN env var (server-side)

Admin browser ──(image)─────▶ POST /api/admin/upload ──▶ verifies session, commits file to
                                                        content/media/ in the repo

Public visitor ─▶ assets/live.js fetches same-origin /content/site-data.json (cache-busted)
                  seeds keys into localStorage → existing site.js + data-set attributes render it.
                  Vercel auto-redeploys on each content commit (~1–2 min to live).
```

- **Serverless functions** (Vercel, in `/api/admin/`): `login.js`, `logout.js`, `save.js` (write site-data.json), `upload.js` (write media), `leads.js` (read content/leads.json, authenticated).
- **Env vars** (set in Vercel dashboard): `ADMIN_PASSWORD`, `GITHUB_TOKEN` (fine-grained PAT, Contents: Read+Write, this repo only), `SESSION_SECRET` (random string for signing cookies). `GITHUB_REPO` and `GITHUB_BRANCH` optional with defaults `arpit4645/NucleusWebsite` / `main`.
- **Session**: on successful login return an httpOnly, Secure, SameSite=Strict cookie containing an HMAC-signed payload with expiry (e.g. 24 h). Every `/api/admin/*` endpoint (except login) verifies it. No JWT library needed — `crypto.createHmac` is enough.
- **Content store**: single `content/site-data.json` in the repo — a flat key→value map using the **exact localStorage keys listed below** (keep compatibility with `site.js`). Media files go to `content/media/`.
- **Public hydrator** `assets/live.js` (~60 lines, add to all 10 pages before `</body>`): fetch `/content/site-data.json?t=<now>`, seed every key into localStorage, apply `data-set`/`data-live` text and media keys to the DOM, fire one event `nucleus-content-ready`. If content changed since the visitor's cached copy, allow one silent reload (guard against loops with a sessionStorage flag). Never overwrite the admin password key (there isn't one client-side anymore — nothing secret may ever be written to site-data.json).
- **vercel.json**: re-add `Cache-Control: no-store` for `/content/(.*)`; protect `/admin.html` is NOT needed beyond the login screen (page is public, data behind API auth), but keep `/api/admin/*` CORS locked to same origin.
- **Recommended**: make the GitHub repo **private** — nothing in this architecture requires public raw access anymore, and it stops `content/leads.json` (customer PII) from being world-readable.
- **Media uploads**: compress client-side to WebP via canvas, max ~1.5 MB after compression (Vercel body limit is 4.5 MB). Videos are NOT uploaded — accept YouTube/Vimeo URLs only and embed them.

## Admin panel layout (required)

Single page `admin.html`. Left sidebar with three groups:

```
NUCLEUS ADMIN
├── 📊 Dashboard          (publish status, last published time, recent leads count, quick links)
│
├── PAGES                 (one entry per page — the core requirement)
│   ├── Homepage
│   ├── About
│   ├── Services
│   ├── Programs
│   ├── Case Studies
│   ├── Blog
│   ├── Careers
│   ├── Contact
│   └── Thank You & 404
│
├── 📥 Leads              (table of content/leads.json: date, name, email, phone, message…)
│
└── ⚙ SETTINGS
    ├── Site Identity     (logo, favicon, nav CTA label/link)
    ├── Socials & Connections   ★ user explicitly required this — do not omit
    ├── Footer
    └── Admin & Security
```

Each PAGE editor shows **section cards in the same order as the live page**. Every card has its fields, an image/media slot where the page has one (current image preview + Replace button), and its own **Save** button that publishes immediately. Top bar shows: page title, "Open live page ↗" link, publish status pill (`Saved ✓ · live in ~2 min` / `Saving…` / `Error — retry`), and Logout.

List content (services, programs, case studies, posts, testimonials, benefits, timeline) uses a **list editor**: rows with drag-to-reorder, Edit (inline expand), Delete (with confirm), and Add New.

## Page-by-page editable content (exact field inventory)

Use these exact storage keys (site.js and the page markup already read them).

### 1. Homepage (`index.html`)
| Section | Fields | Keys |
|---|---|---|
| Hero | 3 heading lines, subtitle | `nucleus_hp_hero_line1/2/3`, `nucleus_hp_hero_sub` |
| Hero | background image (or YouTube/Vimeo URL) | `img_hero_bg`, `img_hero_bg_type` |
| Hero CTAs | 2 button labels + links | `hp_cta1_label`, `hp_cta2_label` (+ link keys) |
| Stats band | 4 numbers + labels (years, lives, businesses, retention) | `stats_years`, `stats_lives`, `stats_biz`, `stats_retention` |
| Pain section | title "If This Feels Familiar…", bullet list | `hp_pain_title`, `hp_pain_bullets` |
| Philosophy | heading + body ("We Don't Fix Businesses…") | `hp_philosophy` |
| Journey | "The Nucleus Transformation Journey" steps list | `nucleus_services_steps` (shared) |
| Section images | philosophy zen image, culture image, strategy image | `img_*` keys per slot |
| Testimonial | quote, name, role (homepage single) + testimonials list | `nucleus_testimonials` |
| Final CTA | heading, 2 button labels | `hp_final_heading`, `hp_final_btn1/2` |

### 2. About (`about.html`)
| Section | Fields | Keys |
|---|---|---|
| Hero | eyebrow, title, subtitle | `about_hero_eyebrow/title/subtitle` |
| Who We Are | eyebrow, title, 2 paragraphs, image | `about_who_eyebrow/title/body_1/body_2`, `nucleus_about_who_img` |
| Vision | title, text, media (image or video URL) | `about_vision_title/text`, `nucleus_vision_video` |
| Mission | title, text, image | `about_mission_title/text`, `nucleus_about_mission_img` |
| Values | 3 × (title + description) | `val_1/2/3_title`, `val_1/2/3_desc` |
| Founder | name, role, photo, 2 bio paragraphs, signoff | `founder_name/role/bio_1/bio_2/signoff`, `nucleus_founder_photo` |
| Timeline | 4 × (year, title, description) — make it a list editor | `time_1..4_yr/title/desc` |
| Testimonial | quote, author, role | `about_testimonial`, `about_test_author/role` |

### 3. Services (`services.html`)
- Hero: title, subtitle — `svc_hero_title`, `svc_hero_sub`
- **Services list** (CRUD): name, description, icon — `nucleus_services`
- 3-Step Process (CRUD): step title + description — `nucleus_services_steps`
- Pricing note text — `nucleus_services_pricing`

### 4. Programs (`programs.html`)
- Hero: eyebrow, title, subtitle — `nucleus_programs_hero_eyebrow/title/sub`
- **Programs list** (CRUD): name, description, duration, price, image — `nucleus_programs`
- Upcoming Schedule section text; Corporate note text

### 5. Case Studies (`case-studies.html`)
- Hero image
- **Case studies list** (CRUD): title, client, industry, challenge, approach, results/metrics, image — `nucleus_casestudies`
- Bottom CTA heading/button

### 6. Blog (`blog.html`)
- **Posts** (CRUD): title, excerpt, body (textarea with basic formatting), cover image, date, **featured flag** (featured post replaces the static featured slot) — `nucleus_blog_posts`

### 7. Careers (`careers.html`)
- Hero: eyebrow, title, emphasized word, description — `nucleus_careers_eyebrow/hero_title/hero_em/desc`
- Section title — `nucleus_careers_section_title`
- **Benefits list** (CRUD) — `nucleus_careers_benefits`
- Growth section image

### 8. Contact (`contact.html`)
- Intro heading/text, address, email, phone, WhatsApp number (drives the `wa.me/…` links) — `address`, `email`, `phone` (these three also render in every page's footer)
- Note: form fields themselves stay fixed; leads flow to the Leads section.

### 9. Thank You & 404
- Thank-you: heading ("Your Application is Received."), message, WhatsApp follow-up link
- 404: heading, message

## Settings section (★ explicitly required)

**Socials & Connections** — one screen managing every external connection the site has:
- Social profile URLs: Instagram, LinkedIn, Twitter/X, YouTube, Facebook (keys `social_instagram`, `social_linkedin`, `social_twitter`, …). Empty value = hide that icon/link on the site. Footer/social icons on all pages must render from these keys.
- Contact connections: public email, phone, WhatsApp number, office address (`email`, `phone`, `address`, WhatsApp key) — single source of truth; every `mailto:`, `tel:`, `wa.me` link and footer line on all 10 pages reads them.
- Site URL / map embed link if present.

**Site Identity**: logo upload, favicon upload, nav CTA button label + link (`nav_cta_label`), site title/meta description.

**Footer**: tagline ("Transforming inner light into outer impact."), description paragraph, copyright line (`footer_tagline`, …).

**Admin & Security**: shows login session info, a "log out everywhere" note, and honest instructions that the password is the `ADMIN_PASSWORD` env var changed in the Vercel dashboard (an app can't change env vars at runtime — say so, don't fake it). Shows backend health: last successful publish, GitHub write test result.

## UX requirements

- Clean, modern, calm design consistent with the site (ink green `#0D2B0D`, gold `#E8B547`, off-white). Login screen: centered card, password only.
- On login success, run a **real write test** (save site-data.json back to itself via the API) and show the result — never display "Connected" unless a write succeeded.
- Per-section Save publishes that section immediately; unsaved-changes warning when navigating away; toast notifications for every save/error; errors must say what to actually do.
- Image fields: thumbnail preview of the current image, Replace (file picker → client-side WebP compression → upload → preview updates), and Remove (revert to default).
- Mobile-responsive (sidebar collapses to a drawer).
- No external JS frameworks; vanilla JS like the rest of the site. No external CSS frameworks.

## Acceptance checklist (verify before calling it done)

1. Login with wrong password fails server-side; no password or token appears anywhere in client code, the repo, or site-data.json.
2. Edit homepage hero text → Save → commit appears in repo → after Vercel redeploy, an incognito visitor sees the new text. Same test for an image upload and for a list item (add a service, delete it).
3. Settings → change Instagram URL + phone number → footer links update on all 10 pages.
4. Blog: create a post, mark featured, verify it renders on blog.html; delete it, verify the static featured returns.
5. Leads section lists entries from content/leads.json; the contact form still works end-to-end.
6. With JavaScript disabled or site-data.json missing, public pages still render the built-in defaults (no blank sections).
7. `node --check` passes on every JS file; no console errors on any public page or in the admin.
