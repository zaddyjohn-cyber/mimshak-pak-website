/* =================================================================
   Mimshak Pak — Owner Finance System (Part 2: rendering)
   Draws every finance section from stored data.
   ================================================================= */
(function () {
  "use strict";

  var MPF = window.MPF;
  if (!MPF) return;
  var DB = MPF.DB, K = MPF.K;

  /* filter state per section */
  var F = { orders: 'all', invoices: 'all', payments: 'all', expenses: 'pending' };
  MPF.filters = F;

  function table(headers, rows, emptyMsg) {
    if (!rows) rows = '';
    var head = headers.map(function (h) { return '<th>' + h + '</th>'; }).join('');
    var body = rows || '<tr><td colspan="' + headers.length + '" class="mpf-empty">' + MPF.esc(emptyMsg) + '</td></tr>';
    return '<table class="mpf-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function statCard(label, value, hint, colour) {
    return '<div class="card">' +
      '<div class="card-label">' + MPF.esc(label) + '</div>' +
      '<div class="card-value" style="font-size:19px' + (colour ? ';color:' + colour : '') + '">' + value + '</div>' +
      '<div class="card-hint">' + hint + '</div></div>';
  }

  /* ============ 1. Finance dashboard ============ */
  MPF.renderDashboard = function () {
    var live = MPF.livePayments();
    var revToday = MPF.sum(live.filter(function (p) { return MPF.isToday(p.createdAt); }), 'amount');
    var nToday = live.filter(function (p) { return MPF.isToday(p.createdAt); }).length;
    var revMonth = MPF.sum(live.filter(function (p) { return MPF.isThisMonth(p.createdAt); }), 'amount');
    var nMonth = live.filter(function (p) { return MPF.isThisMonth(p.createdAt); }).length;
    var expMonth = MPF.approvedExpenses(function (e) { return MPF.isThisMonth(e.submittedAt); });
    var profit = revMonth - expMonth;
    var out = MPF.outstanding();
    var unpaidCount = DB.list(K.ORDERS).filter(function (o) {
      return o.status !== 'cancelled' && o.status !== 'quote' && MPF.payState(o) !== 'paid';
    }).length;
    var pendingExp = DB.list(K.EXPENSES).filter(function (e) { return e.status === 'pending'; });

    document.getElementById('mpf-stats').innerHTML =
      statCard('Received today', MPF.naira(revToday), nToday + ' payment' + (nToday === 1 ? '' : 's') + ' logged', 'var(--success)') +
      statCard('Received this month', MPF.naira(revMonth), nMonth + ' payment' + (nMonth === 1 ? '' : 's'), 'var(--success)') +
      statCard('Outstanding', MPF.naira(out), unpaidCount + ' invoice' + (unpaidCount === 1 ? '' : 's') + ' not fully paid', out > 0 ? 'var(--danger)' : 'var(--ink-2)') +
      statCard('Net profit this month', MPF.naira(profit),
        'Received ' + MPF.nairaShort(revMonth) + ' − approved expenses ' + MPF.nairaShort(expMonth),
        profit >= 0 ? 'var(--accent)' : 'var(--danger)');

    var orders = DB.list(K.ORDERS).slice(0, 6);
    var rows = orders.map(function (o) {
      return '<tr>' +
        '<td><span class="ref">' + MPF.esc(o.invoiceNo) + '</span></td>' +
        '<td>' + MPF.esc(o.clientName) + '</td>' +
        '<td class="num">' + MPF.naira(o.total) + '</td>' +
        '<td>' + MPF.statusBadge(o.status) + '</td>' +
        '<td>' + MPF.payBadge(MPF.payState(o)) + '</td>' +
        '<td class="num">' + MPF.dateShort(o.createdAt) + '</td>' +
      '</tr>';
    }).join('');

    document.getElementById('mpf-recent').innerHTML =
      table(['Invoice', 'Client', 'Total', 'Status', 'Payment', 'Date'], rows,
        'No orders yet — click "New order" above to create the first one.');

    var notes = [];
    if (pendingExp.length) {
      notes.push('<div class="mpf-audit alert"><strong>' + pendingExp.length + ' expense' +
        (pendingExp.length === 1 ? '' : 's') + ' waiting for your approval</strong> — ' +
        MPF.naira(MPF.sum(pendingExp, 'amount')) + ' total. These do not count against profit until you approve them. ' +
        '<button class="mpf-mini" data-act="goto-expenses" style="margin-left:6px">Review now</button></div>');
    }
    var audit = MPF.receiptAudit();
    if (audit.gaps.length) {
      notes.push('<div class="mpf-audit alert"><span class="flag">Receipt gap detected.</span> Missing: <strong>' +
        audit.gaps.join(', ') + '</strong>. A receipt number was issued but no record exists — money may have been collected without being logged.</div>');
    }
    document.getElementById('mpf-dash-audit').innerHTML = notes.join('');
  };

  /* ============ 2. Orders ============ */
  MPF.renderOrders = function () {
    var all = DB.list(K.ORDERS);
    var list = F.orders === 'all' ? all : all.filter(function (o) { return o.status === F.orders; });

    var rows = list.map(function (o) {
      var nItems = (o.items || []).length;
      var cancelled = o.status === 'cancelled';
      return '<tr>' +
        '<td><span class="ref">' + MPF.esc(o.invoiceNo) + '</span></td>' +
        '<td>' + MPF.esc(o.clientName) +
          (o.clientPhone ? '<div style="font-size:11px;color:var(--ink-3)">' + MPF.esc(o.clientPhone) + '</div>' : '') + '</td>' +
        '<td class="num">' + nItems + ' item' + (nItems === 1 ? '' : 's') + '</td>' +
        '<td class="num">' + MPF.naira(o.total) + '</td>' +
        '<td>' + MPF.statusBadge(o.status) + '</td>' +
        '<td>' + MPF.payBadge(MPF.payState(o)) + '</td>' +
        '<td class="num">' + MPF.dateShort(o.createdAt) + '</td>' +
        '<td><div style="display:flex;gap:5px;flex-wrap:wrap">' +
          '<button class="mpf-mini" data-act="invoice" data-id="' + o.id + '">Invoice</button>' +
          (cancelled ? '' : '<button class="mpf-mini" data-act="order-status" data-id="' + o.id + '">Status</button>') +
          (MPF.emailButton ? MPF.emailButton(o) : '') +
        '</div></td>' +
      '</tr>';
    }).join('');

    document.getElementById('mpf-orders').innerHTML =
      table(['Invoice #', 'Client', 'Items', 'Total', 'Status', 'Payment', 'Date', ''], rows,
        F.orders === 'all' ? 'No orders yet.' : 'No orders with that status.');

    var totalValue = MPF.sum(all.filter(function (o) { return o.status !== 'cancelled'; }), 'total');
    document.getElementById('mpf-orders-count').textContent =
      all.length + ' order' + (all.length === 1 ? '' : 's') + ' · ' + MPF.naira(totalValue) + ' total value';
  };

  /* ============ 3. Invoices ============ */
  MPF.renderInvoices = function () {
    var bank = DB.obj(K.BANK);
    document.getElementById('mpf-bank-warn').innerHTML = bank.accountNo ? '' :
      '<div class="mpf-warn-box"><strong>Bank details not set.</strong> Invoices will print without payment instructions. ' +
      'Add your bank name and account number in <strong>Settings → Bank details for invoices</strong> so customers know where to pay.</div>';

    var all = DB.list(K.ORDERS).filter(function (o) { return o.status !== 'cancelled'; });
    var list = F.invoices === 'all' ? all : all.filter(function (o) { return MPF.payState(o) === F.invoices; });

    var rows = list.map(function (o) {
      var paid = MPF.paidOn(o.invoiceNo);
      var due = Number(o.total) - paid;
      return '<tr>' +
        '<td><span class="ref">' + MPF.esc(o.invoiceNo) + '</span></td>' +
        '<td>' + MPF.esc(o.clientName) + '</td>' +
        '<td class="num">' + MPF.naira(o.total) + '</td>' +
        '<td class="num" style="color:var(--success)">' + MPF.naira(paid) + '</td>' +
        '<td class="num" style="color:' + (due > 0 ? 'var(--danger)' : 'var(--ink-3)') + '">' + MPF.naira(due > 0 ? due : 0) + '</td>' +
        '<td>' + MPF.payBadge(MPF.payState(o)) + '</td>' +
        '<td class="num">' + MPF.dateShort(o.createdAt) + '</td>' +
        '<td><div style="display:flex;gap:5px">' +
          '<button class="mpf-mini go" data-act="invoice" data-id="' + o.id + '">Download PDF</button>' +
          (due > 0 ? '<button class="mpf-mini" data-act="pay-invoice" data-id="' + o.id + '">Log payment</button>' : '') +
        '</div></td>' +
      '</tr>';
    }).join('');

    document.getElementById('mpf-invoices').innerHTML =
      table(['Invoice #', 'Client', 'Total', 'Paid', 'Balance', 'Status', 'Date', ''], rows,
        'No invoices to show.');
  };

  /* ============ 4. Payments ============ */
  MPF.renderPayments = function () {
    var all = DB.list(K.PAYMENTS);
    var list;
    if (F.payments === 'all')          list = all.filter(function (p) { return !p.voided; });
    else if (F.payments === 'voided')  list = all.filter(function (p) { return p.voided; });
    else                               list = all.filter(function (p) { return !p.voided && p.type === F.payments; });

    var rows = list.map(function (p) {
      return '<tr class="' + (p.voided ? 'voided' : '') + '">' +
        '<td><span class="ref">' + MPF.esc(p.receiptNo) + '</span></td>' +
        '<td>' + MPF.badge(p.type, MPF.PAY_TYPE[p.type] || p.type) + '</td>' +
        '<td>' + MPF.esc(p.clientName) + '</td>' +
        '<td class="num" style="font-weight:600' + (p.voided ? '' : ';color:var(--success)') + '">' + MPF.naira(p.amount) + '</td>' +
        '<td class="num">' + (p.invoiceNo ? MPF.esc(p.invoiceNo) : '<span style="color:var(--ink-3)">—</span>') + '</td>' +
        '<td class="num" style="font-size:11px">' + (p.ref ? MPF.esc(p.ref) : '<span style="color:var(--ink-3)">—</span>') + '</td>' +
        '<td class="num">' + MPF.dateShort(p.createdAt) + '</td>' +
        '<td>' + (p.voided
          ? MPF.badge('void', 'Voided') + '<div style="font-size:10.5px;color:var(--ink-3);margin-top:3px;max-width:180px">' +
            MPF.esc(p.voidReason) + ' · ' + MPF.dateTime(p.voidedAt) + '</div>'
          : '<button class="mpf-mini danger" data-act="void-pay" data-id="' + p.id + '">Void</button>') + '</td>' +
      '</tr>';
    }).join('');

    document.getElementById('mpf-payments').innerHTML =
      table(['Receipt #', 'Type', 'Client', 'Amount', 'Invoice', 'Reference', 'Date', 'Status'], rows,
        F.payments === 'voided' ? 'No voided receipts — good.' : 'No payments logged yet.');

    var liveTotal = MPF.sum(all.filter(function (p) { return !p.voided; }), 'amount');
    document.getElementById('mpf-pay-total').textContent =
      all.filter(function (p) { return !p.voided; }).length + ' live receipt(s) · ' + MPF.naira(liveTotal) + ' received in total';

    /* receipt sequence audit */
    var a = MPF.receiptAudit();
    var el = document.getElementById('mpf-pay-audit');
    if (!a.count) { el.innerHTML = ''; return; }
    if (a.gaps.length) {
      el.innerHTML = '<div class="mpf-audit alert"><span class="flag">Receipt sequence broken.</span> ' +
        a.count + ' receipts recorded (' + a.first + ' → ' + a.last + '), but these numbers were issued and never recorded: <strong>' +
        a.gaps.join(', ') + '</strong>.<br>This means a receipt number was handed out and the record is gone. ' +
        'Ask who issued it and what happened to the money.</div>';
    } else {
      el.innerHTML = '<div class="mpf-audit clean"><span class="good">Receipt sequence intact.</span> ' +
        a.count + ' receipts, ' + a.first + ' → ' + a.last + ', no gaps. ' +
        (a.voided ? a.voided + ' voided (still on record with reason).' : 'None voided.') + '</div>';
    }
  };

  /* ============ 5. Expenses ============ */
  MPF.renderExpenses = function () {
    var all = DB.list(K.EXPENSES);
    var list = F.expenses === 'all' ? all : all.filter(function (e) { return e.status === F.expenses; });

    var rows = list.map(function (e) {
      var pending = e.status === 'pending';
      return '<tr>' +
        '<td><strong>' + MPF.esc(e.description) + '</strong>' +
          (e.note ? '<div style="font-size:11px;color:var(--ink-3);margin-top:2px">' + MPF.esc(e.note) + '</div>' : '') +
          (e.status === 'rejected' && e.rejectReason
            ? '<div style="font-size:11px;color:var(--danger);margin-top:3px">Rejected: ' + MPF.esc(e.rejectReason) + '</div>' : '') +
        '</td>' +
        '<td>' + MPF.esc(MPF.EXP_CAT[e.category] || e.category) + '</td>' +
        '<td>' + MPF.esc(e.submittedBy || '—') + '</td>' +
        '<td class="num" style="font-weight:600">' + MPF.naira(e.amount) + '</td>' +
        '<td class="num">' + MPF.dateShort(e.submittedAt) + '</td>' +
        '<td>' + MPF.badge(e.status, e.status === 'pending' ? 'Awaiting approval'
                        : e.status === 'approved' ? 'Approved' : 'Rejected') +
          (e.decidedAt ? '<div style="font-size:10.5px;color:var(--ink-3);margin-top:3px">' + MPF.dateTime(e.decidedAt) + '</div>' : '') +
        '</td>' +
        '<td>' + (pending
          ? '<div style="display:flex;gap:5px">' +
              '<button class="mpf-mini ok" data-act="approve-exp" data-id="' + e.id + '">Approve</button>' +
              '<button class="mpf-mini no" data-act="reject-exp" data-id="' + e.id + '">Reject</button>' +
            '</div>'
          : '<span style="font-size:11px;color:var(--ink-3)">Locked</span>') + '</td>' +
      '</tr>';
    }).join('');

    document.getElementById('mpf-expenses').innerHTML =
      table(['Description', 'Category', 'Submitted by', 'Amount', 'Date', 'Status', ''], rows,
        F.expenses === 'pending' ? 'Nothing waiting for approval.' : 'No expenses in this list.');

    var pend = all.filter(function (x) { return x.status === 'pending'; });
    var appr = all.filter(function (x) { return x.status === 'approved'; });
    document.getElementById('mpf-exp-total').innerHTML =
      '<span style="color:var(--warn)">' + pend.length + ' awaiting approval (' + MPF.naira(MPF.sum(pend, 'amount')) + ')</span>' +
      ' · approved to date: ' + MPF.naira(MPF.sum(appr, 'amount'));
  };

  /* ============ 6. Reports ============ */
  MPF.renderReports = function () {
    var fromEl = document.getElementById('mpf-from'), toEl = document.getElementById('mpf-to');
    if (!fromEl.value) {
      var d = new Date(); d.setDate(1);
      fromEl.value = MPF.ymd(d);
    }
    if (!toEl.value) toEl.value = MPF.ymd(new Date());

    var from = fromEl.value, to = toEl.value;
    var pays = MPF.livePayments().filter(function (p) { return MPF.inRange(p.createdAt, from, to); });
    var exps = DB.list(K.EXPENSES).filter(function (e) {
      return e.status === 'approved' && MPF.inRange(e.submittedAt, from, to);
    });
    var voids = DB.list(K.PAYMENTS).filter(function (p) { return p.voided && MPF.inRange(p.createdAt, from, to); });

    var cash = MPF.sum(pays.filter(function (p) { return p.type === 'cash'; }), 'amount');
    var xfer = MPF.sum(pays.filter(function (p) { return p.type === 'transfer'; }), 'amount');
    var pstk = MPF.sum(pays.filter(function (p) { return p.type === 'paystack'; }), 'amount');
    var rev = cash + xfer + pstk;
    var exp = MPF.sum(exps, 'amount');
    var net = rev - exp;

    document.getElementById('mpf-report-cards').innerHTML =
      statCard('Total received', MPF.naira(rev), pays.length + ' payment(s)', 'var(--success)') +
      statCard('Approved expenses', MPF.naira(exp), exps.length + ' expense(s)', 'var(--danger)') +
      statCard('Net profit', MPF.naira(net), 'received − approved expenses', net >= 0 ? 'var(--accent)' : 'var(--danger)') +
      statCard('Breakdown', '<span style="font-size:12px;line-height:1.7;display:block">' +
        'Cash ' + MPF.nairaShort(cash) + '<br>Transfer ' + MPF.nairaShort(xfer) + '<br>Paystack ' + MPF.nairaShort(pstk) +
        '</span>', 'How the money came in');

    var a = MPF.receiptAudit();
    document.getElementById('mpf-report-audit').innerHTML =
      '<div class="mpf-audit ' + (a.gaps.length ? 'alert' : 'clean') + '">' +
      '<strong>Receipt sequence check (all time):</strong> ' + a.count + ' receipts recorded' +
      (a.count ? ' (' + a.first + ' → ' + a.last + ')' : '') + ' · ' +
      a.voided + ' voided · ' +
      (a.gaps.length
        ? '<span class="flag">' + a.gaps.length + ' missing: ' + a.gaps.join(', ') + '</span>'
        : '<span class="good">no gaps</span>') +
      (voids.length ? '<br>' + voids.length + ' receipt(s) voided inside this date range — see the Payments tab for the reasons.' : '') +
      '</div>';

    var tx = [];
    pays.forEach(function (p) {
      tx.push({ d: p.createdAt, kind: 'in', label: MPF.PAY_TYPE[p.type] + ' — ' + p.clientName,
                ref: p.receiptNo, inv: p.invoiceNo || '', amt: Number(p.amount) });
    });
    exps.forEach(function (e) {
      tx.push({ d: e.submittedAt, kind: 'out', label: e.description + ' (' + (MPF.EXP_CAT[e.category] || e.category) + ')',
                ref: '', inv: '', amt: -Number(e.amount) });
    });
    tx.sort(function (x, y) { return new Date(y.d) - new Date(x.d); });
    MPF.lastReportTx = tx;

    var rows = tx.map(function (t) {
      return '<tr>' +
        '<td class="num">' + MPF.date(t.d) + '</td>' +
        '<td>' + (t.kind === 'in' ? MPF.badge('paid', 'Money in') : MPF.badge('rejected', 'Money out')) + '</td>' +
        '<td>' + MPF.esc(t.label) + '</td>' +
        '<td class="num">' + (t.ref ? MPF.esc(t.ref) : '—') + '</td>' +
        '<td class="num">' + (t.inv ? MPF.esc(t.inv) : '—') + '</td>' +
        '<td class="num" style="font-weight:600;color:' + (t.amt >= 0 ? 'var(--success)' : 'var(--danger)') + '">' +
          (t.amt >= 0 ? '+' : '−') + MPF.naira(Math.abs(t.amt)) + '</td>' +
      '</tr>';
    }).join('');

    document.getElementById('mpf-report-tx').innerHTML =
      table(['Date', 'Direction', 'Description', 'Receipt', 'Invoice', 'Amount'], rows,
        'No transactions in this date range.');
  };

  /* ============ tab wiring ============ */
  MPF.wireTabs = function () {
    var map = {
      'mpf-order-tabs': ['orders', MPF.renderOrders],
      'mpf-inv-tabs':   ['invoices', MPF.renderInvoices],
      'mpf-pay-tabs':   ['payments', MPF.renderPayments],
      'mpf-exp-tabs':   ['expenses', MPF.renderExpenses]
    };
    Object.keys(map).forEach(function (id) {
      var bar = document.getElementById(id);
      if (!bar) return;
      bar.addEventListener('click', function (e) {
        var btn = e.target.closest('.mpf-tab');
        if (!btn) return;
        bar.querySelectorAll('.mpf-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        F[map[id][0]] = btn.getAttribute('data-f');
        map[id][1]();
      });
    });
  };

  /* ============ refresh everything visible ============ */
  MPF.refreshAll = function () {
    if (document.getElementById('mpf-stats'))    MPF.renderDashboard();
    if (document.getElementById('mpf-orders'))   MPF.renderOrders();
    if (document.getElementById('mpf-invoices')) MPF.renderInvoices();
    if (document.getElementById('mpf-payments')) MPF.renderPayments();
    if (document.getElementById('mpf-expenses')) MPF.renderExpenses();
  };

})();
