/* =================================================================
   Mimshak Pak — Calculator pricing editor
   Loads assets/js/quote-rates.js from GitHub, lets the owner edit the
   figures in plain language, previews the effect, and saves it back.
   ================================================================= */
(function () {
  "use strict";

  var MPF = window.MPF;
  if (!MPF) return;

  var FILE = 'assets/js/quote-rates.js';
  var API = 'https://api.github.com/repos/zaddyjohn-cyber/mimshak-pak-website/contents/';

  var sha = '', source = '', loaded = false;

  /* Each field: [storage key, section, label, help, suffix]
     section is used to scope the regex so duplicate keys stay separate. */
  var FIELDS = [
    ['boardPerSqm.single',   'carton', 'Single wall board',        'Cost of 1 square metre of 3-ply board', '₦ / m2'],
    ['boardPerSqm.double',   'carton', 'Double wall board',        'Cost of 1 square metre of 5-ply board', '₦ / m2'],
    ['printPerSqmPerColour', 'carton', 'Carton printing',          'Cost to print 1 square metre, per colour', '₦ / m2 / colour'],
    ['laminationPerSqm',     'carton', 'Lamination',               'Gloss or matt finish per square metre', '₦ / m2'],
    ['platePerColour',       'carton', 'Printing plate',           'One-off, one plate per colour', '₦ each'],
    ['dieCutSetup',          'carton', 'Cutting die',              'One-off, for custom shapes or windows', '₦ each'],
    ['wastagePercent',       'carton', 'Carton wastage',           'Board lost to trimming and set-up sheets', '%'],
    ['marginPercent',        'carton', 'Carton margin',            'Your profit margin on cartons', '%'],
    ['minQuantity',          'carton', 'Carton minimum order',     'Smallest carton order you will take', 'units'],

    ['materialPerKg.ldpe',   'nylon',  'LDPE film',                'Soft, flexible film — bread and general bagging', '₦ / kg'],
    ['materialPerKg.hdpe',   'nylon',  'HDPE film',                'Stronger, crinkly film — shopping bags', '₦ / kg'],
    ['materialPerKg.pp',     'nylon',  'PP film',                  'Clear and glossy film — retail presentation', '₦ / kg'],
    ['printPerKgPerColour',  'nylon',  'Nylon printing',           'Cost to print 1 kg of film, per colour', '₦ / kg / colour'],
    ['cylinderPerColour',    'nylon',  'Printing cylinder',        'One-off, one cylinder per colour', '₦ each'],
    ['wastagePercent',       'nylon',  'Nylon wastage',            'Film lost during set-up and running', '%'],
    ['marginPercent',        'nylon',  'Nylon margin',             'Your profit margin on nylon', '%'],
    ['minQuantity',          'nylon',  'Nylon minimum order',      'Smallest nylon order you will take', 'units'],

    ['rangeSpreadPercent',   'tail',   'Estimate spread',          'The website shows a range this far above and below the calculated price', '%']
  ];

  var BREAKS = [0, 2000, 5000, 10000, 25000];

  /* ---------- parsing ---------- */
  function sections(src) {
    var a = src.indexOf('carton:'), b = src.indexOf('nylon:'), c = src.indexOf('volumeBreaks:');
    if (a < 0 || b < 0 || c < 0) return null;
    return { head: src.slice(0, a), carton: src.slice(a, b), nylon: src.slice(b, c), tail: src.slice(c) };
  }

  function keyRegex(key) {
    var leaf = key.indexOf('.') > -1 ? key.split('.')[1] : key;
    return new RegExp('(\\b' + leaf + '\\s*:\\s*)(-?\\d+(?:\\.\\d+)?)');
  }

  function readValue(parts, f) {
    var chunk = parts[f[1]];
    if (f[0].indexOf('.') > -1) {
      var parent = f[0].split('.')[0];
      var pi = chunk.indexOf(parent);
      if (pi < 0) return '';
      chunk = chunk.slice(pi, chunk.indexOf('}', pi) + 1);
    }
    var m = chunk.match(keyRegex(f[0]));
    return m ? m[2] : '';
  }

  function writeValue(parts, f, value) {
    var key = f[1], chunk = parts[key];
    if (f[0].indexOf('.') > -1) {
      var parent = f[0].split('.')[0];
      var pi = chunk.indexOf(parent);
      if (pi < 0) return;
      var pe = chunk.indexOf('}', pi) + 1;
      var inner = chunk.slice(pi, pe).replace(keyRegex(f[0]), '$1' + value);
      parts[key] = chunk.slice(0, pi) + inner + chunk.slice(pe);
      return;
    }
    parts[key] = chunk.replace(keyRegex(f[0]), '$1' + value);
  }

  function readBreaks(parts) {
    var out = {};
    var re = /\{\s*from:\s*(\d+)\s*,\s*discountPercent:\s*(\d+)\s*\}/g, m;
    while ((m = re.exec(parts.tail))) out[m[1]] = m[2];
    return out;
  }

  function writeBreak(parts, from, pct) {
    var re = new RegExp('(\\{\\s*from:\\s*' + from + '\\s*,\\s*discountPercent:\\s*)(\\d+)');
    parts.tail = parts.tail.replace(re, '$1' + pct);
  }

  /* ---------- preview ---------- */
  function vals() {
    var v = {};
    FIELDS.forEach(function (f, i) {
      var el = document.getElementById('pr-' + i);
      v[f[1] + '.' + f[0]] = parseFloat(el ? el.value : 0) || 0;
    });
    v.breaks = BREAKS.map(function (b, i) {
      var el = document.getElementById('pr-b' + i);
      return { from: b, pct: parseFloat(el ? el.value : 0) || 0 };
    });
    return v;
  }

  function discountFor(v, qty) {
    var d = 0;
    v.breaks.forEach(function (b) { if (qty >= b.from) d = b.pct; });
    return d;
  }

  function previewCarton(v) {
    var L = 30, W = 20, H = 15, qty = 2000, colours = 2;
    var sqm = ((2 * (L + W) + 4) * (H + W)) / 10000;
    var base = sqm * v['carton.boardPerSqm.single'] + sqm * v['carton.printPerSqmPerColour'] * colours;
    var unit = base * (1 + v['carton.wastagePercent'] / 100) * (1 + v['carton.marginPercent'] / 100);
    unit += (colours * v['carton.platePerColour']) / qty;
    unit *= (1 - discountFor(v, qty) / 100);
    return { unit: unit, total: unit * qty, qty: qty,
             label: '30 x 20 x 15 cm carton, single wall, 2 colours, 2,000 units' };
  }

  function previewNylon(v) {
    var W = 30, H = 45, mic = 40, qty = 10000, colours = 2;
    var kg = (2 * W * H) * (mic / 10000) * 0.92 / 1000;
    var base = kg * v['nylon.materialPerKg.ldpe'] + kg * v['nylon.printPerKgPerColour'] * colours;
    var unit = base * (1 + v['nylon.wastagePercent'] / 100) * (1 + v['nylon.marginPercent'] / 100);
    unit += (colours * v['nylon.cylinderPerColour']) / qty;
    unit *= (1 - discountFor(v, qty) / 100);
    return { unit: unit, total: unit * qty, qty: qty,
             label: '30 x 45 cm bread bag, 40 micron LDPE, 2 colours, 10,000 units' };
  }

  function money(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); }
  function unitMoney(n) { return '₦' + (n < 100 ? n.toFixed(2) : Math.round(n).toLocaleString('en-NG')); }

  function refreshPreview() {
    var v = vals(), spread = v['tail.rangeSpreadPercent'] / 100;
    [['pv-carton', previewCarton(v)], ['pv-nylon', previewNylon(v)]].forEach(function (p) {
      var el = document.getElementById(p[0]);
      if (!el) return;
      var r = p[1];
      el.innerHTML =
        '<div class="card-label">' + r.label + '</div>' +
        '<div class="card-value" style="font-size:17px;color:var(--accent)">' +
          money(r.total * (1 - spread)) + ' – ' + money(r.total * (1 + spread)) + '</div>' +
        '<div class="card-hint">about ' + unitMoney(r.unit) + ' per unit</div>';
    });
  }

  /* ---------- rendering ---------- */
  function shell(body) { document.getElementById('mpf-pricing').innerHTML = body; }

  function renderLocked() {
    shell('<div class="mpf-warn-box"><strong>GitHub access needed.</strong> Editing the website\'s prices ' +
      'saves a change to the live site, so it needs the GitHub token set up. Go to the ' +
      '<strong>Settings</strong> tab and follow the guide once.</div>' +
      '<button class="btn btn-ghost" onclick="switchSection(\'settings\')">Go to Settings</button>');
  }

  function renderForm() {
    var parts = sections(source);
    if (!parts) { shell('<div class="mpf-warn-box"><strong>Could not read the pricing file.</strong> ' +
      'Its structure has changed. Edit <code>assets/js/quote-rates.js</code> on GitHub directly.</div>'); return; }

    var brk = readBreaks(parts);

    function group(title, note, list) {
      return '<div class="editor-form" style="margin-bottom:14px"><h3>' + title + '</h3>' +
        (note ? '<p class="mpf-note" style="margin:-8px 0 14px">' + note + '</p>' : '') +
        '<div class="form-row">' + list + '</div></div>';
    }

    function fieldHtml(f, i) {
      return '<div class="field"><label>' + MPF.esc(f[2]) +
        ' <span style="text-transform:none;letter-spacing:0;color:var(--ink-3);font-weight:400">' + f[4] + '</span></label>' +
        '<input type="number" id="pr-' + i + '" step="any" min="0" value="' + readValue(parts, f) + '">' +
        '<div class="field-hint">' + MPF.esc(f[3]) + '</div></div>';
    }

    var cartonF = '', nylonF = '', tailF = '';
    FIELDS.forEach(function (f, i) {
      var h = fieldHtml(f, i);
      if (f[1] === 'carton') cartonF += h;
      else if (f[1] === 'nylon') nylonF += h;
      else tailF += h;
    });

    var breaksF = BREAKS.map(function (b, i) {
      return '<div class="field"><label>' + (b === 0 ? 'Under 2,000' : b.toLocaleString('en-NG') + '+') +
        ' <span style="text-transform:none;letter-spacing:0;color:var(--ink-3);font-weight:400">%</span></label>' +
        '<input type="number" id="pr-b' + i + '" min="0" max="90" step="1" value="' + (brk[b] || 0) + '"></div>';
    }).join('');

    shell(
      '<div class="mpf-bar">' +
        '<button class="mpf-mini" data-act="pricing-reload">Reload from website</button>' +
        '<button class="btn btn-primary" data-act="pricing-save" style="padding:7px 16px">Save to website</button>' +
        '<span class="editor-status" id="pr-status"></span>' +
      '</div>' +
      '<div class="mpf-warn-box"><strong>These figures set the prices customers see.</strong> ' +
      'Check the preview at the bottom before saving. The website updates about a minute after you save.</div>' +
      group('Printed cartons', '', cartonF) +
      group('Nylon packaging', '', nylonF) +
      group('Quantity discounts', 'How much cheaper each unit gets as the order grows.', breaksF) +
      group('Estimate display', '', tailF) +
      '<div class="section-title" style="font-size:14px;margin:22px 0 12px">Preview with these figures</div>' +
      '<div class="card-grid"><div class="card" id="pv-carton"></div><div class="card" id="pv-nylon"></div></div>' +
      '<div class="mpf-bar" style="margin-top:4px">' +
        '<button class="btn btn-primary" data-act="pricing-save" style="padding:7px 16px">Save to website</button>' +
        '<span class="editor-status" id="pr-status2"></span>' +
      '</div>'
    );

    document.getElementById('mpf-pricing').addEventListener('input', refreshPreview);
    refreshPreview();
  }

  function status(msg, kind) {
    ['pr-status', 'pr-status2'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.textContent = msg; el.className = 'editor-status' + (kind ? ' ' + kind : ''); }
    });
  }

  /* ---------- GitHub load / save ---------- */
  function token() { return localStorage.getItem('mpk_gh_token') || ''; }

  function load(force) {
    if (!token()) { renderLocked(); return; }
    if (loaded && !force) { renderForm(); return; }

    shell('<p class="mpf-note">Loading current prices from the website…</p>');
    fetch(API + FILE, { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github.v3+json' } })
      .then(function (r) { if (!r.ok) throw new Error('GitHub returned ' + r.status); return r.json(); })
      .then(function (d) {
        sha = d.sha;
        source = decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))));
        loaded = true;
        renderForm();
      })
      .catch(function (e) {
        shell('<div class="mpf-warn-box"><strong>Could not load the prices.</strong> ' + MPF.esc(e.message) +
          '<br>Check the GitHub token in Settings is still valid.</div>' +
          '<button class="mpf-mini" data-act="pricing-reload">Try again</button>');
      });
  }

  function save() {
    if (!loaded) return;
    var parts = sections(source);
    if (!parts) return;

    var bad = null;
    FIELDS.forEach(function (f, i) {
      var el = document.getElementById('pr-' + i);
      var n = parseFloat(el.value);
      if (isNaN(n) || n < 0) { bad = f[2]; return; }
      writeValue(parts, f, n);
    });
    if (bad) { status(bad + ' must be a number of zero or more.', 'error'); return; }

    BREAKS.forEach(function (b, i) {
      var n = parseInt(document.getElementById('pr-b' + i).value, 10);
      if (!isNaN(n) && n >= 0 && n < 90) writeBreak(parts, b, n);
    });

    var updated = parts.head + parts.carton + parts.nylon + parts.tail;
    status('Saving…', 'loading');

    fetch(API + FILE, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + token(),
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Admin panel: update calculator pricing',
        content: btoa(unescape(encodeURIComponent(updated))),
        sha: sha,
        committer: { name: 'Mimshak Admin', email: 'admin@mimshakpak.com' }
      })
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || r.status); return j; }); })
      .then(function (j) {
        sha = j.content.sha;
        source = updated;
        status('Saved. The website calculator updates in about a minute.', 'success');
      })
      .catch(function (e) { status('Save failed: ' + e.message, 'error'); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.getAttribute('data-act') === 'pricing-save') save();
    if (b.getAttribute('data-act') === 'pricing-reload') load(true);
  });

  /* hook into section switching */
  var prevBoot = MPF.boot;
  MPF.boot = function () {
    prevBoot.apply(this, arguments);
    var prevOn = MPF.onSection;
    MPF.onSection = function (name) {
      prevOn(name);
      if (name === 'pricing') load(false);
    };
  };

})();
