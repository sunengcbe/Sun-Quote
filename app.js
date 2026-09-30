/* Quotation Generator - client-side only. Fonts: IBM Plex Sans (loaded at PDF time for the rupee sign). */
const $ = s => document.querySelector(s);
const T = v => (v == null ? '' : String(v)).trim();
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : NaN; };
const fmt = n => new Intl.NumberFormat('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n);
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'}) : '';
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

const newItem = () => ({desc: '', thread: '', len: '', mat: '', proc: '', qty: '', price: ''});
let company = load('qg_company', {name: '', address: '', gstin: '', email: '', phone: '', website: '', other: '', logo: null});
const now = new Date();
let cust = {name: '', address: '', gstin: '', email: '', contact: ''};
let q = {no: load('qg_next', `Q-${now.getFullYear()}-001`), date: now.toLocaleDateString('en-CA'), notes: ''};
let items = [newItem()];

/* ---------- Shared model (used by preview AND pdf) ---------- */
function model(sym) {
  const rows = items.map(i => {
    const qty = num(i.qty), price = num(i.price);
    return {desc: T(i.desc), thread: T(i.thread), len: T(i.len), mat: T(i.mat), proc: T(i.proc), qty, price, total: qty * price};
  });
  const showLen = rows.some(r => r.len), showProc = rows.some(r => r.proc);
  const cols = [
    ['no', '#', 'c'], ['desc', 'Description', 'l'], ['thread', 'Thread Type', 'l'],
    showLen && ['len', 'Thread Length', 'l'], ['mat', 'Material Type', 'l'],
    showProc && ['proc', 'Process', 'l'], ['qty', 'Quantity', 'r'], ['price', 'Unit Price', 'r'], ['total', 'Total Amount', 'r']
  ].filter(Boolean).map(([k, h, a]) => ({k, h, a}));
  const cell = (r, k, i) => k === 'no' ? String(i + 1)
    : k === 'qty' ? (isFinite(r.qty) ? String(r.qty) : '')
    : k === 'price' ? (isFinite(r.price) ? sym + fmt(r.price) : '')
    : k === 'total' ? (isFinite(r.total) ? sym + fmt(r.total) : '') : r[k];
  const total = rows.reduce((s, r) => s + (isFinite(r.total) ? r.total : 0), 0);
  const c = company;
  const coLines = [
    ...T(c.address).split('\n').map(T).filter(Boolean),
    T(c.gstin) && 'GSTIN: ' + T(c.gstin),
    [T(c.phone), T(c.email), T(c.website)].filter(Boolean).join('   |   '),
    ...T(c.other).split('\n').map(T).filter(Boolean)
  ].filter(Boolean);
  const custRight = [['Date', fmtDate(q.date)], ['Contact', T(cust.contact)], ['Email', T(cust.email)], ['GSTIN', T(cust.gstin)]].filter(r => r[1]);
  const notes = q.notes.split('\n').map(T).filter(Boolean).map(n => n.replace(/^\d+[.)]\s*/, ''));
  return {rows, cols, cell, total, coLines, custRight, notes, custAddr: T(cust.address).split('\n').map(T).filter(Boolean)};
}

