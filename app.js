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
    showLen && ['len', 'Thread Length', 'c'], ['mat', 'Material Type', 'c'],
    showProc && ['proc', 'Process', 'c'], ['qty', 'Quantity', 'c'], ['price', 'Unit Price', 'c'], ['total', 'Total Amount', 'c']
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
  const custRight = [['Contact', T(cust.contact)], ['Email', T(cust.email)], ['GSTIN', T(cust.gstin)]].filter(r => r[1]);
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
const GF = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/', GR = 'https://raw.githubusercontent.com/google/fonts/main/ofl/';
const fu = p => [GF + p, GR + p];
async function fetchTTF(urls) {
  for (const u of urls) {
    try {
      const c = new AbortController(), t = setTimeout(() => c.abort(), 15000);
      const r = await fetch(u, {signal: c.signal}); clearTimeout(t);
      if (!r.ok) continue;
      const buf = new Uint8Array(await r.arrayBuffer());
      const sig = ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0;
      if (sig !== 0x00010000 && sig !== 0x74727565) continue;      // must be a real TrueType file
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      return btoa(bin);
    } catch {}
  }
  return null;
}
function registerFonts(doc, d) {
  const F = {ok: false, headOk: false, reg: ['helvetica', 'normal'], semi: ['helvetica', 'bold'], bold: ['helvetica', 'bold'], head: ['helvetica', 'bold']};
  if (d.plex) {
    [['Regular', 'Plex', 'normal'], ['SemiBold', 'PlexSemi', 'normal'], ['Bold', 'Plex', 'bold']].forEach(([n, fam, st]) => { doc.addFileToVFS(`Plex-${n}.ttf`, d.plex[n]); doc.addFont(`Plex-${n}.ttf`, fam, st); });
    F.ok = true; F.reg = ['Plex', 'normal']; F.semi = ['PlexSemi', 'normal']; F.bold = ['Plex', 'bold'];
  }
  if (d.head) { doc.addFileToVFS('Head.ttf', d.head); doc.addFont('Head.ttf', 'Head', 'normal'); F.head = ['Head', 'normal']; F.headOk = true; }
  return F;
}
function fontWorks(d) {           // dry run incl. embedding, so a bad font never breaks the real PDF
  try {
    const t = new window.jspdf.jsPDF(), F = registerFonts(t, d);
    [F.reg, F.semi, F.bold, F.head].forEach(f => { t.setFont(f[0], f[1]); t.text('Test ₹ 123 THREAD LENGTH', 10, 10); });
    t.output('arraybuffer'); return true;
  } catch (e) { console.warn('Font rejected', e); return false; }
}
/* Fonts are pre-loaded in the background when the page opens, so Generate is instant */
const fontsReady = (async () => {
  try {
    const [r, s, b, h] = await Promise.all([fetchTTF(fu('ibmplexsans/IBMPlexSans-Regular.ttf')), fetchTTF(fu('ibmplexsans/IBMPlexSans-SemiBold.ttf')), fetchTTF(fu('ibmplexsans/IBMPlexSans-Bold.ttf')), fetchTTF(fu('michroma/Michroma-Regular.ttf'))]);
    await new Promise(r => setTimeout(r, 0));
    const d = {plex: (r && s && b) ? {Regular: r, SemiBold: s, Bold: b} : null, head: h};
    if (d.plex && !fontWorks({plex: d.plex})) d.plex = null;
    if (d.head && !fontWorks({head: d.head})) d.head = null;
    return d;
  } catch { return {plex: null, head: null}; }
})();

