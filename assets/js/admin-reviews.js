/* =================================================================
   Mimshak Pak — Reviews manager
   Add, edit and remove customer reviews. Saves assets/js/reviews.js
   back to GitHub, which publishes them to the website.
   ================================================================= */
(function () {
  "use strict";

  var MPF = window.MPF;
  if (!MPF) return;

  var FILE = 'assets/js/reviews.js';
  var API = 'https://api.github.com/repos/zaddyjohn-cyber/mimshak-pak-website/contents/';
  var HEADER =
    '/* =================================================================\n' +
    '   Mimshak Pak — Customer reviews\n' +
    '   -----------------------------------------------------------------\n' +
    '   Managed from the admin panel under Finance > Reviews.\n' +
    '\n' +
    '   IMPORTANT: only enter reviews real customers actually gave you.\n' +
    '   These are published to Google as structured data. Inventing reviews\n' +
    '   breaks Google\'s rules and can get the whole site removed from search\n' +
    '   results, as well as being illegal advertising in Nigeria.\n' +
    '   ================================================================= */\n' +
    'window.MPI_REVIEWS = ';

  var PRODUCTS = ['Carton Printing', 'Custom Carton Packaging', 'Nylon Print Packaging',
                  'Industrial Packaging', 'Branded Product Packaging'];

  var sha = '', items = [], loaded = false;

  function token() { return localStorage.getItem('mpk_gh_token') || ''; }
  function esc(s) { return MPF.esc(s); }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }

  function starsHtml(n) {
    var o = '';
    for (var i = 1; i <= 5; i++) {
      o += '<span style="color:' + (i <= n ? '#f4a52a' : 'var(--ink-3)') + ';font-size:15px">★</span>';
    }
    return o;
  }

  /* ---------- rendering ---------- */
  function host(html) { document.getElementById('mpf-reviews').innerHTML = html; }

  function renderLocked() {
    host('<div class="mpf-warn-box"><strong>GitHub access needed.</strong> Publishing reviews saves a ' +
      'change to the live website, so the GitHub token must be set up first. Go to the ' +
      '<strong>Settings</strong> tab and follow the guide once.</div>' +
      '<button class="btn btn-ghost" onclick="switchSection(\'settings\')">Go to Settings</button>');
  }

  function render() {
    var rows = items.length ? items.map(function (r, i) {
      var who = [r.company, r.location].filter(Boolean).join(' • ');
      return '<tr>' +
        '<td style="max-width:340px">' +
          '<div>' + starsHtml(r.rating || 5) + '</div>' +
          '<div style="margin-top:4px;line-height:1.5">' + esc(r.text) + '</div></td>' +
        '<td><strong>' + esc(r.name) + '</strong>' +
          (who ? '<div style="font-size:11px;color:var(--ink-3);margin-top:2px">' + esc(who) + '</div>' : '') + '</td>' +
        '<td style="font-size:12px">' + esc(r.product || '—') + '</td>' +
        '<td class="num">' + (r.date ? MPF.date(r.date) : '—') + '</td>' +
        '<td><div style="display:flex;gap:5px">' +
          '<button class="mpf-mini" data-act="rev-edit" data-i="' + i + '">Edit</button>' +
          '<button class="mpf-mini danger" data-act="rev-del" data-i="' + i + '">Remove</button>' +
        '</div></td></tr>';
    }).join('') : '<tr><td colspan="5" class="mpf-empty">No reviews published yet. ' +
        'Ask a happy customer for a sentence or two, then add it here.</td></tr>';

    var avg = items.length
      ? (items.reduce(function (s, r) { return s + (Number(r.rating) || 5); }, 0) / items.length).toFixed(1)
      : '—';

    host(
      '<div class="mpf-bar">' +
        '<button class="mpf-mini go" data-act="rev-new">+ Add review</button>' +
        '<button class="mpf-mini" data-act="rev-reload">Reload</button>' +
        '<div class="spacer"></div>' +
        '<span class="mpf-note">' + items.length + ' review(s) · average ' + avg + ' stars</span>' +
        '<button class="btn btn-primary" data-act="rev-save" style="padding:7px 16px">Publish to website</button>' +
      '</div>' +
      '<span class="editor-status" id="rev-status" style="display:block;margin:-8px 0 14px"></span>' +
      '<div class="mpf-warn-box"><strong>Only add reviews a real customer actually gave you.</strong> ' +
        'These are sent to Google as verified ratings. Inventing them can get the website removed from ' +
        'Google results entirely, and is illegal advertising.</div>' +
      '<table class="mpf-table"><thead><tr>' +
        '<th>Review</th><th>Customer</th><th>Product</th><th>Date</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>'
    );
  }

  function status(msg, kind) {
    var el = document.getElementById('rev-status');
    if (el) { el.textContent = msg; el.className = 'editor-status' + (kind ? ' ' + kind : ''); }
  }

  /* ---------- add / edit ---------- */
  function form(r) {
    r = r || {};
    return '<div class="form-row">' +
        '<div class="field"><label>Customer name *</label><input type="text" id="rv-name" value="' + esc(r.name || '') + '" placeholder="e.g. Chinwe Okafor"></div>' +
        '<div class="field"><label>Business name</label><input type="text" id="rv-company" value="' + esc(r.company || '') + '" placeholder="e.g. Sunshine Bakery"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Town or city</label><input type="text" id="rv-location" value="' + esc(r.location || '') + '" placeholder="e.g. Asaba"></div>' +
        '<div class="field"><label>Rating *</label><select id="rv-rating">' +
          [5, 4, 3, 2, 1].map(function (n) {
            return '<option value="' + n + '"' + (Number(r.rating || 5) === n ? ' selected' : '') + '>' +
              n + ' star' + (n > 1 ? 's' : '') + '</option>';
          }).join('') + '</select></div>' +
      '</div>' +
      '<div class="field"><label>What they said *</label>' +
        '<textarea id="rv-text" rows="3" placeholder="Their own words, as they gave them">' + esc(r.text || '') + '</textarea>' +
        '<div class="field-hint">Keep it in the customer\'s own words. Do not edit it to sound better.</div></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Product supplied</label><select id="rv-product">' +
          '<option value="">Not specified</option>' +
          PRODUCTS.map(function (p) {
            return '<option value="' + esc(p) + '"' + (r.product === p ? ' selected' : '') + '>' + esc(p) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="field"><label>Date given</label><input type="date" id="rv-date" value="' +
          esc((r.date || MPF.ymd()).slice(0, 10)) + '"></div>' +
      '</div>' +
      '<div class="mpf-err" id="mpf-merr"></div>';
  }

  function collect() {
    var name = val('rv-name'), text = val('rv-text');
    if (!name) { MPF.modalError('Customer name is required.'); return null; }
    if (!text) { MPF.modalError('Enter what the customer actually said.'); return null; }
    return {
      name: name,
      company: val('rv-company'),
      location: val('rv-location'),
      rating: parseInt(val('rv-rating'), 10) || 5,
      text: text,
      date: val('rv-date'),
      product: val('rv-product')
    };
  }

  function openNew() {
    MPF.openModal('Add a review', form(), 'Add review', function () {
      var r = collect();
      if (!r) return;
      items.unshift(r);
      MPF.closeModal();
      render();
      status('Added. Click "Publish to website" to make it live.', 'warn');
    });
  }

  function openEdit(i) {
    MPF.openModal('Edit review', form(items[i]), 'Save changes', function () {
      var r = collect();
      if (!r) return;
      items[i] = r;
      MPF.closeModal();
      render();
      status('Changed. Click "Publish to website" to make it live.', 'warn');
    });
  }

  function remove(i) {
    var r = items[i];
    MPF.openModal('Remove review',
      '<div class="field"><label>Review</label><input type="text" disabled value="' +
        esc(r.name + ' — ' + r.text.slice(0, 60)) + '"></div>' +
      '<div class="mpf-note">This takes the review off the website when you next publish.</div>',
      'Remove', function () {
        items.splice(i, 1);
        MPF.closeModal();
        render();
        status('Removed. Click "Publish to website" to make it live.', 'warn');
      });
  }

  /* ---------- GitHub ---------- */
  function load(force) {
    if (!token()) { renderLocked(); return; }
    if (loaded && !force) { render(); return; }

    host('<p class="mpf-note">Loading reviews…</p>');
    fetch(API + FILE, { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github.v3+json' } })
      .then(function (r) { if (!r.ok) throw new Error('GitHub returned ' + r.status); return r.json(); })
      .then(function (d) {
        sha = d.sha;
        var src = decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))));
        var start = src.indexOf('[');
        var end = src.lastIndexOf(']');
        items = (start > -1 && end > start) ? JSON.parse(src.slice(start, end + 1)) : [];
        loaded = true;
        render();
      })
      .catch(function (e) {
        host('<div class="mpf-warn-box"><strong>Could not load reviews.</strong> ' + esc(e.message) + '</div>' +
          '<button class="mpf-mini" data-act="rev-reload">Try again</button>');
      });
  }

  function save() {
    if (!loaded) return;
    status('Publishing…', 'loading');
    var body = HEADER + JSON.stringify(items, null, 2) + ';\n';

    fetch(API + FILE, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + token(),
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Admin panel: update customer reviews',
        content: btoa(unescape(encodeURIComponent(body))),
        sha: sha,
        committer: { name: 'Mimshak Admin', email: 'admin@mimshakpak.com' }
      })
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || r.status); return j; }); })
      .then(function (j) {
        sha = j.content.sha;
        status('Published. The website shows them in about a minute.', 'success');
      })
      .catch(function (e) { status('Publish failed: ' + e.message, 'error'); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var a = b.getAttribute('data-act'), i = parseInt(b.getAttribute('data-i'), 10);
    if (a === 'rev-new') openNew();
    else if (a === 'rev-edit') openEdit(i);
    else if (a === 'rev-del') remove(i);
    else if (a === 'rev-save') save();
    else if (a === 'rev-reload') load(true);
  });

  var prevBoot = MPF.boot;
  MPF.boot = function () {
    prevBoot.apply(this, arguments);
    var prevOn = MPF.onSection;
    MPF.onSection = function (name) {
      prevOn(name);
      if (name === 'reviews') load(false);
    };
  };

})();
