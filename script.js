/* ══════════════════════════════════════════════
   QueuePro — Next-Gen JavaScript Engine (Hackathon Pro Edition)
   Features:
   1. Multi-Counter Operations (C-1 to C-4)
   2. Web Audio Synthesized Chime + Web Speech TTS Voice Announcer
   3. Python REST Backend Auto-Detect with LocalStorage Fallback
   4. Public TV Display Board (Airport / Campus Kiosk Mode)
   5. Dynamic Priority Queue (Tatkal, Specially-Abled, Regular)
   6. AI Wait Time Heuristic Engine v2.1
   7. AI Document Pre-Verification OCR Scanner
   8. Live Student-Admin Chat & Query Desk
   9. QR Code Pass Wallet & Admin Camera Scanner Simulator
   10. WhatsApp Notification Gateway & .ICS Calendar Export
   11. Anti-No-Show Grace Period Countdown (120s)
   12. Feedback Sentiment & Net Promoter Score Engine
══════════════════════════════════════════════ */

// ─── Global State ───
const state = {
  role: 'student',
  college: 'IIT Delhi',
  userName: 'Aditya Kumar',
  theme: 'dark',
  selectedService: 'Examination Form',
  selectedPriority: 'Regular',
  selectedTime: '10:00 AM',
  currentRating: 5,
  queuePosition: 5,
  tokenNumber: 'T-0049',
  assignedCounter: 'C-1',
  queuePaused: false,
  currentServing: 42,
  broadcastType: 'info',
  soundEnabled: true,
  backendConnected: false,
  apiBase: 'http://localhost:8000',
  graceSeconds: 120,
  graceTimer: null,
  activeAdminThread: 'T-0049',

  // Multi-Counter State
  counters: [
    { id: 'C-1', name: 'Counter C-1', service: 'Examination Form', officer: 'Dr. Sharma', status: 'Open', currentToken: 'T-0042', avgWait: 2 },
    { id: 'C-2', name: 'Counter C-2', service: 'TC / Migration', officer: 'Prof. Verma', status: 'Open', currentToken: 'T-0043', avgWait: 3 },
    { id: 'C-3', name: 'Counter C-3', service: 'Scholarship & Fees', officer: 'Mr. Joshi', status: 'Open', currentToken: 'T-0044', avgWait: 4 },
    { id: 'C-4', name: 'Counter C-4 (Express)', service: 'Express / Tatkal Helpdesk', officer: 'Ms. Sneha', status: 'Open', currentToken: 'T-0045', avgWait: 1 }
  ],

  // Queue Tokens
  adminStudents: [
    { token:'T-0042', name:'Rahul Sharma',  service:'Examination Form', time:'10:00 AM', priority:'Regular', counter:'C-1', status:'Processing' },
    { token:'T-0043', name:'Priya Gupta',   service:'TC / Migration',   time:'10:15 AM', priority:'Regular', counter:'C-2', status:'Processing' },
    { token:'T-0044', name:'Aman Singh',    service:'Scholarship',      time:'10:30 AM', priority:'Tatkal', counter:'C-3', status:'Waiting' },
    { token:'T-0045', name:'Sneha Patel',   service:'Bonafide Cert.',   time:'10:45 AM', priority:'Specially-Abled', counter:'C-4', status:'Waiting' },
    { token:'T-0046', name:'Karan Mehta',   service:'ID Card',          time:'11:00 AM', priority:'Regular', counter:'C-1', status:'Waiting' },
    { token:'T-0047', name:'Riya Verma',    service:'Fee Submission',   time:'11:15 AM', priority:'Regular', counter:'C-3', status:'Waiting' },
    { token:'T-0048', name:'Nikhil Joshi',  service:'Examination Form', time:'11:30 AM', priority:'Regular', counter:'C-1', status:'Waiting' },
    { token:'T-0049', name:'Aditya Kumar',  service:'Examination Form', time:'11:45 AM', priority:'Regular', counter:'C-1', status:'Waiting' },
    { token:'T-0050', name:'Pooja Das',     service:'Scholarship',      time:'12:00 PM', priority:'Regular', counter:'C-3', status:'Waiting' },
  ],

  // Messages between student and admin
  messages: [
    { id: 1, token: 'T-0049', sender: 'admin', text: 'Welcome to QueuePro! Please keep your Aadhar and college ID verified.', time: '10:02 AM' },
    { id: 2, token: 'T-0049', sender: 'student', text: 'Do I need physical photocopies or digital scan copies?', time: '10:05 AM' },
    { id: 3, token: 'T-0049', sender: 'admin', text: 'Digital scan verified on the app is sufficient for Counter C-1.', time: '10:06 AM' }
  ]
};

// ─── DOM Ready Initialization ───
window.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  setToday();
  checkBackendStatus();
  renderCountersGrid();
  generateQueuePeople();
  generateQueueList();
  generateQRCode();
  initBusyChart();
  animateCounters();
  renderChatMessages('student');
  renderChatMessages('admin');
  startLiveUpdates();
  startTVClock();
  startGracePeriodCountdown();
});

// ══════════════════════════════════════════
//  BACKEND API SYNC & HYBRID LOCAL STORAGE
// ══════════════════════════════════════════
async function checkBackendStatus() {
  const badgeEls = [
    document.getElementById('backend-status-badge'),
    document.getElementById('a-backend-status-badge'),
    document.getElementById('landing-server-status')
  ];

  try {
    const res = await fetch(`${state.apiBase}/api/status`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      state.backendConnected = true;
      badgeEls.forEach(el => {
        if (!el) return;
        el.innerHTML = '<span class="status-indicator-dot online"></span><span class="backend-label">Backend: SQLite Live (Port 8000)</span>';
      });
      const landingText = document.getElementById('landing-status-text');
      if (landingText) landingText.textContent = 'Backend: Python SQLite Server Active';
      syncFromBackend();
    } else {
      throw new Error('Non-200 response');
    }
  } catch (err) {
    state.backendConnected = false;
    badgeEls.forEach(el => {
      if (!el) return;
      el.innerHTML = '<span class="status-indicator-dot offline"></span><span class="backend-label">⚡ Standalone Browser Engine</span>';
    });
    const landingText = document.getElementById('landing-status-text');
    if (landingText) landingText.textContent = 'Standalone Mode (Offline Local Engine)';
  }
}

async function syncFromBackend() {
  if (!state.backendConnected) return;
  try {
    const res = await fetch(`${state.apiBase}/api/queue`);
    if (res.ok) {
      const data = await res.json();
      if (data.tokens && data.tokens.length) {
        state.adminStudents = data.tokens.map(t => ({
          token: t.token_num,
          name: t.student_name,
          service: t.service,
          time: t.time_slot,
          priority: t.priority || 'Regular',
          counter: t.counter || 'C-1',
          status: t.status
        }));
      }
      if (data.counters && data.counters.length) {
        state.counters = data.counters.map(c => ({
          id: c.id,
          name: c.name,
          service: c.service,
          officer: c.officer,
          status: c.status,
          currentToken: c.current_token,
          avgWait: c.avg_wait_min
        }));
      }
      renderCountersGrid();
      generateQueueList();
      buildAdminStudents();
      buildUpcoming();
      buildTodayWork();
      buildFullTokenList();
    }
  } catch (e) {
    console.warn('Backend sync retry scheduled:', e);
  }
}

// ══════════════════════════════════════════
//  WEB AUDIO CHIME & SPEECH TTS SYNTHESIZER
// ══════════════════════════════════════════
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Synthesizes an authentic airport/train station chime (F4 -> A4 -> C5)
function playChimeSound() {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [349.23, 440.00, 523.25]; // F4, A4, C5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.22);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.22);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.22 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.22 + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + idx * 0.22);
      osc.stop(ctx.currentTime + idx * 0.22 + 0.85);
    });
  } catch (e) {
    console.log('Audio chime synthesis fallback:', e);
  }
}

