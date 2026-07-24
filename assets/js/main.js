/* =================================================================
   Mimshak Pak Investments Ltd. — site script
   Injects icon sprite / header / mobile nav / footer / floating actions,
   and drives the hero slider, lightbox, card videos, reveals and forms.
   Update CONTACT once to change details site-wide.
   ================================================================= */
(function () {
  "use strict";

  // ---- Single source of truth for contact details ----
  var CONTACT = {
    name: "Mimshak Pak Investments Ltd.",
    phoneDisplay: "0803 707 9976",
    phoneTel: "+2348037079976",
    phone2Display: "0810 306 4976",
    phone2Tel: "+2348103064976",
    whatsappNumber: "2348037079976", // international format, no +
    email: "info@mimshakpak.com",
    address: "No 3 Austin Ugbo Onyeje Avenue, Orjimiyana, Asaba, Delta State",
    hours: "Mon – Sat: 8:00am – 6:00pm",
    waMessage: "Hello Mimshak Pak, I would like to request a packaging quote."
  };
  var WA_LINK = "https://wa.me/" + CONTACT.whatsappNumber + "?text=" + encodeURIComponent(CONTACT.waMessage);
  window.MPI_CONTACT = CONTACT;

  // ---- Line-icon sprite (replaces emoji icons site-wide) ----
  var SPRITE = [
    '<symbol id="i-box" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></symbol>',
    '<symbol id="i-factory" viewBox="0 0 24 24"><path d="M3 21h18V10l-6 4V10l-6 4V4H3z"/><path d="M7 21v-4M12 21v-4M17 21v-4"/></symbol>',
    '<symbol id="i-bag" viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></symbol>',
    '<symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.6H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9.4A1.6 1.6 0 0 0 10.4 3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z"/></symbol>',
    '<symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/></symbol>',
    '<symbol id="i-bread" viewBox="0 0 24 24"><path d="M4 11c0-3.3 3.6-5 8-5s8 1.7 8 5c0 1.4-1.2 2-2 2v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5c-.8 0-2-.6-2-2z"/><path d="M9 9.5c.8-.6 1.7-.9 3-.9s2.2.3 3 .9"/></symbol>',
    '<symbol id="i-cart" viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/></symbol>',
    '<symbol id="i-pill" viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="4"/><path d="M12 8v8"/></symbol>',
    '<symbol id="i-cosmetics" viewBox="0 0 24 24"><rect x="8" y="9" width="8" height="12" rx="2"/><path d="M10 9V6a2 2 0 0 1 4 0v3M9 13h6"/></symbol>',
    '<symbol id="i-grain" viewBox="0 0 24 24"><path d="M12 21V9"/><path d="M12 9c0-3 2-6 5-7 0 4-2 6.5-5 7zM12 9C12 6 10 3 7 2c0 4 2 6.5 5 7zM12 15c0-2.5 2-4.5 5-5 0 3-2 4.7-5 5zM12 15c0-2.5-2-4.5-5-5 0 3 2 4.7 5 5z"/></symbol>',
    '<symbol id="i-store" viewBox="0 0 24 24"><path d="M3 9h18l-1-5H4z"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></symbol>',
    '<symbol id="i-truck" viewBox="0 0 24 24"><path d="M2 6h11v11H2z"/><path d="M13 9h4l4 4v4h-8z"/><circle cx="6.5" cy="18.5" r="1.6"/><circle cx="17.5" cy="18.5" r="1.6"/></symbol>',
    '<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></symbol>',
    '<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/></symbol>',
    '<symbol id="i-chart" viewBox="0 0 24 24"><path d="M3 21h18"/><rect x="5" y="12" width="4" height="6"/><rect x="10.5" y="8" width="4" height="10"/><rect x="16" y="4" width="4" height="14"/></symbol>',
    '<symbol id="i-handshake" viewBox="0 0 24 24"><path d="m11 17-2.5 2.5a1.8 1.8 0 0 1-2.6-2.6L11 12"/><path d="m13 7 3 3 5-1V6l-4-2-4 1-4-1-4 2v3l5 1z"/><path d="m12 11 4 4a1.8 1.8 0 0 1-2.6 2.6L11 15"/></symbol>',
    '<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></symbol>',
    '<symbol id="i-building" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h6v6"/></symbol>',
    '<symbol id="i-pin" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.8"/></symbol>',
    '<symbol id="i-phone" viewBox="0 0 24 24"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.24 1z"/></symbol>',
    '<symbol id="i-chat" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></symbol>',
    '<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></symbol>',
    '<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.9"/></symbol>',
    '<symbol id="i-ruler" viewBox="0 0 24 24"><path d="m3 15 6-6 9 9-6 6z" transform="translate(0 -3)"/><path d="M7.5 10.5 9 12M10 8l1.5 1.5M12.5 5.5 14 7"/></symbol>',
    '<symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></symbol>',
    '<symbol id="i-palette" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="8.5" r="1"/></symbol>',
    '<symbol id="i-stack" viewBox="0 0 24 24"><rect x="3" y="14" width="18" height="6" rx="1"/><rect x="5.5" y="8" width="13" height="6" rx="1"/><rect x="8" y="2" width="8" height="6" rx="1"/></symbol>',
    '<symbol id="i-drink" viewBox="0 0 24 24"><path d="M6 3h12l-1.3 5.2A5 5 0 0 0 16.5 12v8h-9v-8a5 5 0 0 0-.2-3.8z"/><path d="M6.6 8h10.8"/></symbol>',
    '<symbol id="i-print" viewBox="0 0 24 24"><path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 16h10v5H7z"/></symbol>'
  ].join("");

  function injectSprite() {
    var d = document.createElement("div");
    d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    d.setAttribute("aria-hidden", "true");
    d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + SPRITE + "</svg>";
    document.body.insertBefore(d, document.body.firstChild);
  }
  function icon(id, cls) {
    return '<svg class="' + (cls || "") + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
  }

  // ---- Navigation model ----
  var NAV = [
    { label: "Home", href: "index.html" },
    { label: "About Us", href: "about-us.html" },
    { label: "Services", href: "services.html", sub: [
      { label: "Carton Printing in Asaba", href: "services-carton-printing-asaba.html" },
      { label: "Custom Carton Packaging", href: "services-custom-carton-packaging.html" },
      { label: "Nylon Print Packaging", href: "services-nylon-print-packaging.html" },
      { label: "Industrial Packaging", href: "services-industrial-packaging.html" },
      { label: "Branded Product Packaging", href: "services-branded-product-packaging.html" }
    ]},
    { label: "Industries", href: "industries.html" },
    { label: "Products", href: "products.html" },
    { label: "Gallery", href: "gallery.html" },
    { label: "Blog", href: "blog.html" },
    { label: "Contact", href: "contact.html" }
  ];

  var page = document.body.getAttribute("data-page") || "";
  function isActive(item) {
    if (item.href.indexOf("index") === 0 && page === "home") return true;
    if (item.sub && page.indexOf("services") === 0) return true;
    return item.href === page + ".html";
  }

  function buildHeader() {
    var links = NAV.map(function (item) {
      var active = isActive(item) ? " active" : "";
      if (item.sub) {
        var subs = item.sub.map(function (s) {
          return '<li><a href="' + s.href + '">' + s.label + "</a></li>";
        }).join("");
        return '<li class="has-sub' + active + '"><a href="' + item.href + '">' + item.label +
          '</a><ul class="submenu">' + subs + "</ul></li>";
      }
      return '<li class="' + active.trim() + '"><a href="' + item.href + '">' + item.label + "</a></li>";
    }).join("");

    var html =
      '<div class="topbar"><div class="container">' +
        '<div class="tb-left">' + CONTACT.address + "</div>" +
        '<div class="tb-right">' +
          '<a href="tel:' + CONTACT.phoneTel + '">' + CONTACT.phoneDisplay + "</a>" +
          '<a href="mailto:' + CONTACT.email + '">' + CONTACT.email + "</a>" +
          '<a href="' + WA_LINK + '" target="_blank" rel="noopener">WhatsApp</a>' +
        "</div>" +
      "</div></div>" +
      '<div class="container"><nav class="nav" aria-label="Primary">' +
        '<a class="brand" href="index.html">' +
          '<img src="assets/img/logo.jpeg" alt="Mimshak Pak Investments Ltd. logo">' +
          "<span>Mimshak Pak<small>Investments Ltd.</small></span>" +
        "</a>" +
        '<ul class="nav-links">' + links + "</ul>" +
        '<div class="nav-cta">' +
          '<span class="nav-tag">Carton &amp; Nylon Packaging</span>' +
          '<a class="btn btn--primary" href="request-a-quote.html">Request a Quote</a>' +
          '<button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
        "</div>" +
      "</nav></div>";

    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = html;
    document.body.insertBefore(header, document.body.firstChild.nextSibling);
  }

  function buildMobileNav() {
    var items = "";
    NAV.forEach(function (item) {
      items += '<a href="' + item.href + '">' + item.label + "</a>";
      if (item.sub) {
        items += '<div class="sub">';
        item.sub.forEach(function (s) { items += '<a href="' + s.href + '">' + s.label + "</a>"; });
        items += "</div>";
      }
    });
    items += '<div class="mn-head">Get in touch</div>';
    items += '<a href="request-a-quote.html">Request a Quote</a>';
    items += '<a href="tel:' + CONTACT.phoneTel + '">Call ' + CONTACT.phoneDisplay + "</a>";
    items += '<a href="' + WA_LINK + '" target="_blank" rel="noopener">WhatsApp Us</a>';

    var nav = document.createElement("div");
    nav.className = "mobile-nav";
    nav.innerHTML = items;
    var overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    document.body.appendChild(nav);
    document.body.appendChild(overlay);

    var ham = document.getElementById("hamburger");
    function toggle(open) {
      nav.classList.toggle("open", open);
      overlay.classList.toggle("open", open);
      ham.classList.toggle("open", open);
      ham.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    }
    ham.addEventListener("click", function () { toggle(!nav.classList.contains("open")); });
    overlay.addEventListener("click", function () { toggle(false); });
    nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { toggle(false); }); });
  }

  function buildFloaters() {
    var wa = '<svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.148-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
    var call = '<svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.53 15.53 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.57.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.57 1 1 0 01-.24 1.02l-2.21 2.2z"/></svg>';

    var f = document.createElement("div");
    f.className = "floaters";
    f.innerHTML =
      '<a class="fab-wa" href="' + WA_LINK + '" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><span class="fab-label">Chat on WhatsApp</span>' + wa + "</a>" +
      '<a class="fab-call" href="tel:' + CONTACT.phoneTel + '" aria-label="Call us"><span class="fab-label">Call ' + CONTACT.phoneDisplay + "</span>" + call + "</a>";
    document.body.appendChild(f);

    var bar = document.createElement("div");
    bar.className = "mobile-bar";
    bar.innerHTML =
      '<a class="mb-call" href="tel:' + CONTACT.phoneTel + '">Call Now</a>' +
      '<a class="mb-wa" href="' + WA_LINK + '" target="_blank" rel="noopener">WhatsApp</a>';
    document.body.appendChild(bar);
  }

  function buildFooter() {
    var serviceLinks = NAV[2].sub.map(function (s) {
      return '<li><a href="' + s.href + '">' + s.label + "</a></li>";
    }).join("");

    var html =
      '<div class="container"><div class="footer-grid">' +
        '<div class="footer-brand">' +
          '<img src="assets/img/logo.jpeg" alt="Mimshak Pak Investments Ltd.">' +
          "<p>A registered Nigerian packaging manufacturer in Asaba, Delta State — producing printed cartons, custom carton packaging, nylon print packaging and industrial packaging materials for businesses across Nigeria.</p>" +
        "</div>" +
        "<div><h4>Quick Links</h4><ul>" +
          '<li><a href="about-us.html">About Us</a></li>' +
          '<li><a href="services.html">Services</a></li>' +
          '<li><a href="industries.html">Industries</a></li>' +
          '<li><a href="products.html">Products</a></li>' +
          '<li><a href="gallery.html">Gallery</a></li>' +
          '<li><a href="blog.html">Blog</a></li>' +
          '<li><a href="request-a-quote.html">Request a Quote</a></li>' +
        "</ul></div>" +
        "<div><h4>Our Services</h4><ul>" + serviceLinks + "</ul></div>" +
        '<div><h4>Contact</h4><ul class="foot-contact">' +
          "<li><span>" + CONTACT.address + "</span></li>" +
          '<li><a href="tel:' + CONTACT.phoneTel + '">' + CONTACT.phoneDisplay + "</a></li>" +
          '<li><a href="tel:' + CONTACT.phone2Tel + '">' + CONTACT.phone2Display + "</a></li>" +
          '<li><a href="' + WA_LINK + '" target="_blank" rel="noopener">WhatsApp Chat</a></li>' +
          '<li><a href="mailto:' + CONTACT.email + '">' + CONTACT.email + "</a></li>" +
          "<li><span>" + CONTACT.hours + "</span></li>" +
        "</ul></div>" +
      "</div></div>" +
      '<div class="footer-bottom"><div class="container">' +
        '<span>© <span id="yr"></span> Mimshak Pak Investments Ltd. All rights reserved.</span>' +
        "<span>Carton Printing &bull; Nylon Print Packaging &bull; Asaba, Delta State</span>" +
      "</div></div>";

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = html;
    document.body.appendChild(footer);
    var yr = document.getElementById("yr");
    if (yr) yr.textContent = new Date().getFullYear();
  }

  // ---- Hero slider ----
  function initHeroSlider() {
    var root = document.getElementById("heroSlider");
    if (!root) return;
    var slides = [].slice.call(root.querySelectorAll(".hs-slide"));
    if (slides.length < 2) return;
    var dotsWrap = root.querySelector(".hs-dots");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var i = 0, timer = null, DELAY = 6000;

    var dots = slides.map(function (_, n) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Go to slide " + (n + 1));
      b.addEventListener("click", function () { go(n); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      dots.forEach(function (d, k) { d.classList.toggle("is-active", k === i); });
    }
    function next() { go(i + 1); }
    function prev() { go(i - 1); }
    function start() { if (!reduce && !timer) timer = setInterval(next, DELAY); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    root.querySelector(".hs-next").addEventListener("click", function () { next(); restart(); });
    root.querySelector(".hs-prev").addEventListener("click", function () { prev(); restart(); });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    go(0); start();
  }

  // ---- Card / step videos: play only while visible ----
  function initCardVideos() {
    var vids = document.querySelectorAll(".card-media video, .step-media video");
    if (!vids.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.dataset.loaded) { v.preload = "auto"; v.load(); v.dataset.loaded = "1"; }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else { v.pause(); }
      });
    }, { threshold: 0.1, rootMargin: "120px 0px" });
    vids.forEach(function (v) { io.observe(v); });
  }

  // ---- Lightbox ----
  function buildLightbox() {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML = '<button class="lb-close" aria-label="Close">&times;</button><div class="lb-stage"></div><div class="lb-cap"></div>';
    document.body.appendChild(lb);
    var stage = lb.querySelector(".lb-stage"), cap = lb.querySelector(".lb-cap");
    function close() { lb.classList.remove("open"); stage.innerHTML = ""; document.body.style.overflow = ""; }
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("lb-close")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.querySelectorAll("[data-lightbox]").forEach(function (el) {
      el.addEventListener("click", function () {
        var src = el.getAttribute("data-lightbox");
        var caption = el.getAttribute("data-caption") || "";
        stage.innerHTML = (el.getAttribute("data-type") === "video")
          ? '<video src="' + src + '" controls autoplay playsinline></video>'
          : '<img src="' + src + '" alt="' + caption + '">';
        cap.textContent = caption;
        lb.classList.add("open");
        document.body.style.overflow = "hidden";
      });
    });
  }

  // ---- Scroll reveal ----
  function initReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var targets = document.querySelectorAll(".card, .icard, .step, .post-card, .split-media, .stat, .spec, .brand-item, .video-card");
    if (!("IntersectionObserver" in window) || !targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (el, i) {
      el.setAttribute("data-reveal", "");
      el.style.transitionDelay = (i % 3) * 60 + "ms";
      io.observe(el);
    });
  }

  // ---- Forms (front-end only until wired to a backend) ----
  function wireForms() {
    document.querySelectorAll("form[data-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var ok = form.querySelector(".form-success");
        if (ok) { ok.classList.add("show"); ok.scrollIntoView({ behavior: "smooth", block: "center" }); }
        form.reset();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    injectSprite();
    buildHeader();
    buildMobileNav();
    buildFloaters();
    buildFooter();
    initHeroSlider();
    initCardVideos();
    buildLightbox();
    initReveal();
    wireForms();
  });
})();
