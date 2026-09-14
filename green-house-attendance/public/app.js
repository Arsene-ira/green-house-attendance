const API = '/api/data';
const TERM_START = '2026-08-10'; // Monday — adjust if your term starts elsewhere
const STATUS_CYCLE = ['', 'P', 'A', 'S', 'T', 'Su'];
const STATUS_LABEL = { P: 'P', A: 'A', S: 'S', T: 'T', Su: 'Su' };
const TARDY_THRESHOLD = 3;

let state = { roster: [], attendance: {} };
let saveTimer = null;

// ---------- data layer ----------

async function loadData() {
  const res = await fetch(API);
  state = await res.json();
  renderAll();
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveData, 500);
}

async function saveData() {
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  });
}

// ---------- helpers ----------

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoOf(date) {
  return date.toISOString().slice(0, 10);
}

function fmtWeekLabel(date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function studentTotals(studentId) {
  const totals = { P: 0, A: 0, S: 0, T: 0, Su: 0 };
  for (const date in state.attendance) {
    const status = state.attendance[date][studentId];
    if (status && totals[status] !== undefined) totals[status]++;
  }
  return totals;
}

// ---------- tab switching ----------

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'grid') renderGrid();
    if (btn.dataset.view === 'totals') renderTotals();
  });
});

function flash(msg) {
  const el = document.getElementById('status-banner');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(flash._t);
  flash._t = setTimeout(() => el.classList.add('hidden'), 1800);
}

// ---------- Mark view ----------

const dateInput = document.getElementById('mark-date');
dateInput.value = todayISO();
dateInput.addEventListener('change', renderMark);

function renderMark() {
  const date = dateInput.value;
  const list = document.getElementById('mark-list');
  list.innerHTML = '';
  if (!state.attendance[date]) state.attendance[date] = {};

  state.roster.forEach(s => {
    const li = document.createElement('li');
    li.className = 'mark-row';

    const tardyCount = studentTotals(s.id).T;
    const flagHtml = tardyCount >= TARDY_THRESHOLD
      ? `<div class="flag">⚠ ${tardyCount} tardies — suspension note</div>` : '';

    li.innerHTML = `
      <div class="who">
        <div class="name">${s.name}</div>
        <div class="cls">${s.cls}</div>
        ${flagHtml}
      </div>
      <button class="status-btn" data-id="${s.id}" data-status="${state.attendance[date][s.id] || ''}">
        ${STATUS_LABEL[state.attendance[date][s.id]] || '—'}
      </button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const current = state.attendance[date][id] || '';
      const idx = STATUS_CYCLE.indexOf(current);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      if (next === '') delete state.attendance[date][id];
      else state.attendance[date][id] = next;

      btn.dataset.status = next;
      btn.textContent = STATUS_LABEL[next] || '—';
      queueSave();
      renderMark(); // refresh tardy flags live
    });
  });
}

// ---------- Grid view ----------

function renderGrid() {
  const wrap = document.getElementById('grid-wrap');

  const markedDates = Object.keys(state.attendance);
  const lastMarked = markedDates.sort().slice(-1)[0] || todayISO();
  const end = new Date(lastMarked) > new Date(todayISO()) ? lastMarked : todayISO();

  let cursor = mondayOf(TERM_START);
  const endMonday = mondayOf(end);
  const weeks = [];
  while (cursor <= endMonday && weeks.length < 26) {
    weeks.push(new Date(cursor));
    cursor = addDays(cursor, 7);
  }

  const dayLabels = ['M', 'T', 'W', 'Th', 'F'];
  let html = '<table class="grid"><thead><tr><th class="name-cell" rowspan="2">Student</th>';
  weeks.forEach(w => { html += `<th class="week-label" colspan="5">${fmtWeekLabel(w)}</th>`; });
  html += '</tr><tr>';
  weeks.forEach(() => { dayLabels.forEach(d => { html += `<th class="day-label">${d}</th>`; }); });
  html += '</tr></thead><tbody>';

  state.roster.forEach(s => {
    html += `<tr><td class="name-cell">${s.name}<br><span style="font-size:10px;color:var(--ink-soft)">${s.cls}</span></td>`;
    weeks.forEach(w => {
      for (let i = 0; i < 5; i++) {
        const date = isoOf(addDays(w, i));
        const status = (state.attendance[date] || {})[s.id] || '';
        html += `<td class="${status ? 'cell-' + status : ''}">${STATUS_LABEL[status] || ''}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

// ---------- Totals view ----------

function renderTotals() {
  const wrap = document.getElementById('totals-wrap');
  wrap.innerHTML = `<div class="legend">
    <span><i style="background:var(--present)"></i>Present</span>
    <span><i style="background:var(--absent)"></i>Absent</span>
    <span><i style="background:var(--sick)"></i>Sick</span>
    <span><i style="background:var(--tardy)"></i>Tardy</span>
    <span><i style="background:var(--suspended)"></i>Suspended</span>
  </div>`;

  state.roster.forEach(s => {
    const t = studentTotals(s.id);
    const card = document.createElement('div');
    card.className = 'totals-card';
    card.innerHTML = `
      <div class="name">${s.name}</div>
      <div class="cls">${s.cls}</div>
      <div class="totals-row">
        <div class="t-present">Present<span>${t.P}</span></div>
        <div class="t-absent">Absent<span>${t.A}</span></div>
        <div class="t-sick">Sick<span>${t.S}</span></div>
        <div class="t-tardy">Tardy<span>${t.T}</span></div>
        <div class="t-suspended">Suspended<span>${t.Su}</span></div>
      </div>
      ${t.T >= TARDY_THRESHOLD ? `<div class="suspension-note">⚠ ${t.T} tardies reached — suspension note</div>` : ''}
    `;
    wrap.appendChild(card);
  });
}

// ---------- Students view ----------

function renderStudents() {
  const list = document.getElementById('students-list');
  list.innerHTML = '';
  state.roster.forEach(s => {
    const li = document.createElement('li');
    li.className = 'student-row';
    li.innerHTML = `
      <input type="text" value="${s.name}" data-id="${s.id}" data-field="name">
      <select data-id="${s.id}" data-field="cls">
        ${['S1','S2','S3','S4','S5','S6'].map(c => `<option ${c === s.cls ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <button class="remove-btn" data-id="${s.id}">Remove</button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', () => {
      const id = Number(el.dataset.id);
      const field = el.dataset.field;
      const student = state.roster.find(s => s.id === id);
      student[field] = el.value;
      queueSave();
      flash('Saved');
    });
  });

  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      if (!confirm('Remove this student? Their attendance history will be kept but hidden.')) return;
      state.roster = state.roster.filter(s => s.id !== id);
      queueSave();
      renderAll();
    });
  });
}

document.getElementById('add-student-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('new-name').value.trim();
  const cls = document.getElementById('new-class').value;
  if (!name) return;
  const nextId = state.roster.length ? Math.max(...state.roster.map(s => s.id)) + 1 : 1;
  state.roster.push({ id: nextId, name, cls });
  document.getElementById('new-name').value = '';
  queueSave();
  renderAll();
  flash('Student added');
});

// ---------- init ----------

function renderAll() {
  renderMark();
  renderStudents();
  const activeView = document.querySelector('.tab-btn.active').dataset.view;
  if (activeView === 'grid') renderGrid();
  if (activeView === 'totals') renderTotals();
}

loadData();