function speakAnnouncement(token, counter, service) {
  if (!state.soundEnabled) return;
  playChimeSound();

  if ('speechSynthesis' in window) {
    setTimeout(() => {
      window.speechSynthesis.cancel();
      const cleanToken = token.replace('-', ' ');
      const utterance = new SpeechSynthesisUtterance(`Attention please. Token number ${cleanToken}, please proceed to ${counter} for ${service}.`);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }, 700);
  }
}

function testChimeSound() {
  showToast('🔊 Playing Voice Call Demonstration...');
  speakAnnouncement('T-0042', 'Counter C-1', 'Examination Form');
}

function toggleAudio() {
  state.soundEnabled = !state.soundEnabled;
  const btns = [document.getElementById('audio-toggle-btn'), document.getElementById('a-audio-toggle-btn')];
  btns.forEach(btn => {
    if (!btn) return;
    btn.innerHTML = state.soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    btn.classList.toggle('active', state.soundEnabled);
  });
  showToast(state.soundEnabled ? '🔊 Audio Chimes & TTS Enabled' : '🔇 Audio Muted');
}

// ══════════════════════════════════════════
//  MULTI-COUNTER DESKS RENDERING
// ══════════════════════════════════════════
function renderCountersGrid() {
  // Update Topbar Mini Ticker
  const c1Tok = state.counters.find(c => c.id === 'C-1')?.currentToken || 'T-0042';
  const c2Tok = state.counters.find(c => c.id === 'C-2')?.currentToken || 'T-0043';
  const c3Tok = state.counters.find(c => c.id === 'C-3')?.currentToken || 'T-0044';
  const c4Tok = state.counters.find(c => c.id === 'C-4')?.currentToken || 'T-0045';

  if (document.getElementById('tb-c1-tok')) document.getElementById('tb-c1-tok').textContent = c1Tok;
  if (document.getElementById('tb-c2-tok')) document.getElementById('tb-c2-tok').textContent = c2Tok;
  if (document.getElementById('tb-c3-tok')) document.getElementById('tb-c3-tok').textContent = c3Tok;
  if (document.getElementById('tb-c4-tok')) document.getElementById('tb-c4-tok').textContent = c4Tok;

  // Render Student Counter Pulse Cards
  const studentGrid = document.getElementById('student-counters-grid');
  if (studentGrid) {
    studentGrid.innerHTML = state.counters.map(c => `
      <div class="counter-pulse-card ${c.id === state.assignedCounter ? 'active-desk' : ''}">
        <div class="cpc-header">
          <span class="cpc-badge">${c.name}</span>
          <span class="cpc-status ${c.status.toLowerCase()}">${c.status}</span>
        </div>
        <div class="cpc-serving-num">${c.currentToken || '—'}</div>
        <div class="cpc-service-title">${c.service}</div>
        <div class="cpc-footer">
          <span><i class="fas fa-user-tie"></i> ${c.officer}</span>
          <span>~${c.avgWait}m avg</span>
        </div>
      </div>
    `).join('');
  }

  // Render Admin Counters Strip
  const adminStrip = document.getElementById('admin-counters-strip');
  if (adminStrip) {
    adminStrip.innerHTML = state.counters.map(c => `
      <div class="cas-item">
        <div style="display:flex;justify-content:space-between">
          <strong>${c.name}</strong>
          <span class="chip ${c.status === 'Open' ? 'green' : 'orange'}">${c.status}</span>
        </div>
        <div style="font-size:1.1rem;font-weight:700;margin:4px 0">${c.currentToken || 'Idle'}</div>
        <small>${c.service}</small>
        <div class="cas-actions">
          <button class="btn-sm" onclick="callNextForCounter('${c.id}')"><i class="fas fa-forward"></i> Next</button>
          <button class="btn-sm red-btn" onclick="toggleCounterStatus('${c.id}')">${c.status === 'Open' ? 'Pause' : 'Open'}</button>
        </div>
      </div>
    `).join('');
  }

  // Render Admin Full Counters Grid
  const adminFullGrid = document.getElementById('admin-counters-full-grid');
  if (adminFullGrid) {
    adminFullGrid.innerHTML = state.counters.map(c => `
      <div class="counter-manage-card glass-card">
        <div class="cmc-header">
          <div>
            <h3 style="font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--accent-cyan)">${c.name}</h3>
            <p style="color:var(--text-sec);font-size:0.85rem">${c.service}</p>
          </div>
          <span class="chip ${c.status === 'Open' ? 'green' : 'orange'}">${c.status}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0;padding:12px;background:rgba(255,255,255,0.04);border-radius:10px">
          <div>
            <span style="font-size:0.75rem;color:var(--text-sec)">Current Active Token</span>
            <div style="font-size:1.8rem;font-weight:800;font-family:'Syne',sans-serif">${c.currentToken || 'None'}</div>
          </div>
          <div style="text-align:right">
            <span style="font-size:0.75rem;color:var(--text-sec)">Officer in Charge</span>
            <div style="font-weight:600">${c.officer}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-primary btn-sm full-width" onclick="callNextForCounter('${c.id}')"><i class="fas fa-bullhorn"></i> Call Next</button>
          <button class="btn-outline btn-sm full-width" onclick="toggleCounterStatus('${c.id}')">${c.status === 'Open' ? 'Pause Desk' : 'Resume Desk'}</button>
          <button class="btn-outline btn-sm" onclick="reassignOfficerPrompt('${c.id}')"><i class="fas fa-user-edit"></i></button>
        </div>
      </div>
    `).join('');
  }

  // Render TV Display Board Counters
  renderTVCounters();
}

function toggleCounterStatus(counterId) {
  const c = state.counters.find(x => x.id === counterId);
  if (!c) return;
  c.status = c.status === 'Open' ? 'Paused' : 'Open';
  renderCountersGrid();
  showToast(`${c.name} is now ${c.status}`);
}

function callNextForCounter(counterId) {
  const c = state.counters.find(x => x.id === counterId);
  if (!c) return;
  
  // Find next waiting token
  const nextTok = state.adminStudents.find(s => s.status === 'Waiting');
  if (nextTok) {
    nextTok.status = 'Processing';
    nextTok.counter = counterId;
    c.currentToken = nextTok.token;
    renderCountersGrid();
    buildAdminStudents();
    speakAnnouncement(nextTok.token, c.name, nextTok.service);
    showToast(`📢 Called ${nextTok.token} to ${c.name}`);
  } else {
    showToast(`⚠️ No more students waiting for ${c.name}`);
  }
}

// ══════════════════════════════════════════
//  PUBLIC TV DISPLAY BOARD (AIRPORT KIOSK)
// ══════════════════════════════════════════
function openTVMode() {
  switchPage('tv-page');
  renderTVCounters();
  renderTVNextQueue();
  showToast('📺 TV Display Board Activated');
}

function exitTVMode() {
  switchPage(state.role === 'admin' ? 'admin-page' : 'student-page');
}

