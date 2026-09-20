/* =================================================================
   Mimshak Pak — emailing customers order updates
   Uses EmailJS, which sends from the browser. Stays completely hidden
   until the EmailJS keys are filled in under Integrations.

   Nothing is ever sent automatically. The owner reads the message and
   presses send, so a customer never gets a surprise email.
   ================================================================= */
(function () {
  "use strict";

  var MPF = window.MPF;
  if (!MPF) return;
  var DB = MPF.DB, K = MPF.K;

  var SDK = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
  var LOG_KEY = 'mpk_email_log';
  var sdkLoading = null;

  function cfg() { return (window.MPI_INTEGRATIONS || {}).emailjs || {}; }
  function ready() { var c = cfg(); return !!(c.publicKey && c.serviceId && c.templateId); }
  function esc(s) { return MPF.esc(s); }
  function log() { return DB.list(LOG_KEY); }

  function loadSDK() {
    if (window.emailjs) return Promise.resolve();
    if (sdkLoading) return sdkLoading;
    sdkLoading = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = SDK;
      s.onload = function () {
        try { window.emailjs.init({ publicKey: cfg().publicKey }); res(); }
        catch (e) { rej(e); }
      };
      s.onerror = function () { rej(new Error('Could not load the email service. Check your internet.')); };
      document.head.appendChild(s);
    });
    return sdkLoading;
  }

  /* ---------- message templates ---------- */
  var MESSAGES = {
    confirmed: function (o) {
      return { subject: 'Your order ' + o.invoiceNo + ' is confirmed',
        body: 'Thank you for confirming your order with Mimshak Pak Investments Ltd.\n\n' +
              'Order: ' + o.invoiceNo + '\nItems: ' + (o.items || []).length + '\n\n' +
              'We have scheduled it for production and will let you know as it progresses.' };
    },
    production: function (o) {
      return { subject: 'Your order ' + o.invoiceNo + ' is now in production',
        body: 'Good news — your packaging is now being produced.\n\n' +
              'Order: ' + o.invoiceNo + '\n\n' +
              'We will contact you again as soon as it is ready.' };
    },
    ready: function (o) {
      return { subject: 'Your order ' + o.invoiceNo + ' is ready',
        body: 'Your packaging is finished and ready.\n\n' +
              'Order: ' + o.invoiceNo + '\n\n' +
              'Please let us know when you would like to collect it, or whether you would like ' +
              'delivery arranged.' };
    },
    delivered: function (o) {
      return { subject: 'Your order ' + o.invoiceNo + ' has been delivered',
        body: 'Your order has been handed over.\n\n' +
              'Order: ' + o.invoiceNo + '\n\n' +
              'Thank you for your business. If anything is not right, please tell us straight away.' };
    },
    quote: function (o) {
      return { subject: 'Your quote ' + o.invoiceNo + ' from Mimshak Pak',
        body: 'Thank you for your enquiry.\n\n' +
              'We have prepared quote ' + o.invoiceNo + ' for you, total ' + MPF.naira(o.total) + '.\n\n' +
              'Let us know if you would like to go ahead, or if you need anything adjusted.' };
    }
  };

  /* The admin panel does not load main.js, so the contact details are read
     from it directly. Keeps the email footer in step with the website
     whenever the owner edits them under Edit Contact. */
  var contact = null;
  function loadContact() {
    if (contact) return Promise.resolve(contact);
    return fetch('assets/js/main.js', { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (src) {
        function pick(key) {
          var m = src.match(new RegExp(key + ':\\s*"((?:[^"\\\\]|\\\\.)*)"'));
          return m ? m[1] : '';
        }
        contact = {
          address: pick('address'),
          phoneDisplay: pick('phoneDisplay'),
          phone2Display: pick('phone2Display'),
          email: pick('email')
        };
        return contact;
      })
      .catch(function () {
        contact = {};
        return contact;
      });
  }

  function footer(C) {
    C = C || {};
    var lines = ['', '--', 'Mimshak Pak Investments Ltd.'];
    if (C.address) lines.push(C.address);
    var tel = [C.phoneDisplay, C.phone2Display].filter(Boolean).join('  |  ');
    if (tel) lines.push(tel);
    if (C.email) lines.push(C.email);
    lines.push('www.mimshakpak.com');
    return '\n' + lines.join('\n');
  }

  /* ---------- public entry ---------- */
  MPF.emailReady = ready;

  MPF.emailButton = function (order) {
    if (!ready() || !order.clientEmail) return '';
    return '<button class="mpf-mini" data-act="email-order" data-id="' + order.id + '">Email</button>';
  };

  MPF.openEmail = function (id) {
    var o = DB.list(K.ORDERS).filter(function (x) { return x.id === id; })[0];
    if (!o) return;

    if (!ready()) {
      MPF.openModal('Email not connected',
        '<div class="mpf-warn-box"><strong>EmailJS is not set up yet.</strong> Add the EmailJS keys ' +
        'under <strong>Integrations</strong> and you will be able to email customers from here.</div>',
        'Close', function () { MPF.closeModal(); });
      return;
    }
    if (!o.clientEmail) {
      MPF.openModal('No email address',
        '<div class="mpf-warn-box">This order has no email address on it, so there is nowhere to ' +
        'send to. Add one to the order first.</div>', 'Close', function () { MPF.closeModal(); });
      return;
    }

    var tpl = (MESSAGES[o.status] || MESSAGES.quote)(o);
    var sent = log().filter(function (e) { return e.orderId === id; });

    MPF.openModal('Email ' + esc(o.clientName),
      '<div class="form-row">' +
        '<div class="field"><label>To</label><input type="text" disabled value="' + esc(o.clientEmail) + '"></div>' +
        '<div class="field"><label>About</label><input type="text" disabled value="' +
          esc(o.invoiceNo + ' — ' + (MPF.ORDER_STATUS[o.status] || o.status)) + '"></div>' +
      '</div>' +
      '<div class="field"><label>Subject</label><input type="text" id="em-sub" value="' + esc(tpl.subject) + '"></div>' +
      '<div class="field"><label>Message</label>' +
        '<textarea id="em-body" rows="9">' + esc(tpl.body) + '</textarea>' +
        '<div class="field-hint">Your business name, address and phone number are added at the bottom ' +
        'automatically. Edit anything above before sending.</div></div>' +
      (sent.length
        ? '<div class="mpf-note">Already emailed about this order ' + sent.length + ' time(s). ' +
          'Last: ' + MPF.dateTime(sent[0].at) + '</div>'
        : '') +
      '<div class="mpf-err" id="mpf-merr"></div>',
      'Send email', function () { send(o); });
  };

  function send(o) {
    var sub = document.getElementById('em-sub').value.trim();
    var body = document.getElementById('em-body').value.trim();
    if (!sub)  return MPF.modalError('Give the email a subject.');
    if (!body) return MPF.modalError('The message is empty.');

    var btn = document.getElementById('mpf-mgo');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    MPF.modalError('');

    Promise.all([loadSDK(), loadContact()])
      .then(function (r) {
        var C = r[1] || {}, c = cfg();
        return window.emailjs.send(c.serviceId, c.templateId, {
          to_email: o.clientEmail,
          to_name: o.clientName,
          subject: sub,
          message: body + footer(C),
          reply_to: C.email || ''
        });
      })
      .then(function () {
        var l = log();
        l.unshift({ id: MPF.genId(), orderId: o.id, invoiceNo: o.invoiceNo,
                    to: o.clientEmail, subject: sub, at: MPF.now() });
        DB.save(LOG_KEY, l);
        MPF.closeModal();
        MPF.refreshAll();
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = 'Send email';
        var m = (e && (e.text || e.message)) || 'Unknown error';
        MPF.modalError('Could not send: ' + m + '. Check the EmailJS settings under Integrations.');
      });
  }

  /* ---------- history panel, shown inside Integrations ---------- */
  MPF.emailHistory = function () {
    var l = log();
    if (!l.length) return '';
    return '<div class="section-title" style="font-size:14px;margin:22px 0 12px">Emails sent</div>' +
      '<table class="mpf-table"><thead><tr><th>When</th><th>To</th><th>Order</th><th>Subject</th></tr></thead><tbody>' +
      l.slice(0, 20).map(function (e) {
        return '<tr><td class="num">' + MPF.dateTime(e.at) + '</td><td>' + esc(e.to) + '</td>' +
          '<td><span class="ref">' + esc(e.invoiceNo) + '</span></td><td>' + esc(e.subject) + '</td></tr>';
      }).join('') + '</tbody></table>';
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act="email-order"]');
    if (b) MPF.openEmail(b.getAttribute('data-id'));
  });

  var prevBoot = MPF.boot;
  MPF.boot = function () {
    prevBoot.apply(this, arguments);
    var prevOn = MPF.onSection;
    MPF.onSection = function (name) {
      prevOn(name);
      if (name === 'integrations') {
        var el = document.getElementById('mpf-email-log');
        if (el) el.innerHTML = MPF.emailHistory();
      }
    };
  };

})();
