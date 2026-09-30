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

/* ---------- Paginated A4 sheets: used by BOTH the live preview and the PDF ---------- */
const LIMIT = 960;   // usable content height (px) on a 794x1123 sheet, leaves room for the footer
function paginate(host) {
  const m = model('₹');
  host.innerHTML = '';
  const sheets = [];
  const thead = `<thead><tr>${m.cols.map(c => `<th class="${c.a}">${c.h}</th>`).join('')}</tr></thead>`;
  const rowHTML = (r, i) => `<tr>${m.cols.map(c => `<td class="${c.a}">${esc(m.cell(r, c.k, i))}</td>`).join('')}</tr>`;
  const headerHTML = `
  <div class="hd">
    <div class="co">${company.logo ? `<img src="${company.logo.data}" alt="">` : ''}
      <div><h3>${esc(T(company.name) || 'Company Name')}</h3>${m.coLines.map(l => `<p>${esc(l)}</p>`).join('')}</div></div>
    <div class="qt"><i></i><h4>QUOTATION</h4>
      <p><span>Quote No:</span> <b>${esc(T(q.no))}</b></p><p><span>Date:</span> <b>${esc(fmtDate(q.date))}</b></p></div>
  </div>
  <div class="cu">
    <div><div class="lbl">TO</div><b>${esc(T(cust.name) || 'Customer Name')}</b>${m.custAddr.map(l => `<p>${esc(l)}</p>`).join('')}</div>
    <div>${m.custRight.map(([l, v]) => `<p><span>${l}:</span> ${esc(v)}</p>`).join('')}</div>
  </div>`;
  let bd, tbody;
  const newSheet = (first, withTable) => {
    const s = document.createElement('div'); s.className = 'sheet';
    s.innerHTML = '<div class="bd"></div><div class="ft"><i></i>THANK YOU FOR YOUR BUSINESS<span class="pg"></span></div>';
    host.appendChild(s); sheets.push(s); bd = s.querySelector('.bd');
    if (first) bd.innerHTML = headerHTML;
    if (withTable) { bd.insertAdjacentHTML('beforeend', `<table>${thead}<tbody></tbody></table>`); tbody = bd.querySelector('tbody'); }
  };
  const place = html => {           // add a block; if it overflows, move it to a fresh page
    bd.insertAdjacentHTML('beforeend', html);
    if (bd.offsetHeight > LIMIT) { bd.lastElementChild.remove(); newSheet(false, false); bd.insertAdjacentHTML('beforeend', html); }
  };
  newSheet(true, true);
  m.rows.forEach((r, i) => {
    tbody.insertAdjacentHTML('beforeend', rowHTML(r, i));
    if (bd.offsetHeight > LIMIT && tbody.rows.length > 1) { const tr = tbody.lastElementChild; tr.remove(); newSheet(false, true); tbody.appendChild(tr); }
  });
  place(`<div class="total"><span>TOTAL AMOUNT</span><b>₹ ${fmt(m.total)}</b></div>`);
  if (m.notes.length) place(`<div class="notes"><div class="lbl">NOTES</div><ol>${m.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ol></div>`);
  if (sheets.length > 1) sheets.forEach((s, i) => s.querySelector('.pg').textContent = `Page ${i + 1} of ${sheets.length}`);
  return sheets;
}
let pvFrame;
function renderPreview() {
  cancelAnimationFrame(pvFrame);
  pvFrame = requestAnimationFrame(() => { paginate($('#pages')); fitPreview(); });
}
function fitPreview() {
  const wrap = $('#pvWrap'), pages = $('#pages');
  const s = Math.min(1, wrap.clientWidth / 794);
  pages.style.transform = `scale(${s})`;
  wrap.style.height = pages.offsetHeight * s + 'px';
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

/* ---------- PDF: the sheets shown in the preview are captured 1:1 ---------- */
async function generatePDF() {
  const errs = validate(), box = $('#errors');
  if (errs.length) { box.hidden = false; box.innerHTML = `<b>Please fix the following:</b><ul>${errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`; box.scrollIntoView({behavior: 'smooth', block: 'center'}); return; }
  box.hidden = true;
  const btn = $('#generate'), busy = $('#busy'); btn.disabled = true; busy.hidden = false;
  const y0 = window.scrollY; let host;
  try {
    if (!window.jspdf || !window.html2canvas) throw new Error('PDF libraries did not load. Please refresh the page and try again.');
    await (document.fonts && document.fonts.ready);
    window.scrollTo(0, 0);
    host = document.createElement('div'); host.className = 'pdfhost'; document.body.appendChild(host);
    const sheets = paginate(host);
    await new Promise(r => setTimeout(r, 50));
    const doc = new window.jspdf.jsPDF({unit: 'mm', format: 'a4', orientation: 'portrait', compress: true});
    for (let i = 0; i < sheets.length; i++) {
      const cv = await html2canvas(sheets[i], {scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: 1200});
      if (i) doc.addPage();
      doc.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    const clean = s => T(s).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'Quotation';
    doc.save(`Quotation_${clean(q.no)}_${clean(cust.name)}.pdf`);
    const mt = T(q.no).match(/^(.*?)(\d+)$/);                        // suggest next number
    if (mt) { q.no = mt[1] + String(+mt[2] + 1).padStart(mt[2].length, '0'); save('qg_next', q.no); document.querySelector('[data-q=no]').value = q.no; }
  } catch (err) {
    console.error(err); box.hidden = false; box.innerHTML = `<b>Could not generate the PDF.</b><ul><li>${esc(err.message || err)}</li></ul>`;
  } finally {
    if (host) host.remove();
    busy.hidden = true; btn.disabled = false; window.scrollTo(0, y0); renderPreview();
  }
}
$('#generate').onclick = generatePDF;

/* ---------- Init ---------- */
document.querySelectorAll('[data-c]').forEach(el => el.value = company[el.dataset.c] || '');
document.querySelectorAll('[data-q]').forEach(el => el.value = q[el.dataset.q]);
syncLogo(); renderItems(); renderPreview();
