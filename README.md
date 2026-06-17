# Mimshak Pak Investments Ltd. — Website

A multi-page, SEO-optimised static website for **Mimshak Pak Investments Ltd.**, a carton printing and nylon packaging manufacturer in **Asaba, Delta State, Nigeria** (with subsidiary **Mimshak Integrated Packages** for nylon print packaging).

Built as plain HTML + CSS + vanilla JS — no build step, no dependencies. It runs by opening the files or hosting the folder on any static host.

## How to preview locally
From this folder:
```
python -m http.server 5577
```
Then open http://localhost:5577

(Open via a server, not by double-clicking the file, so the shared header/footer JS and relative paths resolve correctly.)

## ⚠️ Placeholders to update before going live
All contact details are placeholders. **Edit them in ONE place** and they update across every page:

`assets/js/main.js` → the `CONTACT` object at the top:
- `phoneDisplay` / `phoneTel` — phone number
- `whatsappNumber` — WhatsApp number (international format, no `+`, e.g. `2348012345678`)
- `email`, `address`, `hours`

Also update (these are hard-coded for SEO/no-JS reliability — search & replace):
- `tel:+2348000000000` and `wa.me/2348000000000` in the page HTML (hero/CTA buttons, contact page)
- `https://www.mimshakpak.com/` domain in canonical tags, Open Graph URLs, `sitemap.xml`, `robots.txt`
- **Google Map embed** — placeholder on `contact.html` (replace the `.map-embed` block with an embed iframe)
- **Google Analytics / Search Console** — add your tags in each page `<head>` when ready
- **Quote & contact forms** — currently front-end only (show a success message). Connect to an email service, Formspree, or backend to actually receive submissions.

## Pages
| URL | Purpose |
|-----|---------|
| `index.html` | Home |
| `about-us.html` | About + Mission/Vision/Values |
| `services.html` | Services hub |
| `services-carton-printing-asaba.html` | Service: Carton Printing (local SEO) |
| `services-custom-carton-packaging.html` | Service: Custom Cartons |
| `services-nylon-print-packaging.html` | Service: Nylon (Mimshak Integrated Packages) + video |
| `services-industrial-packaging.html` | Service: Industrial Packaging |
| `services-branded-product-packaging.html` | Service: Branded Packaging |
| `industries.html` | Industries served |
| `products.html` | Products & solutions |
| `gallery.html` | Photo gallery (lightbox) + 2 videos |
| `request-a-quote.html` | Full quote form + How It Works |
| `contact.html` | Contact details + form + map placeholder |
| `blog.html` | Blog index (10 live, interlinked posts) |
| `blog-*.html` | 10 full SEO articles |
| `sitemap.xml`, `robots.txt` | Technical SEO |

## Media
- **Images:** curated, renamed copies of the supplied photos live in `assets/img/` with SEO alt text. The original source photos stay on your machine and are git-ignored.
- **Videos:** all site videos live in `assets/video/` as small, web-optimized MP4s — the two factory tour clips (`factory-printing.mp4`, `factory-nylon.mp4`), six service-card loops (`card-*.mp4`) and five process-step loops (`step-*.mp4`). The large raw source clips at the project root are git-ignored (not pushed). Card and step videos auto-play only while scrolled into view.

## Deploy
This is a static site — host the repo with any static host. **GitHub Pages:** repo Settings → Pages → deploy from `main` / root. Then update the `https://www.mimshakpak.com/` URLs in the canonical/OG tags, `sitemap.xml` and `robots.txt` to your live domain.

## SEO included
Unique titles/descriptions per page, H1/H2/H3 structure, canonical tags, Open Graph tags, descriptive alt text, internal linking, breadcrumbs, sitemap, robots, and JSON-LD schema (LocalBusiness, Organization, Service, Product/ItemList, FAQPage, ContactPage, BlogPosting).

## Conversion features
Sticky WhatsApp + call buttons (desktop floaters / mobile bottom bar), header "Request a Quote", CTA band on every page, trust badges, FAQ accordions, "How It Works", and quote/contact forms.

## Recommended next step: image optimisation
The photos are full-size JPEGs. Before launch, compress them (and ideally convert to WebP) to improve load speed — e.g. with Squoosh, ImageMagick, or `cwebp`. Keep the same filenames (or update references) so nothing breaks.
