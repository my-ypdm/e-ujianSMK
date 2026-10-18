/* PORTAL SMK DUA MEI — jadwal dari Admin Pusat. */
const SCHEDULE_JSON_URL = 'https://my-ypdm.github.io/e-ujian-admindm/data/smk.json';
const SMK_CONFIG = {
  classes: {
    X: { label: 'Kelas X', majors: ['UMUM', 'MPLB', 'DKV', 'TJKT', 'AKL'] },
    XI: { label: 'Kelas XI', majors: ['MPLB', 'DKV', 'TJKT'] },
    XII: { label: 'Kelas XII', majors: ['DKV', 'TJKT'] }
  },
  ids: {
    'X-MPLB':'KLS-SMK-X-MPLB','X-DKV':'KLS-SMK-X-DKV','X-TJKT':'KLS-SMK-X-TJKT','X-AKL':'KLS-SMK-X-AKL',
    'XI-MPLB':'KLS-SMK-XI-MPLB','XI-DKV':'KLS-SMK-XI-DKV','XI-TJKT':'KLS-SMK-XI-TJKT',
    'XII-DKV':'KLS-SMK-XII-DKV','XII-TJKT':'KLS-SMK-XII-TJKT'
  }
};
const params = new URLSearchParams(location.search);
const grade = (params.get('kelas') || 'X').toUpperCase();
const major = (params.get('jurusan') || 'UMUM').toUpperCase();
const subjectName = params.get('mapel') || '';
const gradeInfo = SMK_CONFIG.classes[grade] || SMK_CONFIG.classes.X;
const enc = encodeURIComponent;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const majorLabel = major === 'UMUM' ? 'Mata Pelajaran Umum' : 'Jurusan ' + major;
let scheduleRows = [];
let scheduleLoadError = '';
let scheduleLoaded = false;
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function norm(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function classId() { return SMK_CONFIG.ids[`${grade}-${major}`] || ''; }
function rowClassText(row) { return [row.kelas, row.nama_kelas, row.class_name, row.kelas_nama, row.kelas_id, row.id_kelas].filter(Boolean).join(' '); }
function rowMatchesClass(row) {
  const id = classId();
  if (!id) return false;
  const rowId = String(row.kelas_id || row.id_kelas || row.class_id || row.id_kelas_portal || '').trim();
  if (rowId && rowId === id) return true;
  const text = norm(rowClassText(row));
  if (text.includes(norm(id))) return true;
  const g = norm(grade), m = norm(major);
  // Match a full grade token and the requested major; prevents X matching XI/XII.
  const raw = String(rowClassText(row)).toUpperCase();
  const gradeMatch = new RegExp(`(^|[^A-Z0-9])${grade}([^A-Z0-9]|$)`).test(raw) || norm(raw).startsWith(g + m) || norm(raw).includes('KLS' + norm('SMK-' + grade + '-' + major));
  return gradeMatch && (major === 'UMUM' ? !/(MPLB|DKV|TJKT|AKL)/.test(raw) : text.includes(m));
}
function rowsForCurrentClass() { return scheduleRows.filter(rowMatchesClass); }
function rowsForSubject(name) { return rowsForCurrentClass().filter(row => String(row.mapel || row.nama_mapel || '').trim() === String(name || '').trim()); }
function compareSchedule(a,b) { return `${a.tanggal || ''} ${a.jam_mulai || ''}`.localeCompare(`${b.tanggal || ''} ${b.jam_mulai || ''}`); }
function formatDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(value || 'Tanggal belum ditentukan');
  return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(+m[1],+m[2]-1,+m[3]));
}
function rowSummary(row) {
  const parts=[]; if(row.tanggal) parts.push(formatDate(row.tanggal));
  const start=String(row.jam_mulai||'').trim(), end=String(row.jam_selesai||'').trim();
  if(start||end) parts.push(start&&end?`${start}–${end}`:(start||end));
  if(row.status) parts.push(String(row.status));
  return parts.join(' · ') || 'Jadwal tersedia';
}
function subjectSummary(rows) { const sorted=[...rows].sort(compareSchedule); return sorted.length ? `${rowSummary(sorted[0])}${sorted.length>1?` · ${sorted.length} jadwal`:''}` : ''; }
async function loadScheduleJson() {
  if(scheduleLoaded) return !scheduleLoadError;
  scheduleLoaded=true;
  try {
    const response=await fetch(SCHEDULE_JSON_URL,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    if(!payload || !Array.isArray(payload.jadwal)) throw new Error('Format JSON tidak memiliki daftar jadwal.');
    scheduleRows=payload.jadwal.filter(r=>r && (r.mapel||r.nama_mapel)).map(r=>({...r,mapel:String(r.mapel||r.nama_mapel).trim()})).sort(compareSchedule);
    return true;
  } catch(error) { console.error('Gagal memuat jadwal SMK:',error); scheduleLoadError='Jadwal belum dapat dimuat dari Admin Pusat. Pastikan JSON sudah diterbitkan dan koneksi internet tersedia.'; return false; }
}
function emptyState(message) { const el=document.createElement('div'); el.className='empty-state'; el.textContent=message; return el; }
function renderMajors() {
  const grid=document.getElementById('majorGrid'); if(!grid)return;
  document.getElementById('breadcrumbClass').textContent=gradeInfo.label;
  document.getElementById('pageTitle').textContent='Pilih Jurusan '+gradeInfo.label;
  document.getElementById('pageDescription').textContent='Pilih jurusan atau kelompok mapel umum.';
  grid.className='choice-grid'; grid.replaceChildren();
  gradeInfo.majors.forEach(k=>{const title=k==='UMUM'?'Mata Pelajaran Umum':'Jurusan '+k,a=document.createElement('a');a.className='choice-card';a.href=`mapel.html?kelas=${enc(grade)}&jurusan=${enc(k)}`;a.innerHTML=`<span class="choice-symbol">${esc(k==='UMUM'?'UM':k)}</span><span class="choice-content"><b>${esc(title)}</b><small>${esc(k==='UMUM'?'Mapel umum kelas X':'Daftar mapel '+k)}</small></span><span class="arrow">→</span>`;grid.append(a);});
}
async function renderSubjects() {
  const list=document.getElementById('subjectList'); if(!list)return;
  document.getElementById('pageTitle').textContent=majorLabel+' · '+gradeInfo.label;
  document.getElementById('pageDescription').textContent='Pilih mata pelajaran untuk melihat jadwal dan akses ujian.';
  document.getElementById('majorBreadcrumb').textContent=majorLabel; document.getElementById('majorBreadcrumb').href=`jurusan.html?kelas=${enc(grade)}`;
  document.getElementById('backToMajor').href=`jurusan.html?kelas=${enc(grade)}`; list.replaceChildren();
  if(!gradeInfo.majors.includes(major)){list.append(emptyState('Jurusan tidak tersedia untuk tingkat ini.'));return;}
  if(!await loadScheduleJson()){list.append(emptyState(scheduleLoadError));return;}
  const rows=rowsForCurrentClass();
  if(!rows.length){list.append(emptyState(`Belum ada jadwal untuk ${gradeInfo.label} ${major==='UMUM'?'':major}. Pastikan kelas dan jurusan pada Admin Pusat sesuai, lalu terbitkan JSON kembali.`));return;}
  const names=unique(rows.map(r=>r.mapel)).sort((a,b)=>a.localeCompare(b,'id'));
  names.forEach((name,i)=>{const a=document.createElement('a');a.className='subject-link';a.href=`akses-ujian.html?kelas=${enc(grade)}&jurusan=${enc(major)}&mapel=${enc(name)}`;const icon=document.createElement('span');icon.className='subject-icon';icon.textContent=['▤','∑','A','⚗','◈','⌘'][i%6];const content=document.createElement('span');content.style.flex='1';const title=document.createElement('b');title.textContent=name;const summary=document.createElement('small');summary.textContent=subjectSummary(rows.filter(r=>r.mapel===name));summary.style.display='block';summary.style.marginTop='4px';summary.style.fontSize='11px';summary.style.color='var(--muted)';content.append(title,summary);const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='→';a.append(icon,content,arrow);list.append(a);});
}
async function renderExam() {
  const panel=document.getElementById('examAccess');if(!panel)return;
  document.getElementById('majorBreadcrumb').textContent=majorLabel;document.getElementById('majorBreadcrumb').href=`jurusan.html?kelas=${enc(grade)}`;
  document.getElementById('subjectBreadcrumb').textContent=subjectName||'Mata Pelajaran';document.getElementById('subjectBreadcrumb').href=`mapel.html?kelas=${enc(grade)}&jurusan=${enc(major)}`;document.getElementById('backToSubjects').href=`mapel.html?kelas=${enc(grade)}&jurusan=${enc(major)}`;
  document.getElementById('examTitle').textContent=subjectName||'Akses Ujian';document.getElementById('examDescription').textContent=`${gradeInfo.label} · ${majorLabel} · SMK Dua Mei`;panel.replaceChildren();
  if(!await loadScheduleJson()){panel.append(emptyState(scheduleLoadError));return;}
  if(!subjectName){panel.append(emptyState('Silakan kembali dan pilih mata pelajaran dari daftar.'));return;}
  const relevant=rowsForSubject(subjectName).sort(compareSchedule);
  if(!relevant.length){panel.append(emptyState(`Belum ada jadwal untuk ${subjectName} pada ${gradeInfo.label} ${major}.`));return;}
  relevant.forEach(row=>{const card=document.createElement('div');card.className='schedule-item';const url=String(row.link_ujian||'').trim(),validUrl=/^https?:\/\//i.test(url);const status=document.createElement('div');status.className=`exam-status ${validUrl?'available':'pending'}`;const dot=document.createElement('span');dot.className='status-dot';status.append(dot,document.createTextNode(validUrl?'Link ujian tersedia':'Link belum tersedia'));const heading=document.createElement('h2');heading.textContent=subjectName;const detail=document.createElement('p');detail.textContent=rowSummary(row);card.append(status,heading,detail);if(validUrl){const link=document.createElement('a');link.className='button button-orange';link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Buka Ujian →';card.append(link);}else{const note=document.createElement('p');note.textContent='Jadwal sudah terdaftar, tetapi link ujian belum diaktifkan. Silakan hubungi guru atau pengawas ujian.';card.append(note);}panel.append(card);});
}
function setupSidebar(){const s=document.getElementById('sidebar'),t=document.getElementById('sidebarToggle'),b=document.getElementById('sidebarBackdrop');if(!s||!t||!b)return;const close=()=>{s.classList.remove('is-open');b.classList.remove('is-visible');t.setAttribute('aria-expanded','false');t.setAttribute('aria-label','Buka menu');t.textContent='☰';document.body.classList.remove('menu-open')};const open=()=>{s.classList.add('is-open');b.classList.add('is-visible');t.setAttribute('aria-expanded','true');t.setAttribute('aria-label','Tutup menu');t.textContent='×';document.body.classList.add('menu-open')};t.addEventListener('click',()=>s.classList.contains('is-open')?close():open());b.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});s.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));}
document.addEventListener('DOMContentLoaded',()=>{setupSidebar();renderMajors();renderSubjects();renderExam();});
