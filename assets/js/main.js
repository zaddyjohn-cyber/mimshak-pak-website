/* =================================================================
   Mimshak Pak Investments Ltd. — Shared site script
   Injects header / mobile nav / footer / floating actions,
   handles lightbox, forms and gallery interactions.
   Update CONTACT once to change details site-wide.
   ================================================================= */
(function () {
  "use strict";

  // ---- Single source of truth for contact details (placeholders) ----
  var CONTACT = {
    name: "Mimshak Pak Investments Ltd.",
    phoneDisplay: "+234 800 000 0000",
    phoneTel: "+2348000000000",
    whatsappNumber: "2348000000000", // international format, no +
    email: "info@mimshakpak.com",
    address: "Asaba, Delta State, Nigeria",
    hours: "Mon – Sat: 8:00am – 6:00pm",
    waMessage: "Hello Mimshak Pak, I would like to request a packaging quote."
  };
  var WA_LINK = "https://wa.me/" + CONTACT.whatsappNumber + "?text=" + encodeURIComponent(CONTACT.waMessage);
  window.MPI_CONTACT = CONTACT;

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

  // ---- Header ----
  function buildHeader() {
    var links = NAV.map(function (item) {
      var active = isActive(item) ? " active" : "";
      if (item.sub) {
        var subs = item.sub.map(function (s) {
          return '<li><a href="' + s.href + '">' + s.label + '</a></li>';
        }).join("");
        return '<li class="has-sub' + active + '"><a href="' + item.href + '">' + item.label +
          '</a><ul class="submenu">' + subs + '</ul></li>';
      }
      return '<li class="' + active.trim() + '"><a href="' + item.href + '">' + item.label + '</a></li>';
    }).join("");

    var html =
      '<div class="topbar"><div class="container">' +
        '<div class="tb-left">📍 ' + CONTACT.address + '</div>' +
        '<div class="tb-right">' +
          '<a href="tel:' + CONTACT.phoneTel + '">📞 ' + CONTACT.phoneDisplay + '</a>' +
          '<a href="mailto:' + CONTACT.email + '">✉️ ' + CONTACT.email + '</a>' +
          '<a href="' + WA_LINK + '" target="_blank" rel="noopener">💬 WhatsApp</a>' +
        '</div>' +
      '</div></div>' +
      '<div class="container"><nav class="nav" aria-label="Primary">' +
        '<a class="brand" href="index.html">' +
          '<img src="assets/img/logo.jpeg" alt="Mimshak Pak Investments Ltd. logo">' +
          '<span>Mimshak Pak<small>Investments Ltd.</small></span>' +
        '</a>' +
        '<ul class="nav-links">' + links + '</ul>' +
        '<div class="nav-cta">' +
          '<span class="nav-tag">Carton &amp; Nylon Packaging</span>' +
          '<a class="btn btn--primary" href="request-a-quote.html">Request a Quote</a>' +
          '<button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
        '</div>' +
      '</nav></div>';

    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = html;
    document.body.insertBefore(header, document.body.firstChild);
  }

  // ---- Mobile nav ----
  function buildMobileNav() {
    var items = "";
    NAV.forEach(function (item) {
      items += '<a href="' + item.href + '">' + item.label + '</a>';
      if (item.sub) {
        items += '<div class="sub">';
        item.sub.forEach(function (s) { items += '<a href="' + s.href + '">' + s.label + '</a>'; });
        items += '</div>';
      }
    });
    items += '<div class="mn-head">Get in touch</div>';
    items += '<a href="request-a-quote.html">Request a Quote</a>';
    items += '<a href="tel:' + CONTACT.phoneTel + '">Call ' + CONTACT.phoneDisplay + '</a>';
    items += '<a href="' + WA_LINK + '" target="_blank" rel="noopener">WhatsApp Us</a>';

    var nav = document.createElement("div");
    nav.className = "mobile-nav";
    nav.id = "mobileNav";
    nav.innerHTML = items;
    var overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    overlay.id = "navOverlay";
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

  // ---- Floating actions + mobile bar ----
  function buildFloaters() {
    var wa = '<svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.148-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
    var call = '<svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.53 15.53 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.57.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.57 1 1 0 01-.24 1.02l-2.21 2.2z"/></svg>';

    var f = document.createElement("div");
    f.className = "floaters";
    f.innerHTML =
      '<a class="fab-wa" href="' + WA_LINK + '" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><span class="fab-label">Chat on WhatsApp</span>' + wa + '</a>' +
      '<a class="fab-call" href="tel:' + CONTACT.phoneTel + '" aria-label="Call us"><span class="fab-label">Call ' + CONTACT.phoneDisplay + '</span>' + call + '</a>';
    document.body.appendChild(f);

    var bar = document.createElement("div");
    bar.className = "mobile-bar";
    bar.innerHTML =
      '<a class="mb-call" href="tel:' + CONTACT.phoneTel + '">📞 Call Now</a>' +
      '<a class="mb-wa" href="' + WA_LINK + '" target="_blank" rel="noopener">💬 WhatsApp</a>';
    document.body.appendChild(bar);
  }

  // ---- Footer ----
  function buildFooter() {
    var serviceLinks = NAV[2].sub.map(function (s) {
      return '<li><a href="' + s.href + '">' + s.label + '</a></li>';
    }).join("");

    var html =
      '<div class="container"><div class="footer-grid">' +
        '<div class="footer-brand">' +
          '<img src="assets/img/logo.jpeg" alt="Mimshak Pak Investments Ltd.">' +
          '<p>Mimshak Pak Investments Ltd. is a Nigerian packaging manufacturing company based in Asaba, Delta State. We produce printed cartons, custom carton packaging, nylon print packaging, and industrial packaging materials for businesses across Nigeria.</p>' +
        '</div>' +
        '<div><h4>Quick Links</h4><ul>' +
          '<li><a href="about-us.html">About Us</a></li>' +
          '<li><a href="services.html">Services</a></li>' +
          '<li><a href="industries.html">Industries</a></li>' +
          '<li><a href="products.html">Products</a></li>' +
          '<li><a href="gallery.html">Gallery</a></li>' +
          '<li><a href="blog.html">Blog</a></li>' +
          '<li><a href="request-a-quote.html">Request a Quote</a></li>' +
        '</ul></div>' +
        '<div><h4>Our Services</h4><ul>' + serviceLinks + '</ul></div>' +
        '<div><h4>Contact</h4><ul class="foot-contact">' +
          '<li>📍 <span>' + CONTACT.address + '</span></li>' +
          '<li>📞 <a href="tel:' + CONTACT.phoneTel + '">' + CONTACT.phoneDisplay + '</a></li>' +
          '<li>💬 <a href="' + WA_LINK + '" target="_blank" rel="noopener">WhatsApp Chat</a></li>' +
          '<li>✉️ <a href="mailto:' + CONTACT.email + '">' + CONTACT.email + '</a></li>' +
          '<li>🕒 <span>' + CONTACT.hours + '</span></li>' +
        '</ul></div>' +
      '</div></div>' +
      '<div class="footer-bottom"><div class="container">' +
        '<span>© <span id="yr"></span> Mimshak Pak Investments Ltd. All rights reserved.</span>' +
        '<span>Carton Printing &bull; Nylon Print Packaging &bull; Asaba, Delta State</span>' +
      '</div></div>';

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = html;
    document.body.appendChild(footer);
    var yr = document.getElementById("yr");
    if (yr) yr.textContent = new Date().getFullYear();
  }

  // ---- Lightbox (images + video) ----
  function buildLightbox() {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.id = "lightbox";
    lb.innerHTML = '<button class="lb-close" aria-label="Close">&times;</button>' +
      '<div class="lb-stage"></div><div class="lb-cap"></div>';
    document.body.appendChild(lb);
    var stage = lb.querySelector(".lb-stage");
    var cap = lb.querySelector(".lb-cap");

    function close() { lb.classList.remove("open"); stage.innerHTML = ""; document.body.style.overflow = ""; }
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("lb-close")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    document.querySelectorAll("[data-lightbox]").forEach(function (el) {
      el.addEventListener("click", function () {
        var type = el.getAttribute("data-type") || "image";
        var src = el.getAttribute("data-lightbox");
        var caption = el.getAttribute("data-caption") || "";
        if (type === "video") {
          stage.innerHTML = '<video src="' + src + '" controls autoplay playsinline></video>';
        } else {
          stage.innerHTML = '<img src="' + src + '" alt="' + caption + '">';
        }
        cap.textContent = caption;
        lb.classList.add("open");
        document.body.style.overflow = "hidden";
      });
    });
  }

  // ---- Animated hero: rising packaging media (cartons / production / workers) ----
  function buildRiseHero() {
    var host = document.querySelector(".rise-cols");
    if (!host) return;
    var media = [
      { src: "press-line.jpeg", tag: "Production" },
      { src: "carton-de-bryans-soap.jpeg", tag: "Cartons" },
      { src: "worker-bag-machine.jpeg", tag: "Workers" },
      { src: "nylon-arise-bread.jpeg", tag: "Nylon Print" },
      { src: "printing-press-rotogravure.jpeg", tag: "Printing" },
      { src: "carton-beauty-sparkle.jpeg", tag: "Cartons" },
      { src: "factory-floor.jpeg", tag: "Factory" },
      { src: "nylon-impact.jpeg", tag: "Nylon Print" },
      { src: "flexo-printing.jpeg", tag: "Printing" },
      { src: "press-control-panels.jpeg", tag: "Workers" },
      { src: "nylon-gsr-bread.jpeg", tag: "Nylon Print" },
      { src: "warehouse-cartons.jpeg", tag: "Cartons" },
      { src: "bag-making-machine.jpeg", tag: "Production" },
      { src: "nylon-alyce-bread.jpeg", tag: "Nylon Print" },
      { src: "nylon-production-hall.jpeg", tag: "Factory" }
    ];
    var cols = parseInt(host.getAttribute("data-rise"), 10) || 5;
    function tile(m) {
      return '<div class="rise-item"><img src="assets/img/' + m.src + '" alt="' + m.tag +
        ' at Mimshak Pak, Asaba" loading="eager"><span class="ri-tag">' + m.tag + '</span></div>';
    }
    var html = "";
    for (var c = 0; c < cols; c++) {
      var seq = "";
      // each column gets a rotated slice so columns differ
      for (var i = 0; i < 5; i++) {
        seq += tile(media[(c * 3 + i) % media.length]);
      }
      // duplicate the sequence for a seamless -50% loop
      html += '<div class="rise-col"><div class="rise-track">' + seq + seq + "</div></div>";
    }
    host.innerHTML = html;
  }

  // ---- 3D ring-globe: roll through company pictures ----
  function buildOrb() {
    var core = document.querySelector(".orb-core[data-orb]");
    if (!core) return;
    var pics = [
      { src: "press-line.jpeg", alt: "Printing production line at Mimshak Pak, Asaba" },
      { src: "carton-de-bryans-soap.jpeg", alt: "Printed carton produced by Mimshak Pak" },
      { src: "worker-bag-machine.jpeg", alt: "Worker operating a bag-making machine" },
      { src: "nylon-arise-bread.jpeg", alt: "Branded nylon packaging by Mimshak Integrated Packages" },
      { src: "printing-press-rotogravure.jpeg", alt: "Carton printing press in operation" },
      { src: "nylon-impact.jpeg", alt: "Printed nylon food packaging made in Nigeria" }
    ];
    var per = 24 / pics.length; // seconds per slide (matches orbFade duration)
    var html = "";
    pics.forEach(function (p, i) {
      html += '<div class="orb-slide" style="animation-delay:' + (i * per).toFixed(2) +
        's"><img src="assets/img/' + p.src + '" alt="' + p.alt + '"></div>';
    });
    core.innerHTML = html;
  }

  // ---- Card videos: play only while visible (saves bandwidth/CPU) ----
  function initCardVideos() {
    var vids = document.querySelectorAll(".card-media video, .step-media video");
    if (!vids.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.dataset.loaded) { v.preload = "auto"; v.load(); v.dataset.loaded = "1"; }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.1, rootMargin: "120px 0px" });
    vids.forEach(function (v) { io.observe(v); });
  }

  // ---- Scroll reveal (depth-aware fade/translate as sections enter view) ----
  function initReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var targets = document.querySelectorAll(
      ".card, .icard, .step, .post-card, .video-card, .split-media, .stat, .faq details, .trust-strip, .chips, .cta-band, .info-list, .form-wrap, .article > *"
    );
    if (!("IntersectionObserver" in window) || !targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (el, i) {
      el.setAttribute("data-reveal", "");
      // stagger items that share a row/grid
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      io.observe(el);
    });
  }

  // ---- Hero 3D parallax (cursor nudges the rising columns in space) ----
  function initHeroParallax() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    var hero = document.querySelector(".hero--rise");
    var cols = hero && hero.querySelector(".rise-cols");
    if (!cols) return;
    hero.addEventListener("mousemove", function (ev) {
      var r = hero.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width - 0.5;   // -0.5 .. 0.5
      var y = (ev.clientY - r.top) / r.height - 0.5;
      cols.style.setProperty("--px", (x * 6).toFixed(2) + "deg");
      cols.style.setProperty("--py", (-y * 4).toFixed(2) + "deg");
    });
    hero.addEventListener("mouseleave", function () {
      cols.style.setProperty("--px", "0deg");
      cols.style.setProperty("--py", "0deg");
    });
  }

  // ---- Forms (front-end only demo handling) ----
  function wireForms() {
    document.querySelectorAll("form[data-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var success = form.querySelector(".form-success");
        if (success) {
          success.classList.add("show");
          success.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        form.reset();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildHeader();
    buildMobileNav();
    buildFloaters();
    buildFooter();
    buildLightbox();
    buildRiseHero();
    buildOrb();
    initCardVideos();
    initReveal();
    initHeroParallax();
    wireForms();
  });
})();