/* ---------- Live preview ---------- */
function renderPreview() {
  const m = model('₹');
  const th = m.cols.map(c => `<th class="${c.a}">${c.h}</th>`).join('');
  const body = m.rows.map((r, i) => `<tr>${m.cols.map(c => `<td class="${c.a}">${esc(m.cell(r, c.k, i))}</td>`).join('')}</tr>`).join('');
  $('#sheet').innerHTML = `
  <div class="hd">
    <div class="co">${company.logo ? `<img src="${company.logo.data}" alt="">` : ''}
      <div><h3>${esc(T(company.name) || 'Company Name')}</h3>${m.coLines.map(l => `<p>${esc(l)}</p>`).join('')}</div></div>
    <div class="qt"><i></i><h4>QUOTATION</h4>
      <p><span>Quote No:</span> <b>${esc(T(q.no))}</b></p><p><span>Date:</span> <b>${esc(fmtDate(q.date))}</b></p></div>
  </div>
  <div class="cu">
    <div><div class="lbl">TO</div><b>${esc(T(cust.name) || 'Customer Name')}</b>${m.custAddr.map(l => `<p>${esc(l)}</p>`).join('')}</div>
    <div>${m.custRight.map(([l, v]) => `<p><span>${l}:</span> ${esc(v)}</p>`).join('')}</div>
  </div>
  <table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>
  <div class="total" style="margin-top:0"><span>TOTAL AMOUNT</span><b>₹ ${fmt(m.total)}</b></div>
  ${m.notes.length ? `<div class="notes"><div class="lbl">NOTES</div><ol>${m.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ol></div>` : ''}
  <div class="ft"><i></i>THANK YOU FOR YOUR BUSINESS</div>`;
  fitPreview();
}
function fitPreview() {
  const wrap = $('#pvWrap'), sheet = $('#sheet');
  const s = Math.min(1, wrap.clientWidth / 794);
  sheet.style.transform = `scale(${s})`;
  wrap.style.height = sheet.offsetHeight * s + 'px';
}
window.addEventListener('resize', fitPreview);

/* ---------- Form ---------- */
function renderItems() {
  $('#items').innerHTML = items.map((it, i) => `
  <div class="item">
    <div class="item-head"><span>ITEM ${i + 1}</span><div>
      <button type="button" data-a="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
      <button type="button" data-a="down" data-i="${i}" ${i === items.length - 1 ? 'disabled' : ''}>&darr;</button>
      <button type="button" data-a="dup" data-i="${i}">Duplicate</button>
      <button type="button" class="rm" data-a="rm" data-i="${i}" ${items.length === 1 ? 'disabled' : ''}>Remove</button></div></div>
    <div class="grid3">
      <label>Description <b>*</b><input data-i="${i}" data-f="desc" value="${esc(it.desc)}"></label>
      <label>Thread Type <b>*</b><input data-i="${i}" data-f="thread" value="${esc(it.thread)}" placeholder="M10"></label>
      <label>Thread Length<input data-i="${i}" data-f="len" value="${esc(it.len)}" placeholder="25 mm"></label>
      <label>Material Type <b>*</b><input data-i="${i}" data-f="mat" value="${esc(it.mat)}" placeholder="EN8"></label>
      <label>Process<input data-i="${i}" data-f="proc" list="procs" value="${esc(it.proc)}"></label>
      <label>Quantity <b>*</b><input type="number" min="0" step="any" data-i="${i}" data-f="qty" value="${esc(it.qty)}"></label>
      <label>Unit Price (₹) <b>*</b><input type="number" min="0" step="any" data-i="${i}" data-f="price" value="${esc(it.price)}"></label>
      <label>Total<div class="tot" id="t${i}">${itemTotal(it)}</div></label>
    </div>
  </div>`).join('') + `<datalist id="procs"><option>Grinding</option><option>Threading</option><option>Grinding &amp; Threading</option></datalist>`;
}
const itemTotal = it => { const t = num(it.qty) * num(it.price); return isFinite(t) ? '₹ ' + fmt(t) : '—'; };

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.c) { company[t.dataset.c] = t.value; save('qg_company', company); }
  else if (t.dataset.k) cust[t.dataset.k] = t.value;
  else if (t.dataset.q) q[t.dataset.q] = t.value;
  else if (t.dataset.f) { const it = items[t.dataset.i]; it[t.dataset.f] = t.value; const el = $('#t' + t.dataset.i); if (el) el.textContent = itemTotal(it); }
  else return;
  renderPreview();
});
$('#items').addEventListener('click', e => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const i = +b.dataset.i, a = b.dataset.a;
  if (a === 'rm' && items.length > 1) items.splice(i, 1);
  if (a === 'dup') items.splice(i + 1, 0, {...items[i]});
  if (a === 'up' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
  if (a === 'down' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
  renderItems(); renderPreview();
});
$('#addItem').onclick = () => { items.push(newItem()); renderItems(); renderPreview(); };

/* Logo upload: normalised to PNG (max 400px) so PDF embedding is reliable */
$('#logoFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 400 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      company.logo = {data: cv.toDataURL('image/png'), w: cv.width, h: cv.height};
      save('qg_company', company); syncLogo(); renderPreview();
    };
    img.src = r.result;
  };
  r.readAsDataURL(f);
};
$('#logoRemove').onclick = () => { company.logo = null; save('qg_company', company); syncLogo(); renderPreview(); };
function syncLogo() {
  $('#logoThumb').hidden = $('#logoRemove').hidden = !company.logo;
  if (company.logo) $('#logoThumb').src = company.logo.data;
}

/* ---------- Validation ---------- */
function validate() {
  const errs = [];
  if (!T(cust.name)) errs.push('Please enter the customer company name.');
  if (!q.date) errs.push('Please select a date.');
  items.forEach((it, i) => {
    const n = i + 1;
    if (!T(it.desc)) errs.push(`Please enter a description for item ${n}.`);
    if (!T(it.thread)) errs.push(`Please enter a thread type for item ${n}.`);
    if (!T(it.mat)) errs.push(`Please enter a material type for item ${n}.`);
    if (!(num(it.qty) > 0)) errs.push(`Please enter a valid quantity for item ${n}.`);
    if (!(num(it.price) >= 0) || T(it.price) === '') errs.push(`Please enter a valid unit price for item ${n}.`);
  });
  return errs;
}

