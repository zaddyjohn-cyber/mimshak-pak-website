/* =================================================================
   Mimshak Pak — order tracking publisher
   Turns orders into a public tracking file customers can look up.
   Publishes data/tracking.json through the GitHub API.

   Only the minimum is published: a random code, the last 4 digits of
   the phone for verification, an abbreviated client name, a stage and
   its dates. No amounts, no addresses, no full phone numbers.
   ================================================================= */
(function () {
  "use strict";

  var MPF = window.MPF;
  if (!MPF) return;
  var DB = MPF.DB, K = MPF.K;

  var FILE = 'data/tracking.json';
  var API = 'https://api.github.com/repos/zaddyjohn-cyber/mimshak-pak-website/contents/';
  var TRACK_KEY = 'mpk_tracking';   // local map: orderId -> {code, eta, phone4}

  var sha = null, loaded = false;

  function token() { return localStorage.getItem('mpk_gh_token') || ''; }
  function esc(s) { return MPF.esc(s); }
  function map() { return DB.obj(TRACK_KEY); }
  function saveMap(m) { DB.save(TRACK_KEY, m); }

  /* Codes avoid look-alike characters so they survive being read over
     the phone, and are random so they cannot be guessed in sequence. */
  function newCode() {
    var A = '23456789ACDEFGHJKLMNPQRTUVWXY', s = '';
    for (var i = 0; i < 4; i++) s += A.charAt(Math.floor(Math.random() * A.length));
    var existing = map();
    var taken = Object.keys(existing).some(function (k) { return existing[k].code === 'MP-' + s; });
    return taken ? newCode() : 'MP-' + s;
  }

  function last4(phone) {
    var d = String(phone || '').replace(/\D/g, '');
    return d.length >= 4 ? d.slice(-4) : '';
  }

  /* "Acme Foods Ltd" -> "Acme F." so a guessed code leaks as little as possible */
  function shortName(n) {
    var parts = String(n || '').trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return parts[0] + ' ' + parts[1].charAt(0).toUpperCase() + '.';
  }

  function trackedOrders() {
    var m = map();
    return DB.list(K.ORDERS).filter(function (o) { return m[o.id]; });
  }

  function buildPayload() {
    var m = map();
    return {
      updated: MPF.now(),
      orders: trackedOrders().map(function (o) {
        var t = m[o.id];
        var n = (o.items || []).length;
        return {
          code: t.code,
          phone4: t.phone4,
          client: shortName(o.clientName),
          summary: n + ' item' + (n === 1 ? '' : 's'),
          status: o.status,
          history: (t.history || []),
          eta: t.eta || ''
        };
      })
    };
  }

  /* Record the date a stage was first reached, so the timeline is honest. */
  function stampHistory() {
    var m = map(), changed = false;
    DB.list(K.ORDERS).forEach(function (o) {
      var t = m[o.id];
      if (!t) return;
      t.history = t.history || [];
      var seen = t.history.some(function (h) { return h.status === o.status; });
      if (!seen) { t.history.push({ status: o.status, at: MPF.now() }); changed = true; }
    });
    if (changed) saveMap(m);
  }

  /* ---------- rendering ---------- */
  function host(h) { document.getElementById('mpf-tracking').innerHTML = h; }

  function render() {
    stampHistory();
    var m = map();
    var orders = DB.list(K.ORDERS);

    if (!orders.length) {
      host('<div class="mpf-warn-box">No orders yet. Create an order first, then you can give the ' +
        'customer a tracking code for it.</div>');
      return;
    }

    var rows = orders.map(function (o) {
      var t = m[o.id];
      var p4 = last4(o.clientPhone);
      return '<tr>' +
        '<td><span class="ref">' + esc(o.invoiceNo) + '</span>' +
          '<div style="font-size:11px;color:var(--ink-3);margin-top:2px">' + esc(o.clientName) + '</div></td>' +
        '<td>' + (t
          ? '<span class="ref" style="font-size:14px">' + esc(t.code) + '</span>' +
            '<div style="font-size:11px;color:var(--ink-3);margin-top:2px">verify with …' + esc(t.phone4) + '</div>'
          : '<span style="color:var(--ink-3);font-size:12px">Not shared</span>') + '</td>' +
        '<td>' + MPF.statusBadge(o.status) + '</td>' +
        '<td>' + (t && t.eta ? MPF.date(t.eta) : '<span style="color:var(--ink-3)">—</span>') + '</td>' +
        '<td><div style="display:flex;gap:5px;flex-wrap:wrap">' +
          (t
            ? '<button class="mpf-mini" data-act="tk-send" data-id="' + o.id + '">Send to customer</button>' +
              '<button class="mpf-mini" data-act="tk-eta" data-id="' + o.id + '">Set date</button>' +
              '<button class="mpf-mini danger" data-act="tk-stop" data-id="' + o.id + '">Stop</button>'
            : (p4
                ? '<button class="mpf-mini go" data-act="tk-start" data-id="' + o.id + '">Create code</button>'
                : '<span style="font-size:11px;color:var(--warn)">Needs a phone number on the order</span>')) +
        '</div></td></tr>';
    }).join('');

    var count = trackedOrders().length;

    host(
      '<div class="mpf-bar">' +
        '<button class="btn btn-primary" data-act="tk-publish" style="padding:7px 16px">Publish tracking</button>' +
        '<div class="spacer"></div>' +
        '<span class="mpf-note">' + count + ' order(s) trackable</span>' +
      '</div>' +
      '<span class="editor-status" id="tk-status" style="display:block;margin:-8px 0 14px"></span>' +
      '<div class="mpf-warn-box"><strong>Publish after any change.</strong> Creating a code, changing an ' +
        'order’s status or setting a date only reaches the website when you click ' +
        '<strong>Publish tracking</strong>. It goes live about a minute later.<br><br>' +
        'Customers see only the stage, the dates and a shortened name — never prices, addresses or ' +
        'full phone numbers.</div>' +
      '<table class="mpf-table"><thead><tr>' +
        '<th>Order</th><th>Tracking code</th><th>Stage</th><th>Expected ready</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>'
    );
  }

  function status(msg, kind) {
    var el = document.getElementById('tk-status');
    if (el) { el.textContent = msg; el.className = 'editor-status' + (kind ? ' ' + kind : ''); }
  }

  /* ---------- actions ---------- */
  function start(id) {
    var o = DB.list(K.ORDERS).filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    var p4 = last4(o.clientPhone);
    if (!p4) return;

    var m = map();
    m[id] = { code: newCode(), phone4: p4, eta: '', history: [{ status: o.status, at: MPF.now() }] };
    saveMap(m);
    render();
    status('Code created. Click "Publish tracking" to make it work, then send it to the customer.', 'warn');
  }

  function stop(id) {
    var m = map(), t = m[id];
    if (!t) return;
    MPF.openModal('Stop tracking ' + t.code,
      '<div class="mpf-note">The customer will no longer be able to look this order up. ' +
      'You can create a new code later, but it will be a different one.</div>',
      'Stop tracking', function () {
        var mm = map();
        delete mm[id];
        saveMap(mm);
        MPF.closeModal();
        render();
        status('Removed. Click "Publish tracking" to take it off the website.', 'warn');
      });
  }

  function setEta(id) {
    var m = map(), t = m[id];
    if (!t) return;
    MPF.openModal('Expected ready date',
      '<div class="field"><label>When do you expect this to be ready?</label>' +
        '<input type="date" id="tk-date" value="' + esc((t.eta || '').slice(0, 10)) + '"></div>' +
      '<div class="mpf-note">Shown to the customer on the tracking page. Leave it empty to show nothing.</div>',
      'Save', function () {
        var mm = map();
        mm[id].eta = document.getElementById('tk-date').value || '';
        saveMap(mm);
        MPF.closeModal();
        render();
        status('Saved. Click "Publish tracking" to update the website.', 'warn');
      });
  }

  function send(id) {
    var o = DB.list(K.ORDERS).filter(function (x) { return x.id === id; })[0];
    var t = map()[id];
    if (!o || !t) return;

    var text = 'Hello ' + o.clientName + ', your order with Mimshak Pak is ' + t.code + '.\n\n' +
      'You can check its progress any time at:\n' +
      'https://www.mimshakpak.com/track-order.html\n\n' +
      'Enter the code ' + t.code + ' and the last 4 digits of your phone number (' + t.phone4 + ').';

    var wa = o.clientPhone
      ? 'https://wa.me/' + String(o.clientPhone).replace(/\D/g, '').replace(/^0/, '234') +
        '?text=' + encodeURIComponent(text)
      : '';

    MPF.openModal('Send tracking code to ' + o.clientName,
      '<div class="field"><label>Message</label><textarea id="tk-txt" rows="7" readonly>' + esc(text) + '</textarea></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (wa ? '<a class="btn btn-primary" href="' + esc(wa) + '" target="_blank" rel="noopener" style="text-decoration:none;padding:8px 16px">Open in WhatsApp</a>' : '') +
        '<button class="btn btn-ghost" id="tk-copy" type="button">Copy message</button>' +
      '</div>' +
      '<div class="mpf-note" id="tk-copied" style="margin-top:10px"></div>',
      'Done', function () { MPF.closeModal(); });

    var c = document.getElementById('tk-copy');
    if (c) c.addEventListener('click', function () {
      var ta = document.getElementById('tk-txt');
      ta.removeAttribute('readonly'); ta.select();
      try { document.execCommand('copy'); document.getElementById('tk-copied').textContent = 'Copied.'; }
      catch (e) { document.getElementById('tk-copied').textContent = 'Select the text above and copy it.'; }
      ta.setAttribute('readonly', '');
    });
  }

  /* ---------- publish ---------- */
  function loadSha() {
    return fetch(API + FILE, { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github.v3+json' } })
      .then(function (r) {
        if (r.status === 404) return null;            // file not created yet
        if (!r.ok) throw new Error('GitHub returned ' + r.status);
        return r.json().then(function (d) { return d.sha; });
      });
  }

  function publish() {
    if (!token()) { status('Set up the GitHub token in Settings first.', 'error'); return; }
    status('Publishing…', 'loading');
    stampHistory();

    var body = JSON.stringify(buildPayload(), null, 2) + '\n';

    loadSha().then(function (s) {
      var payload = {
        message: 'Admin panel: update order tracking',
        content: btoa(unescape(encodeURIComponent(body))),
        committer: { name: 'Mimshak Admin', email: 'admin@mimshakpak.com' }
      };
      if (s) payload.sha = s;

      return fetch(API + FILE, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token(),
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
      });
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || r.status); return j; }); })
      .then(function () {
        loaded = true;
        status('Published. Customers can look it up in about a minute.', 'success');
      })
      .catch(function (e) { status('Publish failed: ' + e.message, 'error'); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (a === 'tk-start') start(id);
    else if (a === 'tk-stop') stop(id);
    else if (a === 'tk-eta') setEta(id);
    else if (a === 'tk-send') send(id);
    else if (a === 'tk-publish') publish();
  });

  var prevBoot = MPF.boot;
  MPF.boot = function () {
    prevBoot.apply(this, arguments);
    var prevOn = MPF.onSection;
    MPF.onSection = function (name) {
      prevOn(name);
      if (name === 'tracking') render();
    };
  };

})();
