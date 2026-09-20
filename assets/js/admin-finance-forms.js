/* =================================================================
   Mimshak Pak — Owner Finance System (Part 3: forms, actions, invoice)
   ================================================================= */
(function () {
  "use strict";

  var MPF = window.MPF;
  if (!MPF) return;
  var DB = MPF.DB, K = MPF.K, esc = MPF.esc;

  function opts(map, sel) {
    return Object.keys(map).map(function (k) {
      return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(map[k]) + '</option>';
    }).join('');
  }
  function val(id) { var el = document.getElementById(id); return el ? String(el.value).trim() : ''; }
  var ERR = '<div class="mpf-err" id="mpf-merr"></div>';

  /* ═══════════ NEW ORDER ═══════════ */
  function orderForm() {
    return '<div class="field"><label>Client name *</label>' +
        '<input type="text" id="nf-client" placeholder="e.g. Acme Foods Ltd" autocomplete="off"></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Phone</label><input type="text" id="nf-phone" placeholder="0803 000 0000"></div>' +
        '<div class="field"><label>Email</label><input type="email" id="nf-email" placeholder="client@company.com"></div>' +
      '</div>' +
      '<div style="margin-top:16px">' +
        '<label style="display:block;font-size:12px;font-weight:500;color:var(--ink-2);margin-bottom:8px;letter-spacing:.04em;text-transform:uppercase">Items</label>' +
        '<table class="mpf-items"><thead><tr>' +
          '<th style="width:46%">Description</th><th style="width:15%">Qty</th>' +
          '<th style="width:22%">Unit price (NGN)</th><th style="width:17%;text-align:right">Amount</th><th></th>' +
        '</tr></thead><tbody id="nf-items"></tbody></table>' +
        '<button type="button" class="mpf-mini" id="nf-add" style="margin-top:10px">+ Add another item</button>' +
        '<div class="mpf-total">Total: <span id="nf-total">NGN 0.00</span></div>' +
      '</div>' +
      '<div class="field" style="margin-top:16px"><label>Notes (printed on the invoice)</label>' +
        '<textarea id="nf-notes" rows="2" placeholder="Optional — delivery terms, lead time, etc."></textarea></div>' +
      '<div class="mpf-note">An invoice number is issued automatically and cannot be changed afterwards.</div>' + ERR;
  }

  function addRow() {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" class="i-desc" placeholder="e.g. Printed carton 20x15x10cm"></td>' +
      '<td><input type="number" class="i-qty" placeholder="0" min="1" step="1"></td>' +
      '<td><input type="number" class="i-price" placeholder="0.00" min="0" step="0.01"></td>' +
      '<td class="rowamt">0.00</td>' +
      '<td><button type="button" class="rmrow" title="Remove">&times;</button></td>';
    document.getElementById('nf-items').appendChild(tr);
  }

  function recalc() {
    var total = 0;
    document.querySelectorAll('#nf-items tr').forEach(function (tr) {
      var q = parseFloat(tr.querySelector('.i-qty').value) || 0;
      var p = parseFloat(tr.querySelector('.i-price').value) || 0;
      var amt = q * p;
      tr.querySelector('.rowamt').textContent = MPF.amt(amt);
      total += amt;
    });
    document.getElementById('nf-total').textContent = MPF.naira(total);
    return total;
  }

  MPF.openNewOrder = function () {
    MPF.openModal('New order', orderForm(), 'Create order', saveOrder);
    addRow();
    document.getElementById('nf-add').addEventListener('click', function () { addRow(); });
    var body = document.getElementById('nf-items');
    body.addEventListener('input', recalc);
    body.addEventListener('click', function (e) {
      if (!e.target.classList.contains('rmrow')) return;
      if (body.querySelectorAll('tr').length <= 1) return;
      e.target.closest('tr').remove();
      recalc();
    });
  };

  function saveOrder() {
    var client = val('nf-client');
    if (!client) return MPF.modalError('Client name is required.');

    var items = [], bad = false;
    document.querySelectorAll('#nf-items tr').forEach(function (tr) {
      var d = tr.querySelector('.i-desc').value.trim();
      var q = parseFloat(tr.querySelector('.i-qty').value);
      var p = parseFloat(tr.querySelector('.i-price').value);
      if (!d && isNaN(q) && isNaN(p)) return;           // blank row, skip
      if (!d || !(q > 0) || !(p >= 0)) { bad = true; return; }
      items.push({ description: d, qty: q, unitPrice: p, amount: q * p });
    });
    if (bad) return MPF.modalError('Every item needs a description, a quantity above zero, and a price.');
    if (!items.length) return MPF.modalError('Add at least one item.');

    var orders = DB.list(K.ORDERS);
    orders.unshift({
      id: MPF.genId(),
      invoiceNo: DB.nextInvoice(),
      clientName: client,
      clientPhone: val('nf-phone'),
      clientEmail: val('nf-email'),
      items: items,
      total: items.reduce(function (s, i) { return s + i.amount; }, 0),
      status: 'quote',
      notes: val('nf-notes'),
      createdAt: MPF.now()
    });
    DB.save(K.ORDERS, orders);
    MPF.closeModal();
    MPF.refreshAll();
  }

  /* ═══════════ ORDER STATUS ═══════════ */
  MPF.openStatus = function (id) {
    var o = DB.list(K.ORDERS).filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    MPF.openModal('Update status — ' + o.invoiceNo,
      '<div class="field"><label>Client</label><input type="text" value="' + esc(o.clientName) + '" disabled></div>' +
      '<div class="field"><label>Order status</label><select id="sf-status">' + opts(MPF.ORDER_STATUS, o.status) + '</select></div>' +
      '<div class="mpf-note">Cancelling an order keeps it on record — nothing is deleted. Any payments already logged against it stay in the payment log.</div>' + ERR,
      'Update', function () {
        var s = val('sf-status');
        var list = DB.list(K.ORDERS).map(function (x) {
          if (x.id === id) { x.status = s; x.updatedAt = MPF.now(); }
          return x;
        });
        DB.save(K.ORDERS, list);
        MPF.closeModal();
        MPF.refreshAll();
      });
  };

  /* ═══════════ LOG PAYMENT ═══════════ */
  function invoiceOptions(sel) {
    var open = DB.list(K.ORDERS).filter(function (o) {
      return o.status !== 'cancelled' && (Number(o.total) - MPF.paidOn(o.invoiceNo)) > 0;
    });
    return '<option value="">— not linked to an invoice —</option>' + open.map(function (o) {
      var due = Number(o.total) - MPF.paidOn(o.invoiceNo);
      return '<option value="' + esc(o.invoiceNo) + '" data-client="' + esc(o.clientName) + '" data-due="' + due + '"' +
        (o.invoiceNo === sel ? ' selected' : '') + '>' +
        esc(o.invoiceNo) + ' — ' + esc(o.clientName) + ' (' + MPF.naira(due) + ' due)</option>';
    }).join('');
  }

  MPF.openPayment = function (invoiceNo) {
    var preset = null;
    if (invoiceNo) preset = DB.list(K.ORDERS).filter(function (o) { return o.invoiceNo === invoiceNo; })[0];

    MPF.openModal('Log a payment received',
      '<div class="field"><label>Payment method *</label><select id="pf-type">' + opts(MPF.PAY_TYPE, 'cash') + '</select></div>' +
      '<div class="field"><label>Against invoice</label><select id="pf-inv">' + invoiceOptions(invoiceNo) + '</select>' +
        '<div class="field-hint">Linking the payment updates that invoice\'s balance automatically.</div></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Client name *</label><input type="text" id="pf-client" value="' +
          (preset ? esc(preset.clientName) : '') + '" placeholder="Who paid"></div>' +
        '<div class="field"><label>Amount received (NGN) *</label><input type="number" id="pf-amount" min="0" step="0.01" placeholder="0.00"></div>' +
      '</div>' +
      '<div class="field"><label>Reference number</label><input type="text" id="pf-ref" placeholder="Paystack / bank transaction reference">' +
        '<div class="field-hint">For transfers and Paystack, enter the transaction reference so it can be checked against the bank or Paystack dashboard.</div></div>' +
      '<div class="field"><label>Note</label><input type="text" id="pf-note" placeholder="Optional — e.g. part payment, balance on delivery"></div>' +
      '<div class="mpf-warn-box"><strong>This creates a permanent record.</strong> A receipt number is issued automatically. ' +
        'Payments can never be deleted — only voided, and a void keeps the reason and the time it happened.</div>' + ERR,
      'Log payment', savePayment);

    var sel = document.getElementById('pf-inv');
    sel.addEventListener('change', function () {
      var opt = sel.options[sel.selectedIndex];
      var c = opt.getAttribute('data-client'), due = opt.getAttribute('data-due');
      if (c) document.getElementById('pf-client').value = c;
      if (due && !document.getElementById('pf-amount').value) {
        document.getElementById('pf-amount').value = Number(due).toFixed(2);
      }
    });
  };

  function savePayment() {
    var client = val('pf-client');
    var amount = parseFloat(val('pf-amount'));
    var type = val('pf-type');
    if (!client) return MPF.modalError('Client name is required.');
    if (!(amount > 0)) return MPF.modalError('Enter an amount greater than zero.');
    if ((type === 'transfer' || type === 'paystack') && !val('pf-ref')) {
      return MPF.modalError('A reference number is required for transfers and Paystack, so the payment can be verified against the bank.');
    }

    var list = DB.list(K.PAYMENTS);
    list.unshift({
      id: MPF.genId(),
      receiptNo: DB.nextReceipt(),
      type: type,
      invoiceNo: val('pf-inv'),
      clientName: client,
      amount: amount,
      ref: val('pf-ref'),
      note: val('pf-note'),
      createdAt: MPF.now(),
      voided: false, voidedAt: null, voidReason: ''
    });
    DB.save(K.PAYMENTS, list);
    MPF.closeModal();
    MPF.refreshAll();
  }

  /* ═══════════ VOID PAYMENT ═══════════ */
  MPF.openVoid = function (id) {
    var p = DB.list(K.PAYMENTS).filter(function (x) { return x.id === id; })[0];
    if (!p || p.voided) return;
    MPF.openModal('Void receipt ' + p.receiptNo,
      '<div class="mpf-warn-box"><strong>This cannot be undone.</strong> The receipt stays visible in the payment log, ' +
        'marked as voided, with your reason and a timestamp. It stops counting towards revenue.</div>' +
      '<div class="field"><label>Receipt</label><input type="text" disabled value="' +
        esc(p.receiptNo) + ' · ' + esc(p.clientName) + ' · ' + MPF.naira(p.amount) + '"></div>' +
      '<div class="field"><label>Reason for voiding *</label>' +
        '<textarea id="vf-reason" rows="3" placeholder="e.g. Entered twice by mistake / cheque bounced / wrong amount"></textarea></div>' + ERR,
      'Void receipt', function () {
        var r = val('vf-reason');
        if (!r) return MPF.modalError('A reason is required — this is what protects the audit trail.');
        var list = DB.list(K.PAYMENTS).map(function (x) {
          if (x.id === id && !x.voided) { x.voided = true; x.voidedAt = MPF.now(); x.voidReason = r; }
          return x;
        });
        DB.save(K.PAYMENTS, list);
        MPF.closeModal();
        MPF.refreshAll();
      });
  };

  /* ═══════════ EXPENSES ═══════════ */
  MPF.openExpense = function () {
    MPF.openModal('Submit an expense',
      '<div class="field"><label>What was the money spent on? *</label>' +
        '<input type="text" id="ef-desc" placeholder="e.g. Ink and rollers restock"></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Category *</label><select id="ef-cat">' + opts(MPF.EXP_CAT, 'materials') + '</select></div>' +
        '<div class="field"><label>Amount (NGN) *</label><input type="number" id="ef-amount" min="0" step="0.01" placeholder="0.00"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Submitted by</label><input type="text" id="ef-by" placeholder="Name of who is claiming it"></div>' +
        '<div class="field"><label>Date of spend</label><input type="date" id="ef-date" value="' + MPF.ymd() + '"></div>' +
      '</div>' +
      '<div class="field"><label>Note</label><input type="text" id="ef-note" placeholder="Optional — supplier, receipt number, etc."></div>' +
      '<div class="mpf-warn-box"><strong>This does not affect your profit yet.</strong> It stays as "awaiting approval" ' +
        'until the owner approves it from the Expenses tab.</div>' + ERR,
      'Submit for approval', function () {
        var d = val('ef-desc'), a = parseFloat(val('ef-amount'));
        if (!d) return MPF.modalError('Describe what the money was spent on.');
        if (!(a > 0)) return MPF.modalError('Enter an amount greater than zero.');
        var date = val('ef-date');
        var list = DB.list(K.EXPENSES);
        list.unshift({
          id: MPF.genId(),
          description: d,
          category: val('ef-cat'),
          amount: a,
          submittedBy: val('ef-by'),
          note: val('ef-note'),
          submittedAt: date ? new Date(date + 'T12:00:00').toISOString() : MPF.now(),
          status: 'pending', decidedAt: null, rejectReason: ''
        });
        DB.save(K.EXPENSES, list);
        MPF.closeModal();
        MPF.refreshAll();
      });
  };

  function decide(id, status, reason) {
    var list = DB.list(K.EXPENSES).map(function (e) {
      if (e.id === id && e.status === 'pending') {
        e.status = status; e.decidedAt = MPF.now();
        if (reason) e.rejectReason = reason;
      }
      return e;
    });
    DB.save(K.EXPENSES, list);
    MPF.refreshAll();
  }

  MPF.approveExpense = function (id) {
    var e = DB.list(K.EXPENSES).filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    MPF.openModal('Approve expense',
      '<div class="field"><label>Expense</label><input type="text" disabled value="' +
        esc(e.description) + ' · ' + MPF.naira(e.amount) + '"></div>' +
      '<div class="mpf-note">Once approved this amount is deducted from your net profit and the record is locked.</div>' + ERR,
      'Approve', function () { decide(id, 'approved'); MPF.closeModal(); });
  };

  MPF.rejectExpense = function (id) {
    var e = DB.list(K.EXPENSES).filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    MPF.openModal('Reject expense',
      '<div class="field"><label>Expense</label><input type="text" disabled value="' +
        esc(e.description) + ' · ' + MPF.naira(e.amount) + '"></div>' +
      '<div class="field"><label>Reason for rejecting *</label>' +
        '<textarea id="rf-reason" rows="3" placeholder="e.g. No receipt provided / not a business expense"></textarea></div>' +
      '<div class="mpf-note">The rejection and your reason stay on record permanently.</div>' + ERR,
      'Reject', function () {
        var r = val('rf-reason');
        if (!r) return MPF.modalError('Give a reason so the record is clear.');
        decide(id, 'rejected', r);
        MPF.closeModal();
      });
  };

  /* ═══════════ INVOICE PRINT ═══════════ */
  MPF.printInvoice = function (id) {
    var o = DB.list(K.ORDERS).filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    var bank = DB.obj(K.BANK);
    var C = (window.MPI_CONTACT || {});
    var paid = MPF.paidOn(o.invoiceNo), due = Number(o.total) - paid;

    var rows = (o.items || []).map(function (i) {
      return '<tr><td>' + esc(i.description) + '</td><td class="r">' + i.qty +
        '</td><td class="r">' + MPF.amt(i.unitPrice) + '</td><td class="r">' + MPF.amt(i.amount) + '</td></tr>';
    }).join('');

    var payBlock = bank.accountNo
      ? '<p><strong>Bank:</strong> ' + esc(bank.bankName || '') + ' &nbsp;|&nbsp; <strong>Account no:</strong> ' +
        esc(bank.accountNo) + ' &nbsp;|&nbsp; <strong>Account name:</strong> ' +
        esc(bank.accountName || 'Mimshak Pak Investments Ltd.') + '</p>'
      : '<p style="color:#a00"><em>Bank details not configured — add them in the admin panel Settings tab.</em></p>';

    var html =
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(o.invoiceNo) + ' — Mimshak Pak</title><style>' +
'html{color-scheme:light}*{box-sizing:border-box}' +
'body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1c1815;background:#fff;margin:0;padding:26px;max-width:820px}' +
'table.it td{background:#fff}' +
'.hd{background:#e8731a;color:#fff;padding:22px 26px;margin:-26px -26px 26px;display:flex;justify-content:space-between;align-items:flex-start}' +
'.hd h1{margin:0;font-size:30px;letter-spacing:4px;font-weight:bold}.hd p{margin:2px 0 0;font-size:10.5px;opacity:.95}' +
'.hd .no{font-size:19px;font-weight:bold;text-align:right}.hd .nolbl{font-size:9px;letter-spacing:1.5px;opacity:.85;text-align:right}' +
'.meta{display:flex;justify-content:space-between;gap:30px;margin-bottom:22px}' +
'.meta h3{font-size:9.5px;text-transform:uppercase;letter-spacing:1.2px;color:#8a8178;margin:0 0 6px}' +
'.meta .who{font-size:14px;font-weight:bold;margin-bottom:3px}' +
'.meta table td{padding:2px 0 2px 18px;font-size:11.5px}.meta table td:first-child{color:#8a8178;padding-left:0;text-transform:uppercase;font-size:9.5px;letter-spacing:.6px}' +
'table.it{width:100%;border-collapse:collapse;margin:0 0 18px}' +
'table.it th{background:#2c2723;color:#fff;padding:9px 11px;text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.7px}' +
'table.it th.r,table.it td.r{text-align:right}table.it td{padding:9px 11px;border-bottom:1px solid #ece7e1}' +
'table.it tbody tr:nth-child(even) td{background:#faf8f6}' +
'.tot{margin-left:auto;width:270px}.tot td{padding:5px 0;font-size:12px}.tot td:last-child{text-align:right;font-family:Consolas,monospace}' +
'.tot tr.g td{border-top:2px solid #e8731a;padding-top:9px;font-size:15px;font-weight:bold;color:#e8731a}' +
'.tot tr.due td{color:#c0392b;font-weight:bold}' +
'.pay{background:#faf8f6;border-left:3px solid #e8731a;padding:13px 16px;margin:22px 0;font-size:11.5px;line-height:1.7}' +
'.pay h4{margin:0 0 6px;font-size:9.5px;text-transform:uppercase;letter-spacing:1.2px;color:#8a8178}.pay p{margin:0}' +
'.note{font-size:11.5px;background:#f7f5f2;padding:10px 14px;border-radius:4px;margin-bottom:18px}' +
'.ft{text-align:center;font-size:10px;color:#8a8178;margin-top:34px;padding-top:15px;border-top:1px solid #ece7e1;line-height:1.7}' +
'@media print{body{padding:0}.hd{margin:0 0 26px;padding:22px 26px}}' +
'</style></head><body>' +
'<div class="hd"><div><h1>INVOICE</h1>' +
  '<p><strong>Mimshak Pak Investments Ltd.</strong></p>' +
  '<p>' + esc(C.address || 'No 3 Austin Ugbo Onyeje Avenue, Orjimiyana, Asaba, Delta State') + '</p>' +
  '<p>' + esc(C.phoneDisplay || '0803 707 9976') + (C.phone2Display ? ' &nbsp;|&nbsp; ' + esc(C.phone2Display) : '') +
    ' &nbsp;|&nbsp; ' + esc(C.email || 'info@mimshakpak.com') + '</p>' +
  '<p>www.mimshakpak.com</p></div>' +
  '<div><div class="nolbl">INVOICE NO</div><div class="no">' + esc(o.invoiceNo) + '</div></div></div>' +
'<div class="meta"><div><h3>Bill to</h3><div class="who">' + esc(o.clientName) + '</div>' +
  (o.clientPhone ? esc(o.clientPhone) + '<br>' : '') + (o.clientEmail ? esc(o.clientEmail) : '') + '</div>' +
  '<div><table><tr><td>Date issued</td><td>' + MPF.date(o.createdAt) + '</td></tr>' +
  '<tr><td>Order status</td><td>' + esc(MPF.ORDER_STATUS[o.status] || o.status) + '</td></tr>' +
  '<tr><td>Payment</td><td>' + (due <= 0 ? 'PAID IN FULL' : paid > 0 ? 'PART PAID' : 'UNPAID') + '</td></tr></table></div></div>' +
'<table class="it"><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price (NGN)</th><th class="r">Amount (NGN)</th></tr></thead>' +
  '<tbody>' + rows + '</tbody></table>' +
'<table class="tot"><tr><td>Subtotal</td><td>NGN ' + MPF.amt(o.total) + '</td></tr>' +
  (paid > 0 ? '<tr><td>Less paid</td><td>− NGN ' + MPF.amt(paid) + '</td></tr>' : '') +
  '<tr class="g"><td>TOTAL</td><td>NGN ' + MPF.amt(o.total) + '</td></tr>' +
  (due > 0 && paid > 0 ? '<tr class="due"><td>BALANCE DUE</td><td>NGN ' + MPF.amt(due) + '</td></tr>' : '') +
  '</table>' +
(o.notes ? '<div class="note"><strong>Notes:</strong> ' + esc(o.notes) + '</div>' : '') +
'<div class="pay"><h4>Payment instructions</h4>' + payBlock +
  '<p style="margin-top:6px;color:#8a8178">Please quote <strong>' + esc(o.invoiceNo) + '</strong> as your payment reference.</p></div>' +
'<div class="ft"><p><strong>Thank you for your business.</strong></p>' +
  '<p>Mimshak Pak Investments Ltd. — Registered Nigerian manufacturer of printed cartons and nylon packaging</p>' +
  '<p>www.mimshakpak.com</p></div>' +
'<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print()},250)}<\/scr' + 'ipt></body></html>';

    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups for this site to download invoices.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  /* ═══════════ CSV EXPORT ═══════════ */
  MPF.exportCSV = function () {
    var tx = MPF.lastReportTx || [];
    if (!tx.length) { alert('Nothing to export for this date range. Click Apply first.'); return; }
    var lines = [['Date', 'Direction', 'Description', 'Receipt', 'Invoice', 'Amount (NGN)'].join(',')];
    tx.forEach(function (t) {
      lines.push([
        MPF.date(t.d),
        t.amt >= 0 ? 'Money in' : 'Money out',
        '"' + String(t.label).replace(/"/g, '""') + '"',
        t.ref || '',
        t.inv || '',
        t.amt.toFixed(2)
      ].join(','));
    });
    var total = tx.reduce(function (s, t) { return s + t.amt; }, 0);
    lines.push(['', '', '"NET"', '', '', total.toFixed(2)].join(','));

    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mimshak-pak-report-' + (document.getElementById('mpf-from').value || '') +
                 '-to-' + (document.getElementById('mpf-to').value || '') + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };

  /* ═══════════ BANK DETAILS (Settings) ═══════════ */
  function injectBankSettings() {
    var sec = document.getElementById('sec-settings');
    if (!sec) return;
    var b = DB.obj(K.BANK);
    var box = document.createElement('div');
    box.className = 'settings-block';
    box.innerHTML =
      '<h3>Bank details for invoices</h3>' +
      '<p>These appear in the payment instructions on every invoice you print. Set them once.</p>' +
      '<div class="form-row">' +
        '<div class="field"><label>Bank name</label><input type="text" id="bk-name" value="' + esc(b.bankName || '') + '" placeholder="e.g. Zenith Bank"></div>' +
        '<div class="field"><label>Account number</label><input type="text" id="bk-no" value="' + esc(b.accountNo || '') + '" placeholder="10 digits"></div>' +
      '</div>' +
      '<div class="field"><label>Account name</label><input type="text" id="bk-acct" value="' +
        esc(b.accountName || 'Mimshak Pak Investments Ltd.') + '"></div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:6px">' +
        '<button class="btn btn-primary" id="bk-save">Save bank details</button>' +
        '<span id="bk-msg" style="font-size:12px;min-height:16px"></span></div>';
    sec.appendChild(box);

    document.getElementById('bk-save').addEventListener('click', function () {
      DB.save(K.BANK, { bankName: val('bk-name'), accountNo: val('bk-no'), accountName: val('bk-acct') });
      var m = document.getElementById('bk-msg');
      m.textContent = 'Saved. New invoices will show these details.';
      m.style.color = 'var(--success)';
      if (document.getElementById('mpf-bank-warn')) MPF.renderInvoices();
    });
  }

  /* ═══════════ BACKUP / RESTORE (Settings) ═══════════ */
  function injectBackup() {
    var sec = document.getElementById('sec-settings');
    if (!sec) return;
    var box = document.createElement('div');
    box.className = 'settings-block';
    box.innerHTML =
      '<h3>Backup your financial records</h3>' +
      '<p>Orders, payments and expenses are stored in this browser. Download a backup regularly — ' +
      'and always before clearing browser data or switching device.</p>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="bk-export">Download backup</button>' +
        '<button class="btn btn-ghost" id="bk-import">Restore from backup</button>' +
        '<input type="file" id="bk-file" accept=".json" style="display:none">' +
        '<span id="bk-bmsg" style="font-size:12px;min-height:16px"></span></div>';
    sec.appendChild(box);

    document.getElementById('bk-export').addEventListener('click', function () {
      var data = {
        exportedAt: MPF.now(),
        orders: DB.list(K.ORDERS), payments: DB.list(K.PAYMENTS),
        expenses: DB.list(K.EXPENSES), meta: DB.obj(K.META), bank: DB.obj(K.BANK)
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mimshak-pak-backup-' + MPF.ymd() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });

    document.getElementById('bk-import').addEventListener('click', function () {
      document.getElementById('bk-file').click();
    });
    document.getElementById('bk-file').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var msg = document.getElementById('bk-bmsg');
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result);
          if (!d.orders || !d.payments) throw new Error('Not a valid backup file');
          if (!confirm('This replaces all current financial records with the backup. Continue?')) return;
          DB.save(K.ORDERS, d.orders); DB.save(K.PAYMENTS, d.payments);
          DB.save(K.EXPENSES, d.expenses || []); DB.save(K.META, d.meta || {});
          if (d.bank) DB.save(K.BANK, d.bank);
          msg.textContent = 'Backup restored.'; msg.style.color = 'var(--success)';
          MPF.refreshAll();
        } catch (err) {
          msg.textContent = 'Could not read that file: ' + err.message;
          msg.style.color = 'var(--danger)';
        }
      };
      r.readAsText(f);
      e.target.value = '';
    });
  }

  /* ═══════════ GLOBAL ACTION DELEGATION ═══════════ */
  function wireActions() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act'), id = btn.getAttribute('data-id');
      switch (act) {
        case 'new-order':     MPF.openNewOrder(); break;
        case 'new-payment':   MPF.openPayment(); break;
        case 'new-expense':   MPF.openExpense(); break;
        case 'order-status':  MPF.openStatus(id); break;
        case 'invoice':       MPF.printInvoice(id); break;
        case 'void-pay':      MPF.openVoid(id); break;
        case 'approve-exp':   MPF.approveExpense(id); break;
        case 'reject-exp':    MPF.rejectExpense(id); break;
        case 'run-report':    MPF.renderReports(); break;
        case 'export-csv':    MPF.exportCSV(); break;
        case 'goto-expenses': if (window.switchSection) window.switchSection('expenses'); break;
        case 'pay-invoice':
          var o = DB.list(K.ORDERS).filter(function (x) { return x.id === id; })[0];
          if (o) MPF.openPayment(o.invoiceNo);
          break;
      }
    });
  }

  /* ═══════════ BOOT ═══════════ */
  MPF.boot = function () {
    if (MPF._booted) return;
    MPF._booted = true;
    MPF.bootCore();
    injectBankSettings();
    injectBackup();
    wireActions();
    MPF.wireTabs();

    var RENDER = {
      finance:  MPF.renderDashboard,
      orders:   MPF.renderOrders,
      invoices: MPF.renderInvoices,
      payments: MPF.renderPayments,
      expenses: MPF.renderExpenses,
      reports:  MPF.renderReports
    };
    MPF.onSection = function (name) { if (RENDER[name]) RENDER[name](); };
    MPF.renderDashboard();
  };

})();