/* ---------- PDF ---------- */
let fontCache = null;
async function loadFonts(doc) {
  try {
    if (!fontCache) {
      const base = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsans/IBMPlexSans-';
      const files = {Regular: ['Plex', 'normal'], SemiBold: ['PlexSemi', 'normal'], Bold: ['Plex', 'bold']};
      fontCache = {};
      for (const [n, meta] of Object.entries(files)) {
        const buf = new Uint8Array(await (await fetch(`${base}${n}.ttf`)).arrayBuffer());
        let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        fontCache[n] = {b64: btoa(bin), meta};
      }
    }
    for (const [n, {b64, meta}] of Object.entries(fontCache)) {
      doc.addFileToVFS(`Plex-${n}.ttf`, b64); doc.addFont(`Plex-${n}.ttf`, meta[0], meta[1]);
    }
    return {ok: true, reg: ['Plex', 'normal'], semi: ['PlexSemi', 'normal'], bold: ['Plex', 'bold']};
  } catch (err) {
    console.warn('Font load failed, using Helvetica and "Rs."', err);
    return {ok: false, reg: ['helvetica', 'normal'], semi: ['helvetica', 'bold'], bold: ['helvetica', 'bold']};
  }
}

async function generatePDF() {
  const errs = validate(), box = $('#errors');
  if (errs.length) { box.hidden = false; box.innerHTML = `<b>Please fix the following:</b><ul>${errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`; box.scrollIntoView({behavior: 'smooth', block: 'center'}); return; }
  box.hidden = true;
  const btn = $('#generate'); btn.disabled = true; btn.textContent = 'GENERATING...';
  try {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({unit: 'mm', format: 'a4', orientation: 'portrait'});
    const F = await loadFonts(doc);
    const sym = F.ok ? '₹' : 'Rs. ';
    const m = model(sym);
    const M = 15, R = 195, PW = 210, PH = 297, GOLD = '#D4A72C', RICH = '#B88918';
    const font = (f, size, color) => { doc.setFont(f[0], f[1]); doc.setFontSize(size); doc.setTextColor(color); };
    const wrap = (t, w) => doc.splitTextToSize(t, w);

    /* Header */
    let textX = M, yL = 21;
    if (company.logo) {
      const h = Math.min(18, 34 * company.logo.h / company.logo.w), w = h * company.logo.w / company.logo.h;
      doc.addImage(company.logo.data, 'PNG', M, 14, w, h); textX = M + w + 5;
    }
    font(F.bold, 15, '#111111');
    const nm = wrap((T(company.name) || 'Company Name').toUpperCase(), 135 - textX);
    doc.text(nm, textX, yL); yL += nm.length * 6.2 - 1;
    font(F.reg, 8.5, '#666666');
    m.coLines.forEach(l => wrap(l, 135 - textX).forEach(x => { doc.text(x, textX, yL); yL += 4.1; }));
    doc.setFillColor(GOLD); doc.rect(R - 45, 14, 45, 1.2, 'F');
    font(F.bold, 25, '#111111'); doc.text('QUOTATION', R, 28, {align: 'right'});
    font(F.reg, 9, '#666666'); doc.text('Quote No: ', R - doc.getTextWidth(T(q.no)) - 0.3, 35, {align: 'right'});
    font(F.semi, 9, '#111111'); doc.text(T(q.no), R, 35, {align: 'right'});
    font(F.reg, 9, '#666666'); doc.text('Date: ', R - doc.getTextWidth(fmtDate(q.date)) - 0.3, 40.5, {align: 'right'});
    font(F.semi, 9, '#111111'); doc.text(fmtDate(q.date), R, 40.5, {align: 'right'});
    let y = Math.max(yL, 44) + 2;
    doc.setDrawColor(GOLD); doc.setLineWidth(0.9); doc.line(M, y, R, y);

    /* Customer */
    y += 9;
    font(F.semi, 8, RICH); doc.text('TO', M, y, {charSpace: 0.8});
    let yc = y + 5.5;
    font(F.bold, 11, '#111111');
    const cn = wrap(T(cust.name).toUpperCase(), 95); doc.text(cn, M, yc); yc += cn.length * 5;
    font(F.reg, 9, '#292929');
    m.custAddr.forEach(l => wrap(l, 95).forEach(x => { doc.text(x, M, yc); yc += 4.4; }));
    let yr = y + 5.5;
    m.custRight.forEach(([l, v]) => {
      font(F.reg, 9, '#666666'); doc.text(l + ':', 128, yr);
      font(F.semi, 9, '#111111'); const lines = wrap(v, R - 145); doc.text(lines, 145, yr); yr += lines.length * 4.4 + 0.8;
    });
    y = Math.max(yc, yr) + 4;

    /* Items table */
    const colW = {no: 9, qty: 18, price: 26, total: 30};
    const columnStyles = {}; m.cols.forEach((c, i) => { columnStyles[i] = {halign: {l: 'left', r: 'right', c: 'center'}[c.a], ...(colW[c.k] ? {cellWidth: colW[c.k]} : {})}; });
    doc.autoTable({
      startY: y, margin: {left: M, right: PW - R, top: 18, bottom: 24}, theme: 'plain',
      head: [m.cols.map(c => c.h)],
      body: m.rows.map((r, i) => m.cols.map(c => m.cell(r, c.k, i))),
      columnStyles, showHead: 'everyPage', rowPageBreak: 'avoid',
      styles: {font: F.reg[0], fontStyle: F.reg[1], fontSize: 8.8, textColor: '#111111', cellPadding: {top: 2.8, bottom: 2.8, left: 2.2, right: 2.2}, lineColor: '#E8E8E8', lineWidth: {bottom: 0.2}, valign: 'top'},
      headStyles: {fillColor: '#111111', textColor: '#FFFFFF', font: F.semi[0], fontStyle: F.semi[1], fontSize: 8.3, valign: 'middle', lineWidth: 0},
      alternateRowStyles: {fillColor: '#FAFAFA'},
      didDrawCell: d => { if (d.section === 'head') { doc.setDrawColor(GOLD); doc.setLineWidth(0.8); doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height); } }
    });
    y = doc.lastAutoTable.finalY;

    /* Total (kept together) */
    if (y + 20 > PH - 24) { doc.addPage(); y = 18; }
    y += 6; doc.setFillColor('#111111'); doc.rect(R - 82, y, 82, 11, 'F');
    font(F.semi, 9, '#FFFFFF'); doc.text('TOTAL AMOUNT', R - 78, y + 7, {charSpace: 0.4});
    font(F.bold, 11, GOLD); doc.text(`${sym}${fmt(m.total)}`, R - 4, y + 7.2, {align: 'right'});
    y += 11;

    /* Notes (kept together where possible) */
    if (m.notes.length) {
      font(F.reg, 9, '#292929');
      const blocks = m.notes.map((n, i) => wrap(`${i + 1}.  ${n}`, R - M - 4));
      const h = 12 + blocks.reduce((s, b) => s + b.length * 4.6 + 1.2, 0);
      y += 10; if (y + h > PH - 24) { doc.addPage(); y = 22; }
      doc.setFillColor(GOLD); doc.rect(M, y - 3.6, 1.2, 4.6, 'F');
      font(F.semi, 9, '#111111'); doc.text('NOTES', M + 3.5, y, {charSpace: 0.8});
      y += 6; font(F.reg, 9, '#292929');
      blocks.forEach(b => { b.forEach(l => { if (y > PH - 24) { doc.addPage(); y = 22; font(F.reg, 9, '#292929'); } doc.text(l, M + 1, y); y += 4.6; }); y += 1.2; });
    }

    /* Footer on every page */
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p);
      doc.setFillColor(GOLD); doc.rect(PW / 2 - 9, PH - 16, 18, 0.8, 'F');
      font(F.semi, 7.5, '#292929'); doc.text('THANK YOU FOR YOUR BUSINESS', PW / 2, PH - 10.5, {align: 'center', charSpace: 0.9});
      if (n > 1) { font(F.reg, 7.5, '#666666'); doc.text(`Page ${p} of ${n}`, R, PH - 10.5, {align: 'right'}); }
    }

    const clean = s => T(s).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'Quotation';
    doc.save(`Quotation_${clean(q.no)}_${clean(cust.name)}.pdf`);

    const mt = T(q.no).match(/^(.*?)(\d+)$/);   // suggest next number
    if (mt) { q.no = mt[1] + String(+mt[2] + 1).padStart(mt[2].length, '0'); save('qg_next', q.no); document.querySelector('[data-q=no]').value = q.no; renderPreview(); }
  } catch (err) {
    console.error(err); alert('Could not generate the PDF. Please check your internet connection and try again.');
  } finally { btn.disabled = false; btn.textContent = 'GENERATE QUOTATION PDF'; }
}
$('#generate').onclick = generatePDF;

/* ---------- Init ---------- */
document.querySelectorAll('[data-c]').forEach(el => el.value = company[el.dataset.c] || '');
document.querySelectorAll('[data-q]').forEach(el => el.value = q[el.dataset.q]);
syncLogo(); renderItems(); renderPreview();