async function buildPDF(d) {
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({unit: 'mm', format: 'a4', orientation: 'portrait'});
  const F = registerFonts(doc, d);
  const sym = F.ok ? '₹' : 'Rs. ';
  const m = model(sym);
  const M = 15, R = 195, PW = 210, PH = 297, GOLD = '#D4A72C', RICH = '#B88918';
  const font = (f, size, color) => { doc.setFont(f[0], f[1]); doc.setFontSize(size); doc.setTextColor(color); };
  const wrap = (t, w) => doc.splitTextToSize(t, w);
  const runTable = o => (typeof doc.autoTable === 'function') ? doc.autoTable(o) : window.jspdf.autoTable(doc, o);

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
  font(F.semi, 9, '#111111'); const qn = T(q.no), dt = fmtDate(q.date);
  doc.text(qn, R, 35, {align: 'right'}); doc.text(dt, R, 40.5, {align: 'right'});
  font(F.reg, 9, '#666666');
  doc.text('Quote No: ', R - doc.getTextWidth(qn) - 0.5, 35, {align: 'right'});
  doc.text('Date: ', R - doc.getTextWidth(dt) - 0.5, 40.5, {align: 'right'});
  let y = Math.max(yL, 44) + 2;
  doc.setDrawColor(GOLD); doc.setLineWidth(0.9); doc.line(M, y, R, y);

  /* Customer (date is shown only once, in the header) */
  y += 8;
  font(F.semi, 8, RICH); doc.text('TO', M, y, {charSpace: 0.8});
  let yc = y + 5.5;
  font(F.bold, 11, '#111111');
  const cn = wrap(T(cust.name).toUpperCase(), 100); doc.text(cn, M, yc); yc += cn.length * 5;
  font(F.reg, 9, '#292929');
  m.custAddr.forEach(l => wrap(l, 100).forEach(x => { doc.text(x, M, yc); yc += 4.4; }));
  let yr = y + 5.5;
  m.custRight.forEach(([l, v]) => {
    font(F.reg, 9, '#666666'); doc.text(l + ':', 128, yr);
    font(F.semi, 9, '#111111'); const lines = wrap(v, R - 145); doc.text(lines, 145, yr); yr += lines.length * 4.4 + 0.8;
  });
  y = Math.max(yc, yr) + 3;

  /* Items table: sized to use the page (built for up to ~18 rows) */
  const n = m.rows.length;
  const pad = n <= 6 ? 4.2 : n <= 10 ? 3.5 : n <= 14 ? 2.8 : n <= 17 ? 2.3 : 2;
  const fs = n <= 10 ? 10 : n <= 14 ? 9.5 : 9;
  const HF = 6.2, HLH = 3.1;
  const columnStyles = {};
  m.cols.forEach((c, i) => {
    columnStyles[i] = {halign: c.a === 'l' ? 'left' : 'center'};
    if (c.k === 'no') columnStyles[i].cellWidth = 9;
    if (c.k === 'desc') columnStyles[i].minCellWidth = 38;
  });
  runTable({
    startY: y, margin: {left: M, right: PW - R, top: 18, bottom: 24}, theme: 'plain', tableWidth: 'auto',
    head: [m.cols.map(c => c.h.toUpperCase())],
    body: m.rows.map((r, i) => m.cols.map(c => m.cell(r, c.k, i))),
    columnStyles, showHead: 'everyPage', rowPageBreak: 'avoid',
    styles: {font: F.reg[0], fontStyle: F.reg[1], fontSize: fs, textColor: '#111111', cellPadding: {top: pad, bottom: pad, left: 2.4, right: 2.4}, lineColor: '#E8E8E8', lineWidth: {bottom: 0.2}, valign: 'middle', overflow: 'linebreak'},
    /* head text is drawn manually (centred, faux-bold); autoTable's own head text is same colour as the fill so it is invisible but still measured */
    headStyles: {fillColor: '#111111', textColor: '#111111', font: F.head[0], fontStyle: F.head[1], fontSize: HF, halign: 'center', valign: 'middle', minCellHeight: 11, cellPadding: {top: 2.5, bottom: 2.5, left: 1.5, right: 1.5}, lineWidth: 0},
    alternateRowStyles: {fillColor: '#FAFAFA'},
    didDrawCell: d => {
      if (d.section !== 'head') return;
      const c = d.cell, lines = Array.isArray(c.text) ? c.text : [String(c.text)];
      doc.setFont(F.head[0], F.head[1]); doc.setFontSize(HF); doc.setTextColor('#FFFFFF');
      doc.setDrawColor('#FFFFFF'); doc.setLineWidth(F.headOk ? 0.12 : 0);
      const top = c.y + (c.height - lines.length * HLH) / 2 + HLH * 0.78;
      lines.forEach((l, i) => doc.text(String(l), c.x + c.width / 2, top + i * HLH, {align: 'center', renderingMode: F.headOk ? 'fillThenStroke' : 'fill'}));
      doc.setDrawColor(GOLD); doc.setLineWidth(0.8); doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height);
    }
  });
  y = doc.lastAutoTable.finalY;

  /* Total (kept together) */
  if (y + 22 > PH - 24) { doc.addPage(); y = 18; }
  y += 6; doc.setFillColor('#111111'); doc.rect(R - 92, y, 92, 12, 'F');
  font(F.semi, 9.5, '#FFFFFF'); doc.text('TOTAL AMOUNT', R - 88, y + 7.6, {charSpace: 0.4});
  font(F.bold, 12, GOLD); doc.text(`${sym}${fmt(m.total)}`, R - 4, y + 7.9, {align: 'right'});
  y += 12;

  /* Notes: larger type, kept together where possible */
  if (m.notes.length) {
    const NF = 10.5, NL = 5.4;
    font(F.reg, NF, '#292929');
    const blocks = m.notes.map((t, i) => wrap(`${i + 1}.  ${t}`, R - M - 4));
    const h = 14 + blocks.reduce((s, b) => s + b.length * NL + 1.5, 0);
    y += 11; if (y + h > PH - 24) { doc.addPage(); y = 22; }
    doc.setFillColor(GOLD); doc.rect(M, y - 4, 1.3, 5.2, 'F');
    font(F.semi, 10.5, '#111111'); doc.text('NOTES', M + 3.8, y, {charSpace: 0.9});
    y += 7; font(F.reg, NF, '#292929');
    blocks.forEach(b => { b.forEach(l => { if (y > PH - 24) { doc.addPage(); y = 22; font(F.reg, NF, '#292929'); } doc.text(l, M + 1, y); y += NL; }); y += 1.5; });
  }

  /* Footer on every page */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(GOLD); doc.rect(PW / 2 - 9, PH - 16, 18, 0.8, 'F');
    font(F.semi, 7.5, '#292929'); doc.text('THANK YOU FOR YOUR BUSINESS', PW / 2, PH - 10.5, {align: 'center', charSpace: 0.9});
    if (pages > 1) { font(F.reg, 7.5, '#666666'); doc.text(`Page ${p} of ${pages}`, R, PH - 10.5, {align: 'right'}); }
  }
  const clean = s => T(s).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'Quotation';
  doc.save(`Quotation_${clean(q.no)}_${clean(cust.name)}.pdf`);
}