function startTVClock() {
  setInterval(() => {
    const timeEl = document.getElementById('tv-live-time');
    const dateEl = document.getElementById('tv-live-date');
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-IN', { hour12: true });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }, 1000);
}

function renderTVCounters() {
  const container = document.getElementById('tv-counters-container');
  if (!container) return;
  container.innerHTML = state.counters.map(c => `
    <div class="tv-counter-card ${c.currentToken ? 'active-calling' : ''}">
      <div class="tcc-top">
        <span class="tcc-name">${c.name}</span>
        <span class="chip ${c.status === 'Open' ? 'green' : 'orange'}">${c.status.toUpperCase()}</span>
      </div>
      <div class="tcc-token">${c.currentToken || 'IDLE'}</div>
      <div class="tcc-service">${c.service}</div>
      <div class="tcc-footer">
        <span><i class="fas fa-user-tie"></i> ${c.officer}</span>
        <span class="cyan-text"><i class="fas fa-bolt"></i> Fast Desk</span>
      </div>
    </div>
  `).join('');
}

function renderTVNextQueue() {
  const list = document.getElementById('tv-next-list');
  if (!list) return;
  const waiting = state.adminStudents.filter(s => s.status === 'Waiting').slice(0, 5);
  list.innerHTML = waiting.map((s, idx) => `
    <div class="tv-next-item">
      <div>
        <strong>${s.token}</strong>
        <div class="tv-ni-desc">${s.name} · ${s.service}</div>
      </div>
      <span class="tv-ni-tag chip ${s.priority === 'Tatkal' ? 'orange' : s.priority === 'Specially-Abled' ? 'purple' : 'cyan'}">
        ${s.priority}
      </span>
    </div>
  `).join('');
}

// ══════════════════════════════════════════
//  PRIORITY SLOT BOOKING & TATKAL
// ══════════════════════════════════════════
function selectPriority(el, prio) {
  document.querySelectorAll('.priority-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  state.selectedPriority = prio;
  showToast(`⭐ Selected Priority: ${prio}`);
}

async function confirmBooking() {
  const date = document.getElementById('booking-date').value;
  if (!date) { showToast('⚠️ Please select a date'); return; }
  if (!state.selectedTime) { showToast('⚠️ Please select a time slot'); return; }

  // Generate new token number
  const nextNum = state.adminStudents.length + 42;
  const token = `T-00${nextNum}`;
  state.tokenNumber = token;

  // Determine optimal counter
  const counterMap = {
    'Examination Form': 'C-1',
    'TC / Migration': 'C-2',
    'Scholarship': 'C-3',
    'Fee Submission': 'C-3',
    'Bonafide Certificate': 'C-4',
    'ID Card': 'C-1'
  };
  let assignedCounter = counterMap[state.selectedService] || 'C-1';
  if (state.selectedPriority === 'Tatkal' || state.selectedPriority === 'Specially-Abled') {
    assignedCounter = 'C-4'; // Expedited Desk
  }
  state.assignedCounter = assignedCounter;

  const newStudent = {
    token: token,
    name: state.userName,
    service: state.selectedService,
    time: state.selectedTime,
    priority: state.selectedPriority,
    counter: assignedCounter,
    status: 'Waiting'
  };

  // Prepend to waiting queue if priority
  if (state.selectedPriority === 'Specially-Abled' || state.selectedPriority === 'Tatkal') {
    state.adminStudents.unshift(newStudent);
  } else {
    state.adminStudents.push(newStudent);
  }

  // If backend connected, post to server
  if (state.backendConnected) {
    try {
      await fetch(`${state.apiBase}/api/book-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.userName,
          college: state.college,
          service: state.selectedService,
          time: state.selectedTime,
          priority: state.selectedPriority
        })
      });
    } catch (e) {
      console.warn('Backend booking queued locally:', e);
    }
  }

  // Update UI Elements
  if (document.getElementById('t-token-number')) document.getElementById('t-token-number').textContent = token;
  if (document.getElementById('t-service-name')) document.getElementById('t-service-name').textContent = state.selectedService;
  if (document.getElementById('t-counter')) document.getElementById('t-counter').textContent = assignedCounter;
  if (document.getElementById('t-priority-tag')) document.getElementById('t-priority-tag').textContent = `⭐ ${state.selectedPriority} Queue`;
  if (document.getElementById('s-counter-stat')) document.getElementById('s-counter-stat').textContent = assignedCounter;
  if (document.getElementById('s-priority-stat')) document.getElementById('s-priority-stat').textContent = state.selectedPriority;

  generateQRCode();
  generateQueueList();
  renderCountersGrid();

  openModal(`
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:3rem;margin-bottom:12px">🎉</div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1.4rem;margin-bottom:8px">Appointment Confirmed!</h3>
      <p style="color:var(--text-sec);margin-bottom:16px">Your Digital Queue Pass has been generated</p>
      <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:12px;padding:16px;text-align:left;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:var(--text-sec)">Token ID</span><strong style="color:var(--accent-cyan);font-size:1.1rem">${token}</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:var(--text-sec)">Service Desk</span><strong>${assignedCounter} (${state.selectedService})</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:var(--text-sec)">Slot Time</span><strong>${date} at ${state.selectedTime}</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:var(--text-sec)">Priority Level</span><span class="chip ${state.selectedPriority === 'Tatkal' ? 'orange' : 'cyan'}">${state.selectedPriority}</span></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn-whatsapp full-width" onclick="shareViaWhatsApp()"><i class="fab fa-whatsapp"></i> WhatsApp</button>
        <button class="btn-primary full-width" onclick="closeModal();showSection('s-token','student')"><i class="fas fa-ticket-alt"></i> View Pass</button>
      </div>
    </div>
  `);
}

// ══════════════════════════════════════════
//  WHATSAPP SHARING & CALENDAR EXPORT (.ICS)
// ══════════════════════════════════════════
function shareViaWhatsApp() {
  const text = encodeURIComponent(
    `🎟️ *QueuePro Pass Confirmed*\n` +
    `• Token: ${state.tokenNumber}\n` +
    `• Institution: ${state.college}\n` +
    `• Service: ${state.selectedService}\n` +
    `• Desk: ${state.assignedCounter}\n` +
    `• Status: Position #5 in line\n` +
    `• Portal: https://queuepro.college.edu`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
  showToast('📲 WhatsApp alert link generated!');
}

function generateCalendarEvent() {
  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QueuePro//Smart Campus Queue//EN',
    'BEGIN:VEVENT',
    `SUMMARY:QueuePro Appointment: ${state.selectedService} (${state.tokenNumber})`,
    `DESCRIPTION:Your campus counter token ${state.tokenNumber} for ${state.selectedService} at ${state.assignedCounter}.`,
    `LOCATION:${state.college} Admin Block, ${state.assignedCounter}`,
    `DTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTEND:${new Date(Date.now() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${state.tokenNumber}_appointment.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('📅 Calendar event (.ics) downloaded!');
}

function simulateSMSAlert() {
  showToast('📱 SMS alert dispatched to registered mobile: +91 98765 43210');
}

// ══════════════════════════════════════════
//  AI OCR DOCUMENT PRE-VERIFICATION SCANNER
// ══════════════════════════════════════════
function runAIDocScan() {
  const box = document.getElementById('ai-scan-box');
  const txt = document.getElementById('ai-scan-text');
  if (box) box.style.display = 'flex';
  if (txt) txt.textContent = '🔍 AI OCR Scanning: Extracting name, stamps, and validity...';

  setTimeout(() => {
    if (txt) txt.textContent = '✅ Cross-checking credentials with University Registry...';
  }, 1200);

  setTimeout(() => {
    if (box) box.style.display = 'none';
    const markItem = document.querySelector('[data-doc="marksheet"]');
    if (markItem) {
      markItem.className = 'doc-item checked';
      markItem.querySelector('i').className = 'fas fa-check-circle';
      markItem.querySelector('small').textContent = 'Verified by AI: Grade Sheet Authenticated';
      const badge = markItem.querySelector('.badge-pending');
      if (badge) {
        badge.className = 'badge-verified';
        badge.textContent = 'Verified';
      }
    }
    const scoreText = document.getElementById('doc-score-text');
    const scoreFill = document.getElementById('doc-bar-fill');
    const chip = document.getElementById('doc-readiness-chip');
    if (scoreText) scoreText.textContent = '6 of 6 Documents Ready (100%)';
    if (scoreFill) scoreFill.style.width = '100%';
    if (chip) { chip.textContent = '100% Ready (Fast-Track)'; chip.className = 'chip green'; }
    showToast('🎉 All documents verified! You are Fast-Track eligible.');
  }, 2400);
}

// ══════════════════════════════════════════
//  STUDENT - ADMIN LIVE CHAT / QUERY DESK
// ══════════════════════════════════════════
function renderChatMessages(role) {
  const container = document.getElementById(role === 'student' ? 'student-chat-box' : 'admin-chat-box');
  if (!container) return;
  
  const relevantMsgs = state.messages.filter(m => m.token === state.activeAdminThread);
  container.innerHTML = relevantMsgs.map(m => `
    <div class="chat-bubble ${m.sender}">
      <strong>${m.sender === 'student' ? 'Student' : 'Counter Officer'}:</strong>
      ${m.text}
      <span class="msg-time">${m.time}</span>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(sender) {
  const inpId = sender === 'student' ? 'student-chat-inp' : 'admin-chat-inp';
  const inp = document.getElementById(inpId);
  const text = inp?.value?.trim();
  if (!text) return;

  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const msgObj = {
    id: Date.now(),
    token: state.activeAdminThread,
    sender: sender,
    text: text,
    time: now
  };
  state.messages.push(msgObj);
  inp.value = '';

  renderChatMessages('student');
  renderChatMessages('admin');

  // If backend connected, sync message
  if (state.backendConnected) {
    try {
      await fetch(`${state.apiBase}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.activeAdminThread, sender, text })
      });
    } catch (e) {
      console.warn('Backend message queued:', e);
    }
  }

  showToast('💬 Message delivered');
}

function sendQuickChat(txt) {
  const inp = document.getElementById('student-chat-inp');
  if (inp) inp.value = txt;
  sendChatMessage('student');
}

function sendAdminCanned(txt) {
  const inp = document.getElementById('admin-chat-inp');
  if (inp) inp.value = txt;
  sendChatMessage('admin');
}

function selectAdminThread(token, name) {
  state.activeAdminThread = token;
  const title = document.getElementById('a-chat-student-title');
  if (title) title.textContent = `${name} (#${token})`;
  document.querySelectorAll('.thread-item').forEach(el => el.classList.remove('active'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  renderChatMessages('admin');
}

// ══════════════════════════════════════════
//  ADMIN QR CODE SCANNER SIMULATOR
// ══════════════════════════════════════════
function simulateQRScan() {
  const val = document.getElementById('manual-scan-input')?.value?.trim().toUpperCase() || 'T-0049';
  const student = state.adminStudents.find(s => s.token === val) || {
    token: val, name: 'Aditya Kumar', service: 'Examination Form', time: '11:45 AM', priority: 'Regular', counter: 'C-1', status: 'Waiting'
  };

  const badge = document.getElementById('scan-badge');
  const details = document.getElementById('scan-details-body');
  if (badge) { badge.textContent = 'Match Verified ✅'; badge.className = 'chip green'; }

  if (details) {
    details.innerHTML = `
      <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.25);border-radius:14px;padding:20px;text-align:left">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#00d4ff,#7c3aed);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:1.2rem">
            ${student.name.charAt(0)}
          </div>
          <div>
            <h4 style="font-family:'Syne',sans-serif;font-size:1.2rem">${student.name}</h4>
            <span style="font-size:0.8rem;color:var(--text-sec)">Roll 2021CS042 · Computer Science</span>
          </div>
          <span class="chip ${student.priority === 'Tatkal' ? 'orange' : 'cyan'}" style="margin-left:auto">${student.priority}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.85rem">
          <div><span style="color:var(--text-sec)">Token:</span> <strong>${student.token}</strong></div>
          <div><span style="color:var(--text-sec)">Assigned Desk:</span> <strong class="cyan-text">${student.counter}</strong></div>
          <div><span style="color:var(--text-sec)">Service:</span> <strong>${student.service}</strong></div>
          <div><span style="color:var(--text-sec)">Documents:</span> <strong class="green-text">100% Pre-Verified</strong></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn-primary full-width" onclick="checkInStudent('${student.token}')"><i class="fas fa-check-circle"></i> Check-In to Desk</button>
          <button class="btn-outline full-width" onclick="markTokenDone('${student.token}')"><i class="fas fa-check-double"></i> Mark Completed</button>
        </div>
      </div>
    `;
  }

  showToast(`✅ QR Code Verified for ${student.name} (${student.token})`);
}

function checkInStudent(token) {
  const tok = state.adminStudents.find(s => s.token === token);
  if (tok) tok.status = 'Processing';
  showToast(`🎟️ Student ${token} Checked In to Counter`);
}

// ══════════════════════════════════════════
//  ADMIN MASTER CALL DISPATCHER & GRACE TIMER
// ══════════════════════════════════════════
function callNextMaster() {
  if (state.queuePaused) { showToast('⚠️ Queue is paused. Resume first.'); return; }

  // Priority queue ordering: Specially-Abled -> Tatkal -> Regular FIFO
  const waitingTokens = state.adminStudents.filter(s => s.status === 'Waiting');
  if (!waitingTokens.length) {
    showToast('⚠️ No more students waiting in queue!');
    return;
  }

  waitingTokens.sort((a, b) => {
    const prioScore = { 'Specially-Abled': 1, 'Tatkal': 2, 'Faculty-Endorsed': 3, 'Regular': 4 };
    return (prioScore[a.priority] || 4) - (prioScore[b.priority] || 4);
  });

  const nextTok = waitingTokens[0];
  nextTok.status = 'Processing';

  // Update now serving
  state.currentServing = parseInt(nextTok.token.split('-')[1]) || (state.currentServing + 1);
  const el = document.getElementById('now-serving-token');
  const subEl = document.getElementById('now-serving-sub');
  if (el) el.textContent = nextTok.token;
  if (subEl) subEl.textContent = `${nextTok.counter} · ${nextTok.service} (${nextTok.name})`;

  // Update assigned counter current token
  const c = state.counters.find(x => x.id === nextTok.counter);
  if (c) c.currentToken = nextTok.token;

  renderCountersGrid();
  buildAdminStudents();
  buildUpcoming();
  startGracePeriodCountdown();

  // Announce with audio chime & speech synthesis
  speakAnnouncement(nextTok.token, nextTok.counter, nextTok.service);
  showToast(`📢 Calling ${nextTok.token} (${nextTok.name}) to ${nextTok.counter}`);

  // Post to backend if active
  if (state.backendConnected) {
    fetch(`${state.apiBase}/api/call-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counter: nextTok.counter })
    }).catch(e => console.warn(e));
  }
}

function repeatCurrentAnnouncement() {
  const el = document.getElementById('now-serving-token')?.textContent || 'T-0042';
  speakAnnouncement(el, 'Counter C-1', 'Examination Form');
  showToast('🔊 Repeating voice announcement');
}

function markCurrentTokenDone() {
  const tokNum = document.getElementById('now-serving-token')?.textContent || 'T-0042';
  const tok = state.adminStudents.find(s => s.token === tokNum);
  if (tok) tok.status = 'Done';
  buildAdminStudents();
  buildTodayWork();
  showToast(`✅ ${tokNum} marked completed`);
  callNextMaster();
}

function snoozeCurrentToken() {
  state.graceSeconds += 300; // Add 5 minutes
  showToast('⏳ Added 5 minutes snooze to grace period');
}

function startGracePeriodCountdown() {
  clearInterval(state.graceTimer);
  state.graceSeconds = 120;
  const timerEl = document.getElementById('grace-seconds');
  
  state.graceTimer = setInterval(() => {
    if (state.graceSeconds > 0) {
      state.graceSeconds--;
      if (timerEl) timerEl.textContent = `${state.graceSeconds}s`;
    } else {
      clearInterval(state.graceTimer);
      if (timerEl) timerEl.textContent = 'Expired';
    }
  }, 1000);
}

// ══════════════════════════════════════════
//  ROLE SWITCHING & FAST NAVIGATION
// ══════════════════════════════════════════
function selectRole(role) {
  state.role = role;
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll(`.role-card[data-role="${role}"]`).forEach(c => c.classList.add('selected'));
}

function switchRoleFast(newRole) {
  state.role = newRole;
  if (newRole === 'student') {
    switchPage('student-page');
  } else if (newRole === 'admin') {
    switchPage('admin-page');
    buildAdminStudents();
    buildUpcoming();
    buildTodayWork();
    buildFullTokenList();
    initAdminCharts();
  }
  showToast(`Switched to ${newRole.toUpperCase()} View`);
}

function launchDashboard() {
  const college = document.getElementById('college-select').value;
  const name = document.getElementById('user-name').value.trim();

  if (!college) { showToast('⚠️ Please select your campus'); return; }
  if (!name) { showToast('⚠️ Please enter your name'); return; }
  if (!state.role) { showToast('⚠️ Please choose a role'); return; }

  state.college = college;
  state.userName = name;

  if (state.role === 'tv') {
    openTVMode();
    return;
  }

  const initial = name.charAt(0).toUpperCase();
  if (state.role === 'student') {
    document.getElementById('s-avatar').textContent = initial;
    document.getElementById('s-name').textContent = name;
    document.getElementById('s-college').textContent = college;
    document.getElementById('s-college-badge').textContent = college;
    document.getElementById('s-welcome-name').textContent = name.split(' ')[0];
    document.getElementById('t-college').textContent = college;
    document.getElementById('p-avatar-big').textContent = initial;
    document.getElementById('p-name-big').textContent = name;
    document.getElementById('p-college-name').textContent = college;
    switchPage('student-page');
    initAdminCharts();
    animateCounters();
  } else {
    document.getElementById('a-name').textContent = name;
    document.getElementById('a-college').textContent = college;
    document.getElementById('a-college-badge').textContent = college;
    document.getElementById('a-college-input') && (document.getElementById('a-college-input').value = college);
    document.getElementById('a-admin-name') && (document.getElementById('a-admin-name').value = name);
    switchPage('admin-page');
    buildAdminStudents();
    buildUpcoming();
    buildTodayWork();
    buildFullTokenList();
    initAdminCharts();
    animateCounters();
  }
  showToast('✅ Welcome to QueuePro, ' + name.split(' ')[0] + '!');
}

function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');
}

function logout() {
  switchPage('landing-page');
  showToast('👋 Logged out successfully');
}

// ══════════════════════════════════════════
//  NAVIGATION & SIDEBARS
// ══════════════════════════════════════════
function showSection(id, role) {
  const page = role === 'student' ? 'student-page' : 'admin-page';
  document.querySelectorAll(`#${page} .content-section`).forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');

  document.querySelectorAll(`#${page} .nav-link`).forEach(l => l.classList.remove('active'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  const titles = {
    's-dashboard':'Dashboard','s-booking':'Slot Booking & Tatkal','s-queue':'Live Multi-Desk Queue',
    's-token':'Digital Token Pass','s-documents':'AI Document Verification','s-chat':'Query Desk Live',
    's-history':'Token History','s-feedback':'Feedback & NPS','s-profile':'Student Profile','s-notifications':'System Alerts',
    'a-dashboard':'Control Center','a-queue-control':'Queue Dispatcher','a-counters':'Multi-Counter Desks',
    'a-scanner':'QR Pass Scanner','a-chat':'Student Query Desk','a-students':'Students Registry',
    'a-analytics':'Analytics & Sentiment','a-documents':'Document Rules','a-broadcast':'Campus Broadcast','a-settings':'Settings'
  };
  const titleEl = document.getElementById(role === 'student' ? 's-topbar-title' : 'a-topbar-title');
  if (titleEl && titles[id]) titleEl.textContent = titles[id];

  if (id === 's-queue') refreshQueue();
  if (id === 'a-analytics') setTimeout(initAdminCharts, 100);

  animateCounters();
  closeSidebars();
}

function showAdminSection(id) {
  showSection(id, 'admin');
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}
function toggleAdminSidebar() {
  document.getElementById('admin-sidebar')?.classList.toggle('open');
}
function closeSidebars() {
  if (window.innerWidth <= 800) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('admin-sidebar')?.classList.remove('open');
  }
}

// ══════════════════════════════════════════
//  THEME TOGGLE
// ══════════════════════════════════════════
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  const icon = document.getElementById('theme-icon');
  const aIcon = document.getElementById('a-theme-icon');
  const label = document.getElementById('theme-label');
  if (icon) icon.className = state.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  if (aIcon) aIcon.className = state.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  if (label) label.textContent = state.theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  showToast(state.theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode');
  setTimeout(initAdminCharts, 150);
}

// ══════════════════════════════════════════
//  QUEUE PEOPLE HIGHWAY VISUALIZER
// ══════════════════════════════════════════
const emojis = ['👨‍🎓','👩‍🎓','🧑‍🎓','👨','👩','🧑','👦','👧'];
function generateQueuePeople() {
  const el = document.getElementById('queue-people');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const div = document.createElement('div');
    div.className = 'queue-person ' + (i === state.queuePosition ? 'you' : 'other');
    div.textContent = i === state.queuePosition ? '⭐' : emojis[Math.floor(Math.random() * emojis.length)];
    div.title = i === state.queuePosition ? 'You (Aditya)' : `Student #${i}`;
    div.style.animationDelay = (i * 0.05) + 's';
    el.appendChild(div);
  }
}

function generateQueueList() {
  const list = document.getElementById('queue-list');
  if (!list) return;
  list.innerHTML = '';
  const waitingTokens = state.adminStudents.slice(0, 10);
  waitingTokens.forEach((s, i) => {
    const item = document.createElement('div');
    const pos = i + 1;
    const isYours = s.token === state.tokenNumber;
    item.className = 'q-list-item' + (isYours ? ' yours' : '') + (pos === 1 ? ' current' : '');
    item.innerHTML = `
      <span class="q-num">#${pos}</span>
      <div class="q-avatar">${emojis[i % emojis.length]}</div>
      <div style="flex:1">
        <span class="q-name">${s.name} (${s.token})</span>
        <div style="font-size:0.75rem;color:var(--text-sec)">${s.service} · ${s.counter}</div>
      </div>
      <span class="chip ${s.priority === 'Tatkal' ? 'orange' : s.priority === 'Specially-Abled' ? 'purple' : 'cyan'}">${s.priority}</span>
      <span class="q-time">${pos === 1 ? '🟢 Now' : `~${(pos * 2.5) | 0} min`}</span>
      ${isYours ? '<span class="chip cyan">You</span>' : ''}
    `;
    list.appendChild(item);
  });
}

function refreshQueue() {
  generateQueueList();
  renderCountersGrid();
  showToast('🔄 Live Queue Synchronized');
}

// ══════════════════════════════════════════
//  QR CODE GENERATION
// ══════════════════════════════════════════
function generateQRCode() {
  const el = document.getElementById('qrcode');
  if (!el) return;
  el.innerHTML = '';
  try {
    new QRCode(el, {
      text: `QUEUEPRO|TOKEN:${state.tokenNumber}|CAMPUS:${state.college}|SERVICE:${state.selectedService}|DESK:${state.assignedCounter}|DATE:${new Date().toLocaleDateString()}`,
      width: 120, height: 120,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch(e) {
    el.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#333">QR Code</div>';
  }
}

// ══════════════════════════════════════════
//  DOWNLOAD PASS CANVAS
// ══════════════════════════════════════════
function downloadToken() {
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 620;
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, 440, 620);
  grad.addColorStop(0, '#0a0f1d');
  grad.addColorStop(1, '#151d32');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 440, 620);

  // Border & Header Glow
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 416, 596);

  ctx.fillStyle = 'rgba(0,212,255,0.12)';
  ctx.fillRect(12, 12, 416, 90);

  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 30px Syne, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('QueuePro Digital Pass', 220, 50);

  ctx.fillStyle = '#8a9ab5';
  ctx.font = '14px DM Sans, sans-serif';
  ctx.fillText(state.college || 'IIT Delhi', 220, 78);

  // Token Number
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 76px Syne, sans-serif';
  ctx.fillText(state.tokenNumber, 220, 210);

  // Service & Priority
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 20px DM Sans, sans-serif';
  ctx.fillText(state.selectedService, 220, 245);

  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 14px DM Sans, sans-serif';
  ctx.fillText(`★ ${state.selectedPriority.toUpperCase()} PRIORITY ★`, 220, 275);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(30, 295);
  ctx.lineTo(410, 295);
  ctx.stroke();
  ctx.setLineDash([]);

  // Details
  const details = [
    ['Student Name', state.userName || 'Aditya Kumar'],
    ['Assigned Desk', state.assignedCounter || 'Counter C-1'],
    ['Date & Time', `${new Date().toLocaleDateString()} · ${state.selectedTime || '10:00 AM'}`],
    ['Document Check', 'Verified (100% Ready)']
  ];
  details.forEach(([label, val], i) => {
    const y = 335 + i * 46;
    ctx.fillStyle = '#8a9ab5';
    ctx.font = '14px DM Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 45, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px DM Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, 395, y);
  });

  // Footer
  ctx.fillStyle = 'rgba(0,212,255,0.08)';
  ctx.fillRect(12, 530, 416, 78);
  ctx.fillStyle = '#8a9ab5';
  ctx.font = '12px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Show this pass upon arrival at the desk', 220, 558);
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 14px DM Sans, sans-serif';
  ctx.fillText('🌐 queuepro.campus.edu', 220, 584);

  const link = document.createElement('a');
  link.download = `${state.tokenNumber}_pass.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('📥 Digital Pass Downloaded Successfully!');
}

// ══════════════════════════════════════════
//  CANCEL & RESCHEDULE MODALS
// ══════════════════════════════════════════
function cancelBookingPrompt() {
  openModal(`
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:2.5rem;margin-bottom:12px">⚠️</div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1.3rem;margin-bottom:8px">Cancel Appointment Token?</h3>
      <p style="color:var(--text-sec);font-size:0.9rem;margin-bottom:20px">Your token <strong>${state.tokenNumber}</strong> will be released. You will need to re-book if required.</p>
      <div style="display:flex;gap:10px">
        <button class="btn-outline full-width" onclick="closeModal()">Keep Pass</button>
        <button class="btn-primary full-width" style="background:linear-gradient(135deg,#ff4444,#ff6b35)" onclick="confirmCancel()">Yes, Cancel</button>
      </div>
    </div>
  `);
}

function confirmCancel() {
  closeModal();
  const tok = state.adminStudents.find(s => s.token === state.tokenNumber);
  if (tok) tok.status = 'Cancelled';
  buildAdminStudents();
  showToast('❌ Token cancelled');
}

function reschedulePrompt() {
  openModal(`
    <div style="padding:8px 0">
      <h3 style="font-family:'Syne',sans-serif;font-size:1.3rem;margin-bottom:16px"><i class="fas fa-sync-alt" style="color:var(--accent-cyan)"></i> Reschedule Token</h3>
      <div class="form-group">
        <label>Select New Date</label>
        <input type="date" id="reschedule-date" class="date-input" />
      </div>
      <div class="form-group">
        <label>Select New Slot</label>
        <select id="reschedule-time" style="width:100%;padding:11px 14px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);outline:none">
          <option>9:00 AM</option><option selected>10:00 AM</option>
          <option>12:00 PM</option><option>2:00 PM</option><option>4:00 PM</option>
        </select>
      </div>
      <button class="btn-primary full-width mt" onclick="confirmReschedule()"><i class="fas fa-check"></i> Confirm New Slot</button>
    </div>
  `);
}

function confirmReschedule() {
  closeModal();
  showToast('📅 Appointment rescheduled successfully!');
}

// ══════════════════════════════════════════
//  FILE UPLOAD
// ══════════════════════════════════════════
function handleFileUpload(e) {
  Array.from(e.target.files).forEach(file => addUploadItem(file));
}

function handleDrop(e) {
  e.preventDefault();
  Array.from(e.dataTransfer.files).forEach(file => addUploadItem(file));
}

function addUploadItem(file) {
  const list = document.getElementById('upload-list');
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'upload-item';
  const size = (file.size / 1024).toFixed(1) + ' KB';
  item.innerHTML = `<i class="fas fa-file-check" style="color:var(--accent-green)"></i><span>${file.name}</span><small style="color:var(--text-sec)">${size}</small><i class="fas fa-times rm" onclick="this.parentElement.remove();showToast('🗑️ File removed')"></i>`;
  list.appendChild(item);
  showToast(`✅ ${file.name} uploaded for AI verification`);
}

// ══════════════════════════════════════════
//  FEEDBACK & NPS ENGINE
// ══════════════════════════════════════════
function rateStar(n) {
  state.currentRating = n;
  document.querySelectorAll('#star-rating i').forEach((star, i) => {
    star.classList.toggle('lit', i < n);
  });
  const labels = ['', 'Poor (1/5)', 'Fair (2/5)', 'Good (3/5)', 'Great (4/5)', 'Outstanding Experience! (5/5)'];
  const el = document.getElementById('rating-label');
  if (el) el.textContent = labels[n];
}

function toggleTag(el) {
  el.classList.toggle('active');
}

function submitFeedback() {
  if (!state.currentRating) { showToast('⭐ Please tap a star rating'); return; }
  const text = document.getElementById('feedback-text')?.value || '';
  const tags = [...document.querySelectorAll('.fb-tag.active')].map(t => t.textContent).join(', ');

  if (state.backendConnected) {
    fetch(`${state.apiBase}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: state.userName, rating: state.currentRating, tags, comment: text })
    }).catch(e => console.warn(e));
  }

  openModal(`
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:3rem;margin-bottom:12px">🌟</div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1.3rem;margin-bottom:8px">Thank You For Your Feedback!</h3>
      <p style="color:var(--text-sec);font-size:0.88rem">Rating: ${'⭐'.repeat(state.currentRating)}</p>
      ${tags ? `<p style="color:var(--text-sec);font-size:0.8rem;margin-top:6px">Tags: ${tags}</p>` : ''}
      <button class="btn-primary mt full-width" onclick="closeModal()">Close Window</button>
    </div>
  `);
}

// ══════════════════════════════════════════
//  ADMIN STUDENT BUILDERS
// ══════════════════════════════════════════
function statusChip(status) {
  const map = { Processing: 'purple', Waiting: 'orange', Done: 'green', Cancelled: 'red', Snoozed: 'yellow' };
  return `<span class="chip ${map[status] || 'cyan'}">${status}</span>`;
}

function buildAdminStudents() {
  const tbody = document.getElementById('admin-students-tbody');
  if (!tbody) return;
  tbody.innerHTML = state.adminStudents.map(s => `
    <tr>
      <td><strong style="color:var(--accent-cyan)">${s.token}</strong></td>
      <td>${s.name}</td>
      <td>${s.service}</td>
      <td>${s.time}</td>
      <td><span class="chip ${s.priority === 'Tatkal' ? 'orange' : s.priority === 'Specially-Abled' ? 'purple' : 'cyan'}">${s.priority}</span></td>
      <td><strong>${s.counter || 'C-1'}</strong></td>
      <td>${statusChip(s.status)}</td>
      <td><button class="btn-sm" onclick="adminAction('${s.token}')">Manage</button></td>
    </tr>
  `).join('');
}

function buildUpcoming() {
  const list = document.getElementById('upcoming-list');
  if (!list) return;
  const waiting = state.adminStudents.filter(s => s.status === 'Waiting').slice(0, 5);
  list.innerHTML = waiting.map((s, i) => `
    <div class="upcoming-item">
      <span class="up-num">${i + 1}</span>
      <div>
        <div class="up-name">${s.name} <strong style="color:var(--accent-cyan)">(${s.token})</strong></div>
        <div class="up-service">${s.service} · ${s.counter}</div>
      </div>
      <span class="up-time">${s.time}</span>
      <span class="chip ${s.priority === 'Tatkal' ? 'orange' : 'cyan'}">${s.priority}</span>
    </div>
  `).join('');
}

function buildTodayWork() {
  const list = document.getElementById('todays-list');
  if (!list) return;
  const done = [
    { token:'T-0035', name:'Amit Shah', service:'Fee Submission', status:'done' },
    { token:'T-0036', name:'Neha Roy', service:'Bonafide Cert.', status:'done' },
    { token:'T-0037', name:'Suresh K.', service:'TC / Migration', status:'done' },
    { token:'T-0038', name:'Kavita M.', service:'Scholarship', status:'pending' },
    { token:'T-0039', name:'Rohan D.', service:'ID Card', status:'done' },
  ];
  list.innerHTML = done.map(d => `
    <div class="todays-item">
      <i class="fas ${d.status === 'done' ? 'fa-check-circle done' : 'fa-clock pending-t'}"></i>
      <div>
        <div style="font-weight:600;font-size:0.85rem">${d.name}</div>
        <div style="font-size:0.75rem;color:var(--text-sec)">${d.service}</div>
      </div>
      <strong style="font-size:0.8rem;color:var(--accent-cyan)">${d.token}</strong>
    </div>
  `).join('');
}

function buildFullTokenList() {
  const list = document.getElementById('full-token-list');
  if (!list) return;
  list.innerHTML = [...state.adminStudents].map(s => `
    <div class="ft-item">
      <span class="ft-num">${s.token}</span>
      <div class="ft-info">
        <div style="font-weight:600;font-size:0.85rem">${s.name}</div>
        <div class="ft-service">${s.service} · ${s.counter} · ${s.time}</div>
      </div>
      <span class="chip ${s.priority === 'Tatkal' ? 'orange' : 'cyan'}">${s.priority}</span>
      ${statusChip(s.status)}
      <button class="btn-sm" onclick="adminAction('${s.token}')">⚡</button>
    </div>
  `).join('');
}

function adminAction(token) {
  openModal(`
    <div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1.3rem;margin-bottom:16px">Manage Token <span style="color:var(--accent-cyan)">${token}</span></h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="ctrl-btn green" style="width:100%;justify-content:flex-start" onclick="markTokenDone('${token}');closeModal()"><i class="fas fa-check"></i> Mark as Done</button>
        <button class="ctrl-btn cyan" style="width:100%;justify-content:flex-start" onclick="speakAnnouncement('${token}','Counter C-1','Examination Form');closeModal()"><i class="fas fa-bullhorn"></i> Announce via Voice</button>
        <button class="ctrl-btn orange" style="width:100%;justify-content:flex-start" onclick="transferTokenPrompt('${token}');"><i class="fas fa-exchange-alt"></i> Transfer to Another Counter</button>
        <button class="ctrl-btn red" style="width:100%;justify-content:flex-start" onclick="cancelTokenByAdmin('${token}');closeModal()"><i class="fas fa-times"></i> Cancel Token</button>
      </div>
    </div>
  `);
}

function markTokenDone(token) {
  const tok = state.adminStudents.find(s => s.token === token);
  if (tok) tok.status = 'Done';
  buildAdminStudents();
  buildFullTokenList();
  showToast(`✅ ${token} marked completed`);
}

function cancelTokenByAdmin(token) {
  const tok = state.adminStudents.find(s => s.token === token);
  if (tok) tok.status = 'Cancelled';
  buildAdminStudents();
  buildFullTokenList();
  showToast(`❌ ${token} cancelled`);
}

function transferTokenPrompt(token) {
  closeModal();
  openModal(`
    <div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1.2rem;margin-bottom:12px">Transfer ${token}</h3>
      <div class="form-group">
        <label>Select Target Counter</label>
        <select id="transfer-counter-select" style="width:100%;padding:10px;background:rgba(255,255,255,0.07);border:1px solid var(--border);border-radius:8px;color:#fff">
          <option value="C-1">Counter C-1 (Examination)</option>
          <option value="C-2">Counter C-2 (TC / Migration)</option>
          <option value="C-3">Counter C-3 (Scholarship)</option>
          <option value="C-4">Counter C-4 (Express Desk)</option>
        </select>
      </div>
      <button class="btn-primary full-width" onclick="executeTransfer('${token}')"><i class="fas fa-check"></i> Transfer Now</button>
    </div>
  `);
}

function executeTransfer(token) {
  const target = document.getElementById('transfer-counter-select')?.value || 'C-2';
  const tok = state.adminStudents.find(s => s.token === token);
  if (tok) tok.counter = target;
  closeModal();
  renderCountersGrid();
  buildAdminStudents();
  showToast(`🔁 ${token} transferred to ${target}`);
}

function pauseQueue() {
  state.queuePaused = !state.queuePaused;
  const chip = document.getElementById('queue-status-chip');
  const btnTxt = document.getElementById('pause-btn-text');
  if (chip) {
    chip.textContent = state.queuePaused ? 'Paused' : 'Operational';
    chip.className = `status-chip ${state.queuePaused ? 'pending-chip' : 'processing'}`;
  }
  if (btnTxt) btnTxt.textContent = state.queuePaused ? 'Resume Desk' : 'Pause Desk';
  showToast(state.queuePaused ? '⏸️ Queue Paused' : '▶️ Queue Resumed');
}

function resetQueue() {
  openModal(`
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:2.5rem;margin-bottom:12px">🔄</div>
      <h3 style="font-family:'Syne',sans-serif;font-size:1.2rem;margin-bottom:8px">Reset Daily Queue?</h3>
      <p style="color:var(--text-sec);font-size:0.88rem;margin-bottom:20px">This resets today's token numbers and positions for all counters.</p>
      <div style="display:flex;gap:10px">
        <button class="btn-outline full-width" onclick="closeModal()">Cancel</button>
        <button class="btn-primary full-width" style="background:linear-gradient(135deg,#ff4444,#ff6b35)" onclick="doReset()">Reset All</button>
      </div>
    </div>
  `);
}

function doReset() {
  state.currentServing = 0;
  const el = document.getElementById('now-serving-token');
  if (el) el.textContent = 'T-0000';
  closeModal();
  showToast('🔄 Daily Queue Reset Completed');
}

function exportCSV() {
  const headers = ['Token', 'Name', 'Service', 'Time', 'Priority', 'Counter', 'Status'];
  const rows = state.adminStudents.map(s => [s.token, s.name, s.service, s.time, s.priority, s.counter, s.status]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `QueuePro_Audit_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📊 Queue Audit CSV Exported!');
}

function exportStudentHistory() {
  showToast('📄 Exporting student appointment audit statement...');
  exportCSV();
}

function saveSlotLimits() {
  showToast('✅ Slot quotas and caps updated successfully');
}

// ══════════════════════════════════════════
//  CAMPUS BROADCAST SYSTEM
// ══════════════════════════════════════════
function selectBroadcastType(el, type) {
  document.querySelectorAll('#a-broadcast .role-card').forEach(c => c.classList.remove('active-card'));
  el.classList.add('active-card');
  state.broadcastType = type;
}

function sendBroadcast() {
  const msg = document.getElementById('broadcast-msg')?.value?.trim();
  const target = document.getElementById('broadcast-target')?.value;
  if (!msg) { showToast('⚠️ Please write a message'); return; }

  // Update Global Marquee Ticker
  const ticker = document.getElementById('global-alert-ticker');
  const tickerTxt = document.getElementById('ticker-text');
  if (ticker && tickerTxt) {
    tickerTxt.textContent = `📢 Notice: ${msg}`;
    ticker.style.display = 'flex';
  }

  // Update TV Marquee
  const tvMarquee = document.getElementById('tv-marquee-text');
  if (tvMarquee) tvMarquee.textContent = `★ CAMPUS ALERT: ${msg} ★`;

  // Prepend to broadcast history
  const hist = document.getElementById('broadcast-hist');
  if (hist) {
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.innerHTML = `
      <div class="notif-icon cyan"><i class="fas fa-bullhorn"></i></div>
      <div class="notif-body"><strong>${msg.slice(0, 50)}</strong><p>Sent to ${target}</p><span>Just now</span></div>
    `;
    hist.insertBefore(item, hist.firstChild);
  }

  if (document.getElementById('broadcast-msg')) document.getElementById('broadcast-msg').value = '';

  // Transmit to Backend API if active
  if (state.backendConnected) {
    fetch(`${state.apiBase}/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, target, type: state.broadcastType })
    }).catch(e => console.warn(e));
  }

  showToast(`📢 Transmitted broadcast to ${target}`);
}

function closeTicker() {
  const t = document.getElementById('global-alert-ticker');
  if (t) t.style.display = 'none';
}

// ══════════════════════════════════════════
//  ADMIN SETTINGS & DOCUMENT RULES
// ══════════════════════════════════════════
function saveAdminSettings() {
  const college = document.getElementById('a-college-input')?.value;
  if (college) {
    state.college = college;
    if (document.getElementById('a-college')) document.getElementById('a-college').textContent = college;
    if (document.getElementById('a-college-badge')) document.getElementById('a-college-badge').textContent = college;
  }
  showToast('✅ Campus system settings saved');
}

function addDocRow() {
  const mgr = document.getElementById('doc-manager');
  if (!mgr) return;
  const row = document.createElement('div');
  row.className = 'dm-row';
  row.innerHTML = `
    <select class="dm-select"><option>Examination Form</option><option>TC / Migration</option><option>Scholarship</option></select>
    <input type="text" placeholder="Document title..." class="dm-inp" />
    <button class="btn-sm red-btn" onclick="this.parentElement.remove();showToast('🗑️ Rule removed')"><i class="fas fa-trash"></i></button>
  `;
  mgr.appendChild(row);
  row.querySelector('.dm-inp')?.focus();
}

function saveDocManager() {
  showToast('✅ Service document requirements synchronized');
}

// ══════════════════════════════════════════
//  CHARTS INITIALIZATION
// ══════════════════════════════════════════
let busyChart, weekChart, pieChart, monthChart;

function initBusyChart() {
  const ctx = document.getElementById('busyChart');
  if (!ctx || ctx.dataset.chartInit) return;
  ctx.dataset.chartInit = 'true';

  const isDark = state.theme === 'dark';
  busyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM'],
      datasets: [{
        data: [8, 15, 22, 28, 25, 30, 18, 10, 5],
        backgroundColor: (ctx2) => {
          const v = ctx2.raw;
          return v >= 25 ? 'rgba(255,107,53,0.85)' : v >= 15 ? 'rgba(124,58,237,0.75)' : 'rgba(0,212,255,0.65)';
        },
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx2 => `${ctx2.raw} tokens processed` } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: isDark ? '#8a9ab5' : '#4a5568', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: isDark ? '#8a9ab5' : '#4a5568', font: { size: 10 } }, beginAtZero: true }
      }
    }
  });
}

