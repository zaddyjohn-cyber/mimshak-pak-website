# Mimshak Pak Investments Ltd. — website

Marketing site for a carton printing and nylon print packaging manufacturer in
Asaba, Delta State, Nigeria. Static HTML, no build step, served from GitHub Pages
at **https://www.mimshakpak.com**.

---

## Running it locally

There is nothing to install or compile. Serve the folder over HTTP (opening the
files with `file://` breaks the service worker and some fetches):

```bash
python -m http.server 4321
```

Then open `http://localhost:4321`. The repo ships a `.claude/launch.json` so the
editor's preview can start the same server by name.

## Why static, not a framework

The site is 27 pages of mostly static marketing copy with no backend, deployed on
GitHub Pages under a custom domain, and every page already ranks under its own
`.html` URL. A React/Vite SPA would add a build pipeline and force either hash
URLs or a `404.html` redirect shim, both of which cost SEO and complicate deploys,
and would buy nothing the pages actually need. Shared chrome (header, nav, footer,
contact details) is injected by `assets/js/main.js` instead, so there is still a
single place to change it.

## Layout

```
index.html                     home
about-us.html                  about
services.html                  solutions index
services-*.html                5 service detail pages
industries.html                industries
products.html                  product catalogue
gallery.html                   filterable work gallery
contact.html                   contact + enquiry form
request-a-quote.html           B2B quote form
request-a-sample.html          sample request
packaging-cost-calculator.html indicative cost calculator
track-order.html               order status lookup
blog.html + blog-*.html        insights index and 10 articles
admin.html                     login-gated owner panel (see below)

assets/css/styles.css          design system, every page
assets/css/calculator.css      calculator-only styles
assets/js/main.js              header/nav/footer injection, contact details, UI
assets/js/reviews.js           customer reviews data
assets/img/                    photography (44 frames)
assets/video/                  production footage and card loops
sw.js                          offline service worker
```

## Editing contact details

`CONTACT` at the top of [assets/js/main.js](assets/js/main.js) is the single
source of truth for phone numbers, email, address, hours and the WhatsApp
message. Change it once and it updates the top bar, footer, floating buttons,
WhatsApp links and structured data on every page.

`CREDENTIALS` directly below it holds registration numbers. Each value left as
`""` hides its badge, so only fill in numbers the company genuinely holds.

The owner can also edit `CONTACT` from `admin.html` without touching code — see
the Settings tab there, which walks through creating a GitHub fine-grained token
with Contents read/write on this repo only.

## Design system

Colour comes from the company logo, sampled from `assets/img/logo.jpeg`:

| Token | Value | Role |
|---|---|---|
| `--brass` | `#EE7219` | logo orange — primary actions, accents |
| `--brass-dk` | `#C85A0D` | hover state |
| `--brown` | `#8B5E30` | logo brown — secondary |
| `--navy` | `#2B1D12` | dark section bands |
| `--ink` / `--slate` | `#1F1611` / `#5E5147` | headings / body |
| `--porcelain` / `--cream` | `#FBF7F3` / `#FDF1E6` | page and card surfaces |

Type is **Manrope** for display and **Inter** for body, both from Google Fonts.
All tokens live at the top of `assets/css/styles.css`; the older `--accent`,
`--orange`, `--navy` names are kept as aliases so inline styles on legacy pages
keep working.

**Photography rule:** every image and video is a surface element. Nothing is a
CSS background or a washed-out layer behind text. Page heroes are solid brand
bands with the photo in its own `.pagehero-shot` panel beside the copy.

## Images

`assets/img/` holds the client's enhanced photography. Filenames are stable, so
re-exporting a photo under the same name updates every page that uses it.

Frames from the original shoot carried a burned-in `04 June 2026` camera
timestamp; those were cropped at the stamp line rather than retouched, so no
image content is fabricated. Everything is capped at 1500px on the long edge and
re-encoded at quality 80 progressive, which keeps the page weight reasonable on
Nigerian mobile networks. If you replace a photo, do the same — a straight
phone export is several megabytes.

## Forms

**There is no mail server attached to this site.** The forms therefore compose
the message in the visitor's own email client and say so plainly; they never
report a send that did not happen. A honeypot field named `website` silently
drops bots.

To post submissions to a real endpoint instead, set one constant in
[assets/js/main.js](assets/js/main.js):

```js
var FORM_ENDPOINT = "https://formspree.io/f/xxxxxxxx";
```

With that set, `submitToEndpoint()` POSTs the `FormData` and only reveals the
success panel on a 2xx response, showing a retry message otherwise. Nothing else
needs to change. Any service that accepts a multipart POST and returns JSON works
(Formspree, Getform, Basin, a Cloudflare Worker). Add server-side rate limiting
there — it cannot be enforced in the browser.

## Service worker and deploys

`sw.js` serves pages network-first and static assets **cache-first**. That second
part matters: **bump `VERSION` in `sw.js` on every deploy that changes CSS, JS,
markup or images.** `activate()` deletes every cache whose key no longer matches,
and that purge is the only thing that moves returning visitors onto the new
build. Skip it and they keep the previous stylesheet and photos indefinitely.

The `?v=` query on the `styles.css` and `main.js` tags is bumped alongside it for
the browser's own HTTP cache.

## Deploying

The site deploys straight from `main` via GitHub Pages — push and it is live in
about a minute.

```bash
git add -A && git commit -m "..." && git push
```

Pushes must be made as the repo owner (`zaddyjohn-cyber`). If a push returns 403,
the wrong GitHub account is cached in Windows Credential Manager:

```bash
cmdkey /delete:LegacyGeneric:target=git:https://github.com
gh auth switch --user zaddyjohn-cyber
gh auth setup-git
```

### DNS

`CNAME` pins the custom domain to `www.mimshakpak.com`. The registrar needs:

| Record | Host | Value |
|---|---|---|
| CNAME | `www` | `zaddyjohn-cyber.github.io` |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

## SEO

Every page carries a unique `<title>`, meta description, canonical URL and
OpenGraph/Twitter tags. Structured data: `LocalBusiness` and `FAQPage` on the
home page, `Organization` on about, `Service` on each service page, and
`BreadcrumbList` throughout. Review markup in `main.js` is emitted **only** when
`assets/js/reviews.js` actually contains reviews, so the site never publishes an
aggregate rating it does not have.

No URL changed in the redesign, so no redirects are needed and existing ranking
is preserved. `sitemap.xml` and `robots.txt` are in the repo root; add any new
page to the sitemap.

## Content rules

The site states only what can be verified about the business. Do **not** add
figures for years in business, client counts, units produced, staff numbers,
capacity, lead times, certifications or sustainability credentials unless the
company genuinely holds them and can evidence them. Customer testimonials belong
in `assets/js/reviews.js` and must be real; the section hides itself when the
file is empty.

## Not configured

- **Form delivery.** No backend. See *Forms* above.
- **Artwork upload** on the quote form. Needs a storage endpoint first.
- **Registration and certification numbers.** `CREDENTIALS` in `main.js` is
  empty, so those badges are hidden.
- **Customer reviews.** `reviews.js` is empty, so the reviews section and its
  rating schema do not render.
- **Analytics.** None installed.

## Browser support

Modern evergreen browsers. Tested at 320, 390, 768, 1024 and 1440px. Layout uses
CSS Grid with `clamp()` type; `prefers-reduced-motion` disables reveals and
smooth scrolling.
