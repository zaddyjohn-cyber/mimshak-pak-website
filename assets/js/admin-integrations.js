/* =================================================================
   Mimshak Pak — outside services settings
   Edits assets/js/integrations.js through the GitHub API so the owner
   can connect Paystack, Cloudinary and EmailJS without touching code.
   ================================================================= */
(function () {
  "use strict";

  var MPF = window.MPF;
  if (!MPF) return;

  var FILE = 'assets/js/integrations.js';
  var API = 'https://api.github.com/repos/zaddyjohn-cyber/mimshak-pak-website/contents/';

  var sha = '', source = '', loaded = false;

  /* [key, section, label, help, placeholder, isSecretCheck] */
  var FIELDS = [
    ['publicKey', 'paystack', 'Paystack public key',
     'Paystack dashboard > Settings > API Keys & Webhooks. Use the live key once your account is approved.',
     'pk_live_... or pk_test_...', true],

    ['cloudName', 'cloudinary', 'Cloudinary cloud name',
     'Shown on your Cloudinary dashboard as "Cloud name".', 'e.g. mimshakpak', false],
    ['uploadPreset', 'cloudinary', 'Upload preset name',
     'Cloudinary > Settings > Upload > Add upload preset. Set it to UNSIGNED, otherwise customers cannot upload.',
     'e.g. mimshak_artwork', false],
    ['maxFileMb', 'cloudinary', 'Largest file allowed (MB)',
     'Design files are big. 15 MB suits most artwork.', '15', false],

    ['publicKey', 'emailjs', 'EmailJS public key',
     'EmailJS dashboard > Account > General.', 'e.g. AbC123...', false],
    ['serviceId', 'emailjs', 'EmailJS service ID',
     'The email account you connected, under Email Services.', 'e.g. service_ab12cd', false],
    ['templateId', 'emailjs', 'EmailJS template ID',
     'Under Email Templates. The template must accept: to_email, to_name, subject, message.',
     'e.g. template_xy34z', false]
  ];

  var GROUPS = [
    ['paystack', 'Paystack — taking payments online',
     'Lets customers pay by card, transfer or USSD from an invoice link.'],
    ['cloudinary', 'Cloudinary — customers sending artwork',
     'Lets customers attach their logo or design to a quote request instead of emailing it separately.'],
    ['emailjs', 'EmailJS — emailing order updates',
     'Lets you email a customer when their order moves stage, without opening your mail app.']
  ];

  function token() { return localStorage.getItem('mpk_gh_token') || ''; }
  function esc(s) { return MPF.esc(s); }

  /* ---------- parsing ---------- */
  function sections(src) {
    var a = src.indexOf('paystack:'),
        b = src.indexOf('cloudinary:'),
        c = src.indexOf('emailjs:'),
        d = src.indexOf('window.MPI_READY');
    if (a < 0 || b < 0 || c < 0 || d < 0) return null;
    return {
      head: src.slice(0, a),
      paystack: src.slice(a, b),
      cloudinary: src.slice(b, c),
      emailjs: src.slice(c, d),
      tail: src.slice(d)
    };
  }

  function strRe(key) { return new RegExp('(\\b' + key + '\\s*:\\s*")([^"]*)(")'); }
  function numRe(key) { return new RegExp('(\\b' + key + '\\s*:\\s*)(\\d+)'); }

  function read(parts, f) {
    var chunk = parts[f[1]];
    var m = chunk.match(strRe(f[0]));
    if (m) return m[2];
    m = chunk.match(numRe(f[0]));
    return m ? m[2] : '';
  }

  function write(parts, f, value) {
    var chunk = parts[f[1]];
    if (strRe(f[0]).test(chunk)) {
      parts[f[1]] = chunk.replace(strRe(f[0]), '$1' + String(value).replace(/"/g, '') + '$3');
    } else if (numRe(f[0]).test(chunk)) {
      parts[f[1]] = chunk.replace(numRe(f[0]), '$1' + (parseInt(value, 10) || 0));
    }
  }

  /* ---------- rendering ---------- */
  function host(h) { document.getElementById('mpf-integrations').innerHTML = h; }

  function renderLocked() {
    host('<div class="mpf-warn-box"><strong>GitHub access needed.</strong> Connecting a service saves a ' +
      'change to the live website, so the GitHub token must be set up first. Go to the ' +
      '<strong>Settings</strong> tab and follow the guide once.</div>' +
      '<button class="btn btn-ghost" onclick="switchSection(\'settings\')">Go to Settings</button>');
  }

  function statusOf(parts, name) {
    var need = FIELDS.filter(function (f) {
      return f[1] === name && f[0] !== 'maxFileMb';
    });
    var filled = need.filter(function (f) { return read(parts, f); });
    if (!filled.length) return ['off', 'Not connected'];
    if (filled.length < need.length) return ['part', 'Half set up — ' +
      (need.length - filled.length) + ' field(s) still empty'];
    return ['on', 'Connected'];
  }

  function renderForm() {
    var parts = sections(source);
    if (!parts) {
      host('<div class="mpf-warn-box"><strong>Could not read the settings file.</strong> ' +
        'Edit <code>assets/js/integrations.js</code> on GitHub directly.</div>');
      return;
    }

    var groups = GROUPS.map(function (g) {
      var st = statusOf(parts, g[0]);
      var badge = st[0] === 'on' ? MPF.badge('approved', st[1])
                : st[0] === 'part' ? MPF.badge('pending', st[1])
                : MPF.badge('quote', st[1]);

      var fields = FIELDS.filter(function (f) { return f[1] === g[0]; }).map(function (f) {
        var i = FIELDS.indexOf(f);
        var isNum = f[0] === 'maxFileMb';
        return '<div class="field"><label>' + esc(f[2]) + '</label>' +
          '<input type="' + (isNum ? 'number' : 'text') + '" id="in-' + i + '" ' +
            'value="' + esc(read(parts, f)) + '" placeholder="' + esc(f[4]) + '" ' +
            'autocomplete="off" spellcheck="false">' +
          '<div class="field-hint">' + esc(f[3]) + '</div></div>';
      }).join('');

      return '<div class="editor-form" style="margin-bottom:14px">' +
        '<h3 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
          esc(g[1]) + badge + '</h3>' +
        '<p class="mpf-note" style="margin:-8px 0 14px">' + esc(g[2]) + '</p>' +
        '<div class="form-row">' + fields + '</div></div>';
    }).join('');

    host(
      '<div class="mpf-bar">' +
        '<button class="mpf-mini" data-act="int-reload">Reload</button>' +
        '<button class="btn btn-primary" data-act="int-save" style="padding:7px 16px">Save settings</button>' +
        '<span class="editor-status" id="int-status"></span>' +
      '</div>' +
      '<div class="mpf-warn-box"><strong>Only ever paste the PUBLIC keys here.</strong> ' +
        'Anything these services call a <em>secret</em> key (Paystack’s starts with ' +
        '<code>sk_</code>) must never go in this panel. This file is part of the website and anyone ' +
        'can read it. A public key is designed for that; a secret key would let someone take money ' +
        'from your account.</div>' +
      groups
    );
  }

  function status(msg, kind) {
    var el = document.getElementById('int-status');
    if (el) { el.textContent = msg; el.className = 'editor-status' + (kind ? ' ' + kind : ''); }
  }

  /* ---------- load / save ---------- */
  function load(force) {
    if (!token()) { renderLocked(); return; }
    if (loaded && !force) { renderForm(); return; }

    host('<p class="mpf-note">Loading current settings…</p>');
    fetch(API + FILE, { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github.v3+json' } })
      .then(function (r) { if (!r.ok) throw new Error('GitHub returned ' + r.status); return r.json(); })
      .then(function (d) {
        sha = d.sha;
        source = decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))));
        loaded = true;
        renderForm();
      })
      .catch(function (e) {
        host('<div class="mpf-warn-box"><strong>Could not load the settings.</strong> ' +
          esc(e.message) + '</div><button class="mpf-mini" data-act="int-reload">Try again</button>');
      });
  }

  function save() {
    if (!loaded) return;
    var parts = sections(source);
    if (!parts) return;

    /* Refuse to publish anything that looks like a secret key. */
    for (var i = 0; i < FIELDS.length; i++) {
      var el = document.getElementById('in-' + i);
      if (!el) continue;
      var v = el.value.trim();
      if (FIELDS[i][5] && /^sk_/i.test(v)) {
        status('That is a SECRET key (it starts with sk_). Use the key starting pk_ instead — ' +
               'a secret key must never be put on the website.', 'error');
        el.focus();
        return;
      }
      write(parts, FIELDS[i], v);
    }

    var updated = parts.head + parts.paystack + parts.cloudinary + parts.emailjs + parts.tail;
    status('Saving…', 'loading');

    fetch(API + FILE, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + token(),
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Admin panel: update integration settings',
        content: btoa(unescape(encodeURIComponent(updated))),
        sha: sha,
        committer: { name: 'Mimshak Admin', email: 'admin@mimshakpak.com' }
      })
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || r.status); return j; }); })
      .then(function (j) {
        sha = j.content.sha;
        source = updated;
        renderForm();
        status('Saved. The website picks it up in about a minute.', 'success');
      })
      .catch(function (e) { status('Save failed: ' + e.message, 'error'); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.getAttribute('data-act') === 'int-save') save();
    if (b.getAttribute('data-act') === 'int-reload') load(true);
  });

  var prevBoot = MPF.boot;
  MPF.boot = function () {
    prevBoot.apply(this, arguments);
    var prevOn = MPF.onSection;
    MPF.onSection = function (name) {
      prevOn(name);
      if (name === 'integrations') load(false);
    };
  };

})();