function initAdminCharts() {
  initBusyChart();
  const isDark = state.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#8a9ab5' : '#4a5568';

  const wCtx = document.getElementById('adminWeekChart');
  if (wCtx && !wCtx.dataset.chartInit) {
    wCtx.dataset.chartInit = 'true';
    weekChart = new Chart(wCtx, {
      type: 'line',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat'],
        datasets: [{
          label: 'Tokens',
          data: [35, 48, 30, 62, 45, 22],
          borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.12)',
          fill: true, tension: 0.4, pointBackgroundColor: '#00d4ff', pointRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  const pCtx = document.getElementById('adminPieChart');
  if (pCtx && !pCtx.dataset.chartInit) {
    pCtx.dataset.chartInit = 'true';
    pieChart = new Chart(pCtx, {
      type: 'doughnut',
      data: {
        labels: ['Exam Form', 'TC / Migration', 'Scholarship', 'Bonafide', 'ID Card', 'Tatkal'],
        datasets: [{
          data: [32, 18, 20, 14, 8, 8],
          backgroundColor: ['#00d4ff', '#7c3aed', '#00e676', '#ff6b35', '#ff4d8b', '#f59e0b'],
          borderWidth: 2,
          borderColor: isDark ? '#0d1320' : '#e4eaf6',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: tickColor, font: { size: 11 }, boxWidth: 12 } } }
      }
    });
  }

  const mCtx = document.getElementById('adminMonthChart');
  if (mCtx && !mCtx.dataset.chartInit) {
    mCtx.dataset.chartInit = 'true';
    const labels = Array.from({ length: 28 }, (_, i) => `${i + 1}`);
    const data = labels.map(() => Math.floor(Math.random() * 45 + 15));
    monthChart = new Chart(mCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tokens',
          data,
          backgroundColor: 'rgba(124,58,237,0.65)',
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 9 }, maxTicksLimit: 14 } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }
}

// ══════════════════════════════════════════
//  COUNTER ANIMATION
// ══════════════════════════════════════════
function animateCounters() {
  document.querySelectorAll('.stat-value[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    if (!target) return;
    let current = 0;
    const inc = Math.ceil(target / 25);
    const timer = setInterval(() => {
      current = Math.min(current + inc, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

// ══════════════════════════════════════════
//  LIVE SIMULATION LOOP
// ══════════════════════════════════════════
function startLiveUpdates() {
  setInterval(() => {
    // Dynamic wait time jitter
    const waitEl = document.getElementById('s-wait-time');
    const predEl = document.getElementById('ai-pred');
    if (waitEl && Math.random() > 0.8) {
      const wait = Math.max(2, (state.queuePosition * 2.4) | 0);
      waitEl.innerHTML = `${wait}<small>min</small>`;
      if (predEl) predEl.textContent = `${wait} min`;
    }
  }, 4000);
}

// ══════════════════════════════════════════
//  MODALS & TOAST
// ══════════════════════════════════════════
function openModal(html) {
  const content = document.getElementById('modal-content');
  const overlay = document.getElementById('modal-overlay');
  if (content && overlay) {
    content.innerHTML = html;
    overlay.classList.add('active');
  }
}

function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('active');
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ══════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════
function selectService(el, service) {
  document.querySelectorAll('.service-item').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  state.selectedService = service;
}

function selectTime(el) {
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedTime = el.textContent.split(' ')[0].trim();
}

function setDefaultDate() {
  const dateEl = document.getElementById('booking-date');
  if (dateEl) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    dateEl.value = today.toISOString().split('T')[0];
    dateEl.min = today.toISOString().split('T')[0];
  }
}

function setToday() {
  const el = document.getElementById('t-date');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function filterHistory(e) {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#history-tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function filterAdminStudents(e) {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#admin-students-tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function filterFullTokens(e) {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#full-token-list .ft-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function viewToken(id) {
  showToast(`📋 Viewing pass details for #${id}`);
  showSection('s-token', 'student');
}

function clearNotifs() {
  document.querySelectorAll('.notif-item.unread').forEach(n => n.classList.remove('unread'));
  const dot = document.querySelector('.notif-dot');
  if (dot) dot.style.display = 'none';
  showToast('✅ All alerts marked as read');
}

function saveProfile() {
  const name = document.getElementById('pf-name')?.value || state.userName;
  state.userName = name;
  if (document.getElementById('s-name')) document.getElementById('s-name').textContent = name;
  if (document.getElementById('p-name-big')) document.getElementById('p-name-big').textContent = name;
  if (document.getElementById('s-avatar')) document.getElementById('s-avatar').textContent = name.charAt(0).toUpperCase();
  if (document.getElementById('p-avatar-big')) document.getElementById('p-avatar-big').textContent = name.charAt(0).toUpperCase();
  showToast('✅ Student profile credentials saved');
}

function editProfile() {
  showToast('✏️ You can now edit profile fields below');
}

// Close modal on Escape
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// Close sidebar on outside click
window.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const aSidebar = document.getElementById('admin-sidebar');
  if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !e.target.closest('.menu-btn')) {
    sidebar.classList.remove('open');
  }
  if (aSidebar && aSidebar.classList.contains('open') && !aSidebar.contains(e.target) && !e.target.closest('.menu-btn')) {
    aSidebar.classList.remove('open');
  }
});
