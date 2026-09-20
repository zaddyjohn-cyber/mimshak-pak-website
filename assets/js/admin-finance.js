/* =================================================================
   Mimshak Pak — Owner Finance System (Part 1: core)
   Data layer, styles, section shells, modal engine.
   Loaded by admin.html. Namespace: window.MPF
   ================================================================= */
(function () {
  "use strict";

  var MPF = window.MPF = {};

  /* ---------------- Storage keys ---------------- */
  var K = MPF.K = {
    ORDERS:   'mpk_orders',
    PAYMENTS: 'mpk_payments',
    EXPENSES: 'mpk_expenses',
    META:     'mpk_meta',
    BANK:     'mpk_bank'
  };

  /* ---------------- Data layer ---------------- */
  var DB = MPF.DB = {
    list: function (key) {
      try { var v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; }
      catch (e) { return []; }
    },
    obj: function (key) {
      try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; }
      catch (e) { return {}; }
    },
    save: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; }
      catch (e) { alert('Could not save — browser storage may be full.'); return false; }
    },
    nextInvoice: function () {
      var m = this.obj(K.META);
      m.invoiceNo = (m.invoiceNo || 0) + 1;
      this.save(K.META, m);
      return 'INV-' + pad(m.invoiceNo);
    },
    nextReceipt: function () {
      var m = this.obj(K.META);
      m.receiptNo = (m.receiptNo || 0) + 1;
      this.save(K.META, m);
      return 'RCP-' + pad(m.receiptNo);
    }
  };

  function pad(n) { n = String(n); while (n.length < 4) n = '0' + n; return n; }
  MPF.pad = pad;

  /* ---------------- Helpers ---------------- */
  MPF.genId = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };
  MPF.now = function () { return new Date().toISOString(); };

  MPF.amt = function (n) {
    return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  MPF.naira = function (n) { return 'NGN ' + MPF.amt(n); };
  MPF.nairaShort = function (n) {
    var v = Number(n || 0);
    if (Math.abs(v) >= 1000000) return 'NGN ' + (v / 1000000).toFixed(1) + 'M';
    if (Math.abs(v) >= 10000)   return 'NGN ' + Math.round(v / 1000) + 'K';
    return 'NGN ' + Number(v).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  };

  MPF.date = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  MPF.dateShort = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };
  MPF.dateTime = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return MPF.date(iso) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  MPF.ymd = function (d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1), day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + m + '-' + day;
  };

  MPF.isToday = function (iso) {
    if (!iso) return false;
    return new Date(iso).toDateString() === new Date().toDateString();
  };
  MPF.isThisMonth = function (iso) {
    if (!iso) return false;
    var d = new Date(iso), t = new Date();
    return d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };
  MPF.inRange = function (iso, from, to) {
    if (!iso) return false;
    var d = new Date(iso);
    return d >= new Date(from + 'T00:00:00') && d <= new Date(to + 'T23:59:59');
  };

  MPF.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ---------------- Derived figures ---------------- */
  MPF.livePayments = function () {
    return DB.list(K.PAYMENTS).filter(function (p) { return !p.voided; });
  };
  MPF.sum = function (arr, field) {
    return arr.reduce(function (s, x) { return s + (Number(x[field]) || 0); }, 0);
  };
  MPF.paidOn = function (invoiceNo) {
    if (!invoiceNo) return 0;
    return MPF.sum(MPF.livePayments().filter(function (p) { return p.invoiceNo === invoiceNo; }), 'amount');
  };
  MPF.payState = function (order) {
    var paid = MPF.paidOn(order.invoiceNo);
    if (paid <= 0) return 'unpaid';
    if (paid + 0.01 >= Number(order.total)) return 'paid';
    return 'partial';
  };
  MPF.outstanding = function () {
    var total = 0;
    DB.list(K.ORDERS).forEach(function (o) {
      if (o.status === 'cancelled' || o.status === 'quote') return;
      var due = Number(o.total) - MPF.paidOn(o.invoiceNo);
      if (due > 0) total += due;
    });
    return total;
  };
  MPF.approvedExpenses = function (filterFn) {
    var list = DB.list(K.EXPENSES).filter(function (e) { return e.status === 'approved'; });
    if (filterFn) list = list.filter(filterFn);
    return MPF.sum(list, 'amount');
  };

  /* Receipt sequence audit — finds gaps in RCP numbering */
  MPF.receiptAudit = function () {
    var nums = DB.list(K.PAYMENTS).map(function (p) {
      var m = String(p.receiptNo || '').match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : null;
    }).filter(function (n) { return n !== null; }).sort(function (a, b) { return a - b; });

    if (!nums.length) return { count: 0, gaps: [], first: null, last: null, voided: 0 };

    var gaps = [], i;
    for (i = nums[0]; i <= nums[nums.length - 1]; i++) {
      if (nums.indexOf(i) === -1) gaps.push('RCP-' + pad(i));
    }
    var expectedNext = (DB.obj(K.META).receiptNo || 0);
    for (i = nums[nums.length - 1] + 1; i <= expectedNext; i++) {
      if (nums.indexOf(i) === -1) gaps.push('RCP-' + pad(i));
    }
    return {
      count: nums.length,
      gaps: gaps,
      first: 'RCP-' + pad(nums[0]),
      last: 'RCP-' + pad(nums[nums.length - 1]),
      voided: DB.list(K.PAYMENTS).filter(function (p) { return p.voided; }).length
    };
  };

  /* ---------------- Labels ---------------- */
  MPF.ORDER_STATUS = {
    quote:     'Quote',
    confirmed: 'Confirmed',
    production:'In production',
    ready:     'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };
  MPF.PAY_TYPE = { cash: 'Cash', transfer: 'Bank transfer', paystack: 'Paystack' };
  MPF.EXP_CAT = {
    materials:  'Materials',
    utilities:  'Utilities / fuel',
    transport:  'Transport',
    salaries:   'Salaries / wages',
    maintenance:'Maintenance',
    rent:       'Rent',
    other:      'Other'
  };

  MPF.badge = function (cls, text) {
    return '<span class="mpf-badge b-' + cls + '">' + MPF.esc(text) + '</span>';
  };
  MPF.statusBadge = function (s) { return MPF.badge(s, MPF.ORDER_STATUS[s] || s); };
  MPF.payBadge = function (s) {
    return MPF.badge(s, s === 'paid' ? 'Paid' : s === 'partial' ? 'Part paid' : 'Unpaid');
  };

  /* ---------------- Styles ---------------- */
  var CSS = [
    '.mpf-badge{display:inline-block;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap;line-height:1.4}',
    '.b-quote{background:rgba(120,110,100,.18);color:var(--ink-2)}',
    '.b-confirmed{background:rgba(74,144,217,.16);color:#5b9ee0}',
    '.b-production{background:rgba(232,115,26,.16);color:var(--accent)}',
    '.b-ready{background:rgba(61,158,110,.18);color:var(--success)}',
    '.b-delivered{background:rgba(61,158,110,.28);color:var(--success)}',
    '.b-cancelled{background:rgba(232,92,58,.14);color:var(--danger)}',
    '.b-paid{background:rgba(61,158,110,.2);color:var(--success)}',
    '.b-partial{background:rgba(212,160,23,.18);color:var(--warn)}',
    '.b-unpaid{background:rgba(232,92,58,.12);color:var(--danger)}',
    '.b-cash{background:rgba(61,158,110,.14);color:var(--success)}',
    '.b-transfer{background:rgba(74,144,217,.14);color:#5b9ee0}',
    '.b-paystack{background:rgba(140,108,215,.16);color:#9b7de0}',
    '.b-pending{background:rgba(212,160,23,.16);color:var(--warn)}',
    '.b-approved{background:rgba(61,158,110,.18);color:var(--success)}',
    '.b-rejected{background:rgba(232,92,58,.14);color:var(--danger)}',
    '.b-void{background:rgba(120,110,100,.18);color:var(--ink-3)}',

    '.mpf-table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);margin-bottom:18px}',
    '.mpf-table th{text-align:left;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);padding:10px 14px;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap}',
    '.mpf-table td{padding:11px 14px;border-bottom:1px solid var(--border);font-size:13px;color:var(--ink);vertical-align:middle}',
    '.mpf-table tr:last-child td{border-bottom:none}',
    '.mpf-table tbody tr:hover td{background:var(--surface2)}',
    '.mpf-table .num{font-family:Consolas,"Courier New",monospace;font-size:12.5px;white-space:nowrap}',
    '.mpf-table .ref{font-family:Consolas,"Courier New",monospace;font-size:12px;font-weight:600;color:var(--accent)}',
    '.mpf-table tr.voided td{opacity:.42}',
    '.mpf-table tr.voided td .num,.mpf-table tr.voided td .ref{text-decoration:line-through}',
    '.mpf-empty{text-align:center;color:var(--ink-3);font-style:italic;padding:34px 14px;font-size:13px}',

    '.mpf-bar{display:flex;align-items:center;gap:8px;margin-bottom:18px;flex-wrap:wrap}',
    '.mpf-bar .spacer{margin-left:auto}',
    '.mpf-mini{padding:5px 11px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer;font-family:var(--font);background:var(--surface2);color:var(--ink);border:1px solid var(--border);white-space:nowrap}',
    '.mpf-mini:hover{border-color:var(--ink-2)}',
    '.mpf-mini.danger:hover{border-color:var(--danger);color:var(--danger)}',
    '.mpf-mini.go{background:var(--accent);color:#fff;border-color:var(--accent)}',
    '.mpf-mini.go:hover{background:var(--accent-d)}',
    '.mpf-mini.ok{border-color:rgba(61,158,110,.45);color:var(--success)}',
    '.mpf-mini.ok:hover{background:rgba(61,158,110,.1)}',
    '.mpf-mini.no{border-color:rgba(232,92,58,.35);color:var(--danger)}',
    '.mpf-mini.no:hover{background:rgba(232,92,58,.1)}',

    '.mpf-tabs{display:flex;gap:2px;margin-bottom:16px;background:var(--surface2);border-radius:var(--radius);padding:3px;width:fit-content;flex-wrap:wrap}',
    '.mpf-tab{padding:6px 14px;border:none;background:transparent;border-radius:5px;font-size:12px;font-weight:600;color:var(--ink-2);cursor:pointer;font-family:var(--font)}',
    '.mpf-tab.active{background:var(--surface);color:var(--ink)}',

    '.mpf-audit{border-radius:var(--radius);padding:13px 16px;font-size:12.5px;line-height:1.6;margin-bottom:18px;border:1px solid}',
    '.mpf-audit.clean{background:rgba(61,158,110,.07);border-color:rgba(61,158,110,.3);color:var(--ink-2)}',
    '.mpf-audit.alert{background:rgba(232,92,58,.08);border-color:rgba(232,92,58,.35);color:var(--ink-2)}',
    '.mpf-audit strong{color:var(--ink)}',
    '.mpf-audit .flag{color:var(--danger);font-weight:700}',
    '.mpf-audit .good{color:var(--success);font-weight:700}',

    '.mpf-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;z-index:2000;padding:20px}',
    '.mpf-overlay.open{display:flex}',
    '.mpf-modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;width:100%;max-width:660px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 12px 48px rgba(0,0,0,.5)}',
    '.mpf-mhead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0}',
    '.mpf-mhead h3{font-size:15px;font-weight:600;color:var(--ink)}',
    '.mpf-x{width:28px;height:28px;background:transparent;border:none;cursor:pointer;color:var(--ink-2);font-size:20px;line-height:1;border-radius:5px;font-family:var(--font)}',
    '.mpf-x:hover{background:var(--surface2);color:var(--ink)}',
    '.mpf-mbody{padding:20px;overflow-y:auto;flex:1}',
    '.mpf-mfoot{padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0}',
    '.mpf-err{color:var(--danger);font-size:12px;margin-top:10px;min-height:16px;font-weight:500}',

    '.mpf-items{width:100%;border-collapse:collapse;font-size:13px}',
    '.mpf-items th{text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);padding:5px 5px;border-bottom:1px solid var(--border)}',
    '.mpf-items td{padding:5px 4px;vertical-align:middle}',
    '.mpf-items input{width:100%;padding:7px 9px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;color:var(--ink);font-size:13px;font-family:var(--font);outline:none}',
    '.mpf-items input:focus{border-color:var(--accent)}',
    '.mpf-items .rowamt{text-align:right;font-family:Consolas,monospace;font-size:12.5px;white-space:nowrap;color:var(--ink-2);padding-right:6px}',
    '.mpf-items .rmrow{width:26px;height:26px;background:transparent;border:1px solid var(--border);border-radius:5px;cursor:pointer;color:var(--ink-3);font-size:15px;line-height:1;font-family:var(--font)}',
    '.mpf-items .rmrow:hover{border-color:var(--danger);color:var(--danger)}',

    '.mpf-total{text-align:right;margin-top:12px;font-size:15px;font-weight:600;color:var(--ink)}',
    '.mpf-total span{color:var(--accent);font-family:Consolas,monospace}',
    '.mpf-note{font-size:11.5px;color:var(--ink-3);line-height:1.6;margin-top:8px}',
    '.mpf-warn-box{background:rgba(212,160,23,.08);border:1px solid rgba(212,160,23,.3);border-radius:var(--radius);padding:12px 14px;font-size:12px;color:var(--ink-2);line-height:1.6;margin-bottom:16px}',
    '.mpf-warn-box strong{color:var(--warn)}',
    '@media(max-width:700px){.mpf-table th:nth-child(n+5),.mpf-table td:nth-child(n+5){display:none}}'
  ].join('\n');

  function injectStyles() {
    var s = document.createElement('style');
    s.id = 'mpf-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------------- Nav + section shells ---------------- */
  var NAV = [
    ['finance',  'Dashboard', 'M3 17h3v-6H3v6zm5 0h3V7H8v10zm5 0h3v-8h-3v8zM2 3h16v1.5H2V3z'],
    ['orders',   'Orders',    'M6 2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm1 4h6v1.5H7V6zm0 3h6v1.5H7V9zm0 3h4v1.5H7V12z'],
    ['invoices', 'Invoices',  'M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1zm6 1.5V7h3.5L11 3.5zM6 9h8v1.5H6V9zm0 3h8v1.5H6V12zm0 3h5v1.5H6V15z'],
    ['payments', 'Payments',  'M2 5h16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1zm8 3a2 2 0 100 4 2 2 0 000-4zM3 7h2v6H3V7zm12 0h2v6h-2V7z'],
    ['expenses', 'Expenses',  'M5 2h10a1 1 0 011 1v15l-2-1.5L12 18l-2-1.5L8 18l-2-1.5L4 18V3a1 1 0 011-1zm2 4h6v1.5H7V6zm0 3h6v1.5H7V9zm0 3h4v1.5H7V12z'],
    ['reports',  'Reports',   'M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm2 9h2v3H6v-3zm3.5-4h2v7h-2V8zM13 5h2v10h-2V5z'],
    ['pricing',  'Pricing',   'M10 2H4a2 2 0 00-2 2v6l8 8 8-8-8-8zm-3.5 5A1.5 1.5 0 118 5.5 1.5 1.5 0 016.5 7z'],
    ['reviews',  'Reviews',   'M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z'],
    ['tracking', 'Tracking',  'M2 6h11v11H2zm11 3h4l3 4v4h-7zM6.5 18.5a1.6 1.6 0 110-3.2 1.6 1.6 0 010 3.2zm11 0a1.6 1.6 0 110-3.2 1.6 1.6 0 010 3.2z']
  ];

  function injectNav() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    var label = document.createElement('div');
    label.className = 'nav-label';
    label.style.marginTop = '10px';
    label.textContent = 'Finance';
    sidebar.appendChild(label);

    NAV.forEach(function (n) {
      var b = document.createElement('button');
      b.className = 'nav-item';
      b.setAttribute('data-section', n[0]);
      b.innerHTML = '<svg viewBox="0 0 20 20"><path d="' + n[2] + '"/></svg>' + n[1];
      b.addEventListener('click', function () {
        if (typeof window.switchSection === 'function') window.switchSection(n[0]);
      });
      sidebar.appendChild(b);
    });
  }

  var SHELLS = {
    finance: {
      title: 'Finance Dashboard',
      sub: 'Live money position — calculated by the system, not reported to you.',
      body:
        '<div class="card-grid" id="mpf-stats"></div>' +
        '<div class="mpf-bar">' +
          '<div class="section-title" style="font-size:14px;margin:0">Recent orders</div>' +
          '<div class="spacer"></div>' +
          '<button class="mpf-mini go" data-act="new-order">+ New order</button>' +
          '<button class="mpf-mini" data-act="new-payment">Log payment</button>' +
          '<button class="mpf-mini" data-act="new-expense">Add expense</button>' +
        '</div>' +
        '<div id="mpf-recent"></div>' +
        '<div id="mpf-dash-audit"></div>'
    },
    orders: {
      title: 'Orders',
      sub: 'Every order gets a locked invoice number. Orders are never deleted — only cancelled, and cancellations stay on record.',
      body:
        '<div class="mpf-bar">' +
          '<button class="mpf-mini go" data-act="new-order">+ New order</button>' +
          '<div class="spacer"></div>' +
          '<span class="mpf-note" id="mpf-orders-count"></span>' +
        '</div>' +
        '<div class="mpf-tabs" id="mpf-order-tabs">' +
          '<button class="mpf-tab active" data-f="all">All</button>' +
          '<button class="mpf-tab" data-f="quote">Quote</button>' +
          '<button class="mpf-tab" data-f="confirmed">Confirmed</button>' +
          '<button class="mpf-tab" data-f="production">In production</button>' +
          '<button class="mpf-tab" data-f="ready">Ready</button>' +
          '<button class="mpf-tab" data-f="delivered">Delivered</button>' +
        '</div>' +
        '<div id="mpf-orders"></div>'
    },
    invoices: {
      title: 'Invoices',
      sub: 'Download any invoice as a PDF. Payment status is worked out from the payment log automatically.',
      body:
        '<div id="mpf-bank-warn"></div>' +
        '<div class="mpf-tabs" id="mpf-inv-tabs">' +
          '<button class="mpf-tab active" data-f="all">All</button>' +
          '<button class="mpf-tab" data-f="unpaid">Unpaid</button>' +
          '<button class="mpf-tab" data-f="partial">Part paid</button>' +
          '<button class="mpf-tab" data-f="paid">Paid</button>' +
        '</div>' +
        '<div id="mpf-invoices"></div>'
    },
    payments: {
      title: 'Payments',
      sub: 'Every naira received, with a locked receipt number. Nothing here can be deleted — only voided, and voids keep the reason and timestamp.',
      body:
        '<div class="mpf-bar">' +
          '<button class="mpf-mini go" data-act="new-payment">+ Log payment</button>' +
          '<div class="spacer"></div>' +
          '<span class="mpf-note" id="mpf-pay-total"></span>' +
        '</div>' +
        '<div id="mpf-pay-audit"></div>' +
        '<div class="mpf-tabs" id="mpf-pay-tabs">' +
          '<button class="mpf-tab active" data-f="all">All</button>' +
          '<button class="mpf-tab" data-f="cash">Cash</button>' +
          '<button class="mpf-tab" data-f="transfer">Transfer</button>' +
          '<button class="mpf-tab" data-f="paystack">Paystack</button>' +
          '<button class="mpf-tab" data-f="voided">Voided</button>' +
        '</div>' +
        '<div id="mpf-payments"></div>'
    },
    expenses: {
      title: 'Expenses',
      sub: 'Expenses do not count against your profit until you approve them. Rejected expenses stay on record with the reason.',
      body:
        '<div class="mpf-bar">' +
          '<button class="mpf-mini go" data-act="new-expense">+ Submit expense</button>' +
          '<div class="spacer"></div>' +
          '<span class="mpf-note" id="mpf-exp-total"></span>' +
        '</div>' +
        '<div class="mpf-tabs" id="mpf-exp-tabs">' +
          '<button class="mpf-tab active" data-f="pending">Awaiting approval</button>' +
          '<button class="mpf-tab" data-f="approved">Approved</button>' +
          '<button class="mpf-tab" data-f="rejected">Rejected</button>' +
          '<button class="mpf-tab" data-f="all">All</button>' +
        '</div>' +
        '<div id="mpf-expenses"></div>'
    },
    reports: {
      title: 'Reports',
      sub: 'Pick any date range and see exactly what came in and what went out. Export to Excel to cross-check against anyone else\'s figures.',
      body:
        '<div class="mpf-bar">' +
          '<div class="field" style="margin:0"><label style="font-size:10px">From</label><input type="date" id="mpf-from" style="width:auto"></div>' +
          '<div class="field" style="margin:0"><label style="font-size:10px">To</label><input type="date" id="mpf-to" style="width:auto"></div>' +
          '<div style="padding-top:20px"><button class="mpf-mini go" data-act="run-report">Apply</button></div>' +
          '<div class="spacer"></div>' +
          '<div style="padding-top:20px"><button class="mpf-mini" data-act="export-csv">Export CSV</button></div>' +
        '</div>' +
        '<div class="card-grid" id="mpf-report-cards"></div>' +
        '<div id="mpf-report-audit"></div>' +
        '<div class="section-title" style="font-size:14px;margin-bottom:12px">Transactions in range</div>' +
        '<div id="mpf-report-tx"></div>'
    },
    pricing: {
      title: 'Calculator Pricing',
      sub: 'These are the figures the cost calculator on the website uses. Change them here and the website updates in about a minute.',
      body: '<div id="mpf-pricing"></div>'
    },
    tracking: {
      title: 'Order Tracking',
      sub: 'Give a customer a code so they can check their order themselves instead of calling. Only the stage and dates are published — never prices or addresses.',
      body: '<div id="mpf-tracking"></div>'
    },
    reviews: {
      title: 'Customer Reviews',
      sub: 'Reviews shown on the website and sent to Google as star ratings. Only publish reviews a real customer gave you.',
      body: '<div id="mpf-reviews"></div>'
    }
  };

  function injectSections() {
    var content = document.querySelector('.content');
    if (!content) return;
    Object.keys(SHELLS).forEach(function (key) {
      var s = SHELLS[key];
      var sec = document.createElement('section');
      sec.className = 'page-section';
      sec.id = 'sec-' + key;
      sec.innerHTML =
        '<div class="section-title">' + s.title + '</div>' +
        '<div class="section-sub">' + s.sub + '</div>' + s.body;
      content.appendChild(sec);
    });
  }

  /* ---------------- Modal engine ---------------- */
  var onSubmit = null;

  function injectModal() {
    var o = document.createElement('div');
    o.className = 'mpf-overlay';
    o.id = 'mpf-overlay';
    o.innerHTML =
      '<div class="mpf-modal">' +
        '<div class="mpf-mhead"><h3 id="mpf-mtitle"></h3><button class="mpf-x" id="mpf-mx">&times;</button></div>' +
        '<div class="mpf-mbody" id="mpf-mbody"></div>' +
        '<div class="mpf-mfoot">' +
          '<button class="btn btn-ghost" id="mpf-mcancel">Cancel</button>' +
          '<button class="btn btn-primary" id="mpf-mgo">Save</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(o);

    document.getElementById('mpf-mx').addEventListener('click', MPF.closeModal);
    document.getElementById('mpf-mcancel').addEventListener('click', MPF.closeModal);
    document.getElementById('mpf-mgo').addEventListener('click', function () {
      if (onSubmit) onSubmit();
    });
    o.addEventListener('click', function (e) { if (e.target === o) MPF.closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && o.classList.contains('open')) MPF.closeModal();
    });
  }

  MPF.openModal = function (title, bodyHTML, goLabel, handler) {
    document.getElementById('mpf-mtitle').textContent = title;
    document.getElementById('mpf-mbody').innerHTML = bodyHTML;
    document.getElementById('mpf-mgo').textContent = goLabel || 'Save';
    document.getElementById('mpf-overlay').classList.add('open');
    onSubmit = handler || null;
  };
  MPF.closeModal = function () {
    document.getElementById('mpf-overlay').classList.remove('open');
    document.getElementById('mpf-mbody').innerHTML = '';
    onSubmit = null;
  };
  MPF.modalError = function (msg) {
    var el = document.getElementById('mpf-merr');
    if (el) el.textContent = msg || '';
  };

  /* ---------------- Boot ---------------- */
  MPF.bootCore = function () {
    injectStyles();
    injectNav();
    injectSections();
    injectModal();
  };

})();