async function generatePDF() {
  const errs = validate(), box = $('#errors');
  if (errs.length) { box.hidden = false; box.innerHTML = `<b>Please fix the following:</b><ul>${errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`; box.scrollIntoView({behavior: 'smooth', block: 'center'}); return; }
  box.hidden = true;
  const btn = $('#generate'); btn.disabled = true; btn.textContent = 'GENERATING...';
  try {
    if (!window.jspdf) throw new Error('PDF library did not load. Please refresh the page.');
    await new Promise(r => setTimeout(r, 30));                       // let the button repaint
    const d = await Promise.race([fontsReady, new Promise(r => setTimeout(() => r({plex: null, head: null}), 6000))]);
    try { await buildPDF(d); }
    catch (e1) { console.warn('Custom fonts failed, retrying with built-in fonts', e1); await buildPDF({plex: null, head: null}); }
    const mt = T(q.no).match(/^(.*?)(\d+)$/);                        // suggest next number
    if (mt) { q.no = mt[1] + String(+mt[2] + 1).padStart(mt[2].length, '0'); save('qg_next', q.no); document.querySelector('[data-q=no]').value = q.no; renderPreview(); }
  } catch (err) {
    console.error(err); box.hidden = false; box.innerHTML = `<b>Could not generate the PDF.</b><ul><li>${esc(err.message || err)}</li></ul>`;
  } finally { btn.disabled = false; btn.textContent = 'GENERATE QUOTATION PDF'; }
}
$('#generate').onclick = generatePDF;

/* ---------- Init ---------- */
document.querySelectorAll('[data-c]').forEach(el => el.value = company[el.dataset.c] || '');
document.querySelectorAll('[data-q]').forEach(el => el.value = q[el.dataset.q]);
syncLogo(); renderItems(); renderPreview();
