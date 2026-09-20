/* =================================================================
   Mimshak Pak — Packaging cost calculator
   Works out an indicative price from dimensions, material, printing
   and quantity. Pricing lives in quote-rates.js.
   ================================================================= */
(function () {
  "use strict";

  var R = window.MPQ_RATES;
  if (!R) return;

  var root = document.getElementById("calc");
  if (!root) return;

  /* ---------------- helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  function num(id) { var v = parseFloat(($(id) || {}).value); return isNaN(v) ? 0 : v; }
  function str(id) { return (($(id) || {}).value || "").trim(); }

  function money(n) {
    return "₦" + Math.round(n).toLocaleString("en-NG");
  }
  function moneyUnit(n) {
    return "₦" + (n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString("en-NG"));
  }

  function volumeDiscount(qty) {
    var d = 0;
    R.volumeBreaks.forEach(function (b) { if (qty >= b.from) d = b.discountPercent; });
    return d;
  }
  function nextBreak(qty) {
    for (var i = 0; i < R.volumeBreaks.length; i++) {
      if (R.volumeBreaks[i].from > qty) return R.volumeBreaks[i];
    }
    return null;
  }

  /* ---------------- carton maths ----------------
     Standard slotted carton. The flat blank before folding is:
       length = 2 x (L + W) + glue flap
       width  = H + W        (top and bottom flaps are half W each)
  */
  function calcCarton() {
    var C = R.carton;
    var L = num("c-len"), W = num("c-wid"), H = num("c-hgt");
    var qty = num("c-qty");
    var colours = parseInt(str("c-colours"), 10) || 0;
    var wall = str("c-wall") || "single";
    var laminated = $("c-lam").checked;
    var customDie = $("c-die").checked;

    if (L <= 0 || W <= 0 || H <= 0 || qty <= 0) return null;

    var blankL = 2 * (L + W) + C.glueFlapCm;
    var blankW = H + W;
    var sqm = (blankL * blankW) / 10000;

    var board = sqm * (C.boardPerSqm[wall] || C.boardPerSqm.single);
    var print = sqm * C.printPerSqmPerColour * colours;
    var lam = laminated ? sqm * C.laminationPerSqm : 0;

    var setup = colours * C.platePerColour + (customDie ? C.dieCutSetup : 0);

    return finish({
      kind: "carton",
      qty: qty,
      sqm: sqm,
      parts: [
        ["Board (" + (wall === "double" ? "double wall" : "single wall") + ")", board],
        colours ? ["Printing, " + colours + " colour" + (colours > 1 ? "s" : ""), print] : null,
        laminated ? ["Lamination", lam] : null
      ],
      base: board + print + lam,
      setup: setup,
      setupParts: [
        colours ? ["Printing plates (" + colours + ")", colours * C.platePerColour] : null,
        customDie ? ["Cutting die", C.dieCutSetup] : null
      ],
      wastage: C.wastagePercent,
      margin: C.marginPercent,
      minQty: C.minQuantity,
      spec: L + " x " + W + " x " + H + " cm, " +
            (wall === "double" ? "double wall" : "single wall") +
            (colours ? ", " + colours + "-colour print" : ", unprinted") +
            (laminated ? ", laminated" : "") +
            (customDie ? ", custom die-cut" : "")
    });
  }

  /* ---------------- nylon maths ----------------
     Weight drives the price. Both faces of the bag are counted.
  */
  function calcNylon() {
    var N = R.nylon;
    var W = num("n-wid"), H = num("n-hgt"), mic = num("n-mic");
    var qty = num("n-qty");
    var colours = parseInt(str("n-colours"), 10) || 0;
    var mat = str("n-mat") || "ldpe";

    if (W <= 0 || H <= 0 || mic <= 0 || qty <= 0) return null;

    var areaCm2 = 2 * W * H;
    var volumeCm3 = areaCm2 * (mic / 10000);
    var kg = volumeCm3 * (N.densityGPerCm3[mat] || 0.92) / 1000;

    var material = kg * (N.materialPerKg[mat] || N.materialPerKg.ldpe);
    var print = kg * N.printPerKgPerColour * colours;
    var setup = colours * N.cylinderPerColour;

    var matLabel = { ldpe: "LDPE", hdpe: "HDPE", pp: "PP" }[mat] || mat.toUpperCase();

    return finish({
      kind: "nylon",
      qty: qty,
      grams: kg * 1000,
      parts: [
        [matLabel + " film (" + (kg * 1000).toFixed(1) + " g per bag)", material],
        colours ? ["Printing, " + colours + " colour" + (colours > 1 ? "s" : ""), print] : null
      ],
      base: material + print,
      setup: setup,
      setupParts: [
        colours ? ["Printing cylinders (" + colours + ")", colours * N.cylinderPerColour] : null
      ],
      wastage: N.wastagePercent,
      margin: N.marginPercent,
      minQty: N.minQuantity,
      spec: W + " x " + H + " cm, " + mic + " micron " + matLabel +
            (colours ? ", " + colours + "-colour print" : ", plain")
    });
  }

  /* ---------------- shared final steps ---------------- */
  function finish(r) {
    r.parts = r.parts.filter(Boolean);
    r.setupParts = (r.setupParts || []).filter(Boolean);

    var withWaste = r.base * (1 + r.wastage / 100);
    var withMargin = withWaste * (1 + r.margin / 100);
    var setupPerUnit = r.setup / r.qty;
    var beforeDiscount = withMargin + setupPerUnit;

    r.discount = volumeDiscount(r.qty);
    r.unit = beforeDiscount * (1 - r.discount / 100);
    r.total = r.unit * r.qty;
    r.setupPerUnit = setupPerUnit;
    r.wasteAmount = withWaste - r.base;

    var spread = R.rangeSpreadPercent / 100;
    r.low = r.total * (1 - spread);
    r.high = r.total * (1 + spread);
    r.unitLow = r.unit * (1 - spread);
    r.unitHigh = r.unit * (1 + spread);
    r.belowMin = r.qty < r.minQty;
    return r;
  }

  /* ---------------- rendering ---------------- */
  var current = null;

  function render() {
    var mode = root.getAttribute("data-mode");
    var r = mode === "nylon" ? calcNylon() : calcCarton();
    current = r;
    var out = $("calc-out");

    if (!r) {
      out.innerHTML =
        '<div class="calc-empty">' +
          '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5">' +
          '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>' +
          "<p>Fill in the sizes and quantity to see your estimate.</p>" +
        "</div>";
      return;
    }

    var rows = r.parts.map(function (p) {
      return '<tr><td>' + p[0] + "</td><td>" + moneyUnit(p[1]) + "</td></tr>";
    }).join("");

    var setupHtml = "";
    if (r.setup > 0) {
      setupHtml =
        '<div class="calc-setup">' +
          "<h4>One-off setup</h4>" +
          '<table class="calc-lines">' +
          r.setupParts.map(function (p) {
            return "<tr><td>" + p[0] + "</td><td>" + money(p[1]) + "</td></tr>";
          }).join("") +
          '<tr class="sum"><td>Spread over ' + r.qty.toLocaleString("en-NG") + " units</td><td>" +
            moneyUnit(r.setupPerUnit) + " each</td></tr>" +
          "</table>" +
          '<p class="calc-hint">Setup is charged once, not per unit — so the bigger the order, the less each item costs.</p>' +
        "</div>";
    }

    var nb = nextBreak(r.qty);
    var upsell = "";
    if (nb) {
      var more = nb.from - r.qty;
      upsell =
        '<div class="calc-upsell">Order ' + more.toLocaleString("en-NG") +
        " more and your discount rises to <strong>" + nb.discountPercent + "%</strong> at " +
        nb.from.toLocaleString("en-NG") + " units.</div>";
    }

    var minWarn = r.belowMin
      ? '<div class="calc-warn">Our minimum order for this product is <strong>' +
        r.minQty.toLocaleString("en-NG") + " units</strong>. " +
        "We can still discuss smaller runs — send us the spec and we will see what is possible.</div>"
      : "";

    out.innerHTML =
      minWarn +
      '<div class="calc-headline">' +
        '<span class="calc-label">Estimated total</span>' +
        '<div class="calc-range">' + money(r.low) + " &ndash; " + money(r.high) + "</div>" +
        '<div class="calc-per">about ' + moneyUnit(r.unitLow) + " &ndash; " + moneyUnit(r.unitHigh) +
          " per unit &middot; " + r.qty.toLocaleString("en-NG") + " units</div>" +
      "</div>" +
      '<div class="calc-block"><h4>What makes up the price</h4>' +
        '<table class="calc-lines">' + rows +
        "<tr><td>Wastage allowance (" + r.wastage + "%)</td><td>" + moneyUnit(r.wasteAmount) + "</td></tr>" +
        (r.discount ? '<tr class="disc"><td>Quantity discount</td><td>&minus;' + r.discount + "%</td></tr>" : "") +
        '<tr class="sum"><td>Per unit</td><td>' + moneyUnit(r.unit) + "</td></tr>" +
        "</table></div>" +
      setupHtml +
      upsell +
      '<div class="calc-actions">' +
        '<button type="button" class="btn btn--primary" id="calc-wa">Send this spec on WhatsApp</button>' +
        '<button type="button" class="btn btn--ghost" id="calc-form">Request a formal quote</button>' +
      "</div>" +
      '<p class="calc-disclaimer">' + R.disclaimer + "</p>";

    $("calc-wa").addEventListener("click", sendWhatsApp);
    $("calc-form").addEventListener("click", goToForm);
  }

  /* ---------------- hand-off ---------------- */
  function specLines(r) {
    return {
      product: r.kind === "nylon" ? "Nylon Print Packaging" : "Carton Printing",
      spec: r.spec,
      qty: r.qty.toLocaleString("en-NG") + " units",
      est: money(r.low) + " - " + money(r.high)
    };
  }

  function sendWhatsApp() {
    if (!current) return;
    var s = specLines(current);
    var C = window.MPI_CONTACT || { whatsappNumber: "2348037079976" };
    var msg =
      "Hello Mimshak Pak, I used the cost calculator on your website and would like a firm quote.\n\n" +
      "Packaging: " + s.product + "\n" +
      "Specification: " + s.spec + "\n" +
      "Quantity: " + s.qty + "\n" +
      "Website estimate: " + s.est + "\n\n" +
      "Please confirm the actual price and lead time.";
    window.open("https://wa.me/" + C.whatsappNumber + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }

  function goToForm() {
    if (!current) return;
    var s = specLines(current);
    var q = "?packaging=" + encodeURIComponent(s.product) +
            "&size=" + encodeURIComponent(s.spec) +
            "&quantity=" + encodeURIComponent(s.qty) +
            "&est=" + encodeURIComponent(s.est);
    window.location.href = "request-a-quote.html" + q;
  }

  /* ---------------- mode switching ---------------- */
  function setMode(mode) {
    root.setAttribute("data-mode", mode);
    document.querySelectorAll(".calc-switch button").forEach(function (b) {
      var on = b.getAttribute("data-mode") === mode;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    $("panel-carton").hidden = mode !== "carton";
    $("panel-nylon").hidden = mode !== "nylon";
    render();
  }

  document.querySelectorAll(".calc-switch button").forEach(function (b) {
    b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
  });

  /* preset chips fill the form with a common job */
  document.querySelectorAll("[data-preset]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var p = JSON.parse(chip.getAttribute("data-preset"));
      setMode(p.mode);
      Object.keys(p.fields).forEach(function (id) {
        var el = $(id);
        if (!el) return;
        if (el.type === "checkbox") el.checked = !!p.fields[id];
        else el.value = p.fields[id];
      });
      render();
      document.querySelectorAll("[data-preset]").forEach(function (c) { c.classList.remove("is-on"); });
      chip.classList.add("is-on");
    });
  });

  root.addEventListener("input", render);
  root.addEventListener("change", render);
  setMode("carton");

})();
