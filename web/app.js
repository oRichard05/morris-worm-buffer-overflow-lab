const input = document.getElementById('name-input');
const screen = document.getElementById('terminal-screen');
const runButton = document.getElementById('run-button');
const roleValue = document.getElementById('role-value');
const vaultValue = document.getElementById('vault-value');
const roleDetail = document.getElementById('role-detail');
const vaultDetail = document.getElementById('vault-detail');
const outcome = document.getElementById('outcome');
const memoryGrid = document.getElementById('memory-grid');
const memoryExplain = document.getElementById('memory-explain');
const memoryLabel = document.getElementById('memory-label');
const backendStatus = document.getElementById('backend-status');
const modeButtons = {
  vulnerable: document.getElementById('vulnerable-button'),
  patched: document.getElementById('patched-button')
};
const normal = 'alice';
const crafted = 'AAAAAAAAAAAAAAAAADMIN';
let mode = 'vulnerable';
let running = false;

function terminalLine(message, kind = '') {
  const line = document.createElement('div');
  line.className = `term-line ${kind}`;
  line.textContent = message;
  screen.append(line);
  while (screen.children.length > 85) screen.firstElementChild.remove();
  screen.scrollTop = screen.scrollHeight;
}

function setMessage(kind, title, message) {
  outcome.className = `outcome ${kind}`;
  outcome.querySelector('.outcome-symbol').textContent = kind === 'danger' ? '⚠' : kind === 'safe' ? '✓' : '◉';
  outcome.querySelector('strong').textContent = title;
  outcome.querySelector('p').textContent = message;
}

function setMode(next) {
  mode = next;
  for (const [key, button] of Object.entries(modeButtons)) {
    const active = key === next;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  terminalLine(`Version selected: ${next.toUpperCase()}`, 'dim');
}

function asciiDisplay(hex) {
  const value = parseInt(hex, 16);
  if (value === 0) return '␀';
  return value >= 32 && value <= 126 ? String.fromCharCode(value) : '·';
}

function showMemory(result, name) {
  memoryGrid.replaceChildren();
  result.memory.forEach((hex, index) => {
    const cell = document.createElement('div');
    const inRole = index >= 16;
    const overwritten = inRole && result.mode === 'vulnerable' && name.length >= 16 && index <= name.length;
    cell.className = `byte${inRole ? ' role' : ''}${overwritten ? ' overwritten' : ''}`;
    cell.title = `Offset ${String(index).padStart(2, '0')}: 0x${hex} (${asciiDisplay(hex)})`;
    const value = document.createElement('span');
    value.className = 'hex';
    value.textContent = hex;
    const char = document.createElement('span');
    char.className = 'char';
    char.textContent = asciiDisplay(hex);
    cell.append(value, char);
    memoryGrid.append(cell);
  });
  memoryLabel.textContent = `24 BYTES / ${result.mode.toUpperCase()}`;
  if (result.status === 'INPUT REJECTED') {
    memoryExplain.textContent = 'The patched program checked the length before copying. The original GUEST role bytes are unchanged.';
  } else if (result.mode === 'vulnerable' && name.length >= 16) {
    memoryExplain.textContent = `The name buffer ends at offset 15. The input writes into the adjacent role field beginning at offset 16. The highlighted bytes come from the C program's memory dump. This is a controlled byte-level model: the writes cross the 16-byte name boundary but stay inside the 24-byte session object.`;
  } else {
    memoryExplain.textContent = 'The name fits inside the 16-byte buffer, including its terminating zero byte. The neighboring role remains GUEST.';
  }
}

function renderResult(result, name) {
  const unlocked = result.vault === 'UNLOCKED';
  roleValue.textContent = result.role || '(EMPTY)';
  vaultValue.textContent = result.vault;
  roleValue.className = unlocked ? 'bad' : 'good';
  vaultValue.className = unlocked ? 'bad' : 'good';
  roleDetail.textContent = unlocked ? 'Role overwritten by input' : 'Educational access flag';
  vaultDetail.textContent = unlocked ? 'Demonstration resource opened' : 'Resource remains restricted';
  document.getElementById('input-length').textContent = `${name.length} bytes`;
  showMemory(result, name);
  prepareTrace(result, name);

  if (result.status === 'INPUT REJECTED') {
    setMessage('safe', 'Input rejected by length check', 'The fixed C program prevented the 16-byte name field from being overwritten.');
    terminalLine('finger: request rejected (input exceeds safe buffer size)', 'success');
    terminalLine('[LAB MODEL] ROLE: GUEST   RESOURCE: LOCKED', 'dim');
  } else if (unlocked) {
    setMessage('danger', 'Memory boundary crossed', 'Our educational model changed the adjacent role field to ADMIN.');
    terminalLine('*** LOCAL MEMORY DEMONSTRATION: ROLE FIELD CORRUPTED ***', 'error');
    terminalLine('[LAB MODEL] ROLE: GUEST -> ADMIN', 'error');
    terminalLine('[LAB MODEL] RESOURCE: LOCKED -> UNLOCKED', 'error');
    terminalLine('1988 fingerd exploit: control-flow hijack, not a role flag.', 'dim');
  } else if (name.length >= 16 && mode === 'vulnerable') {
    setMessage('danger', 'Adjacent data changed', 'The input crossed the logical name buffer boundary.');
    terminalLine('[LAB MODEL] Adjacent memory modified; resource remains locked.', 'error');
  } else {
    setMessage('safe', 'Normal user information request', 'The program completed normally and the role remains GUEST.');
    terminalLine(`Login name: ${name.padEnd(18)} In real life: [sample record]`);
    terminalLine('Directory: /usr/guest            Shell: /bin/csh');
    terminalLine('On since Nov  2 09:12:00 on tty01');
    terminalLine('No Plan.');
    terminalLine('[LAB MODEL] ROLE: GUEST   RESOURCE: LOCKED', 'dim');
  }
}

async function runDemo() {
  if (running) return;
  const name = input.value.trim();
  if (!/^[A-Za-z0-9_-]{1,21}$/.test(name)) {
    setMessage('danger', 'Invalid input', 'Use 1–21 letters, numbers, underscores, or hyphens.');
    return;
  }
  running = true;
  runButton.disabled = true;
  terminalLine(`$ finger ${name}`, 'cmd');
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, name })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed');
    renderResult(result, name);
  } catch (error) {
    terminalLine(`ERROR: ${error.message}`, 'error');
    setMessage('danger', 'Unable to run the C demo', error.message);
  } finally {
    running = false;
    runButton.disabled = false;
    terminalLine('', 'blank');
  }
}

document.getElementById('run-form').addEventListener('submit', event => {
  event.preventDefault();
  runDemo();
});
modeButtons.vulnerable.addEventListener('click', () => setMode('vulnerable'));
modeButtons.patched.addEventListener('click', () => setMode('patched'));
document.getElementById('normal-preset').addEventListener('click', () => { input.value = normal; input.focus(); });
document.getElementById('overflow-preset').addEventListener('click', () => { input.value = crafted; input.focus(); });
document.getElementById('try-patch').addEventListener('click', () => {
  setMode('patched');
  input.value = crafted;
  document.querySelector('.workspace').scrollIntoView({ behavior: 'smooth' });
  runDemo();
});

const tabs = [...document.querySelectorAll('[data-view]')];
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    for (const item of tabs) {
      const selected = item === tab;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
      document.getElementById(`panel-${item.dataset.view}`).hidden = !selected;
    }
  });
}

for (let index = 0; index < 24; index++) {
  const cell = document.createElement('div');
  cell.className = `byte placeholder${index >= 16 ? ' role' : ''}`;
  const hex = document.createElement('span');
  hex.className = 'hex';
  hex.textContent = '--';
  const char = document.createElement('span');
  char.className = 'char';
  char.textContent = '·';
  cell.append(hex, char);
  memoryGrid.append(cell);
}

fetch('/api/health').then(response => response.json()).then(result => {
  if (result.ready) {
    backendStatus.innerHTML = '<span class="status-light"></span> C LAB READY';
    runDemo();
  } else {
    backendStatus.classList.add('offline');
    backendStatus.innerHTML = '<span class="status-light"></span> BUILD REQUIRED';
    setMessage('danger', 'Compile the C programs first', 'Run npm run build:lab in the project directory, then reload.');
  }
}).catch(() => {
  backendStatus.classList.add('offline');
  backendStatus.innerHTML = '<span class="status-light"></span> OFFLINE';
  setMessage('danger', 'Server not available', 'Start the local website using npm start.');
});


const initialBytes = Array(16).fill(0).concat([71, 85, 69, 83, 84, 0, 0, 0]);
let traceWrites = [];
let tracePosition = 0;
let traceSnapshot = null;
let traceTimer = null;

function stopTrace() {
  if (traceTimer !== null) clearInterval(traceTimer);
  traceTimer = null;
  document.getElementById('trace-play').textContent = 'PLAY';
  document.getElementById('trace-play').classList.remove('playing');
}

function prepareTrace(result, name) {
  stopTrace();
  traceSnapshot = result;
  traceWrites = result.status === 'INPUT REJECTED' ? [] : [...name].map(char => char.charCodeAt(0)).concat(0);
  drawTrace(traceWrites.length);
}

function drawTrace(position) {
  if (!traceSnapshot) return;
  tracePosition = Math.max(0, Math.min(position, traceWrites.length));
  const frame = [...initialBytes];
  for (let i = 0; i < tracePosition; i++) frame[i] = traceWrites[i];
  const actual = traceSnapshot.memory.map(value => Number.parseInt(value, 16));
  const complete = tracePosition === traceWrites.length;
  const matches = !complete || frame.every((value, index) => value === actual[index]);
  if (!matches) {
    stopTrace();
    memoryExplain.textContent = 'Trace and the C memory snapshot do not match. Do not use this trace as evidence.';
    return;
  }
  [...memoryGrid.children].forEach((cell, index) => {
    const byte = frame[index];
    cell.querySelector('.hex').textContent = byte.toString(16).toUpperCase().padStart(2, '0');
    cell.querySelector('.char').textContent = byte === 0 ? '␀' : byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '·';
    const changed = index < tracePosition && frame[index] !== initialBytes[index];
    cell.classList.toggle('trace-written', changed);
    cell.classList.toggle('active-write', index === tracePosition - 1);
    cell.classList.remove('overwritten');
  });
  document.getElementById('trace-counter').textContent = `${tracePosition} / ${traceWrites.length} bytes`;
  document.getElementById('trace-next').disabled = tracePosition >= traceWrites.length;
  document.getElementById('trace-reset').disabled = tracePosition === 0;
  document.getElementById('trace-play').disabled = traceWrites.length === 0;
  memoryLabel.textContent = `24 BYTES / ${traceSnapshot.mode.toUpperCase()}`;
  if (traceSnapshot.status === 'INPUT REJECTED') {
    memoryExplain.textContent = 'The patched C program rejected the long input before any copy. The GUEST field is unchanged.';
  } else if (tracePosition === 0) {
    memoryExplain.textContent = 'Initial state: name is empty and the role contains GUEST. Press NEXT BYTE or PLAY to reconstruct each write.';
  } else {
    const offset = tracePosition - 1;
    memoryExplain.textContent = `Step ${tracePosition}: wrote offset ${offset} ${offset >= 16 ? 'in the adjacent ROLE field, outside the 16-byte name buffer.' : 'inside the NAME buffer.'} This is reconstructed from the C output, not a live debugger trace.`;
  }
  if (complete && traceTimer !== null) stopTrace();
}

document.getElementById('trace-next').addEventListener('click', () => {
  stopTrace();
  drawTrace(tracePosition + 1);
});
document.getElementById('trace-reset').addEventListener('click', () => {
  stopTrace();
  drawTrace(0);
});
document.getElementById('trace-play').addEventListener('click', () => {
  if (!traceWrites.length) return;
  if (traceTimer !== null) { stopTrace(); return; }
  if (tracePosition >= traceWrites.length) drawTrace(0);
  const button = document.getElementById('trace-play');
  button.textContent = 'PAUSE';
  button.classList.add('playing');
  traceTimer = setInterval(() => drawTrace(tracePosition + 1), 190);
});

for (const button of document.querySelectorAll('[data-phosphor]')) {
  button.addEventListener('click', () => {
    document.body.dataset.phosphor = button.dataset.phosphor;
    for (const item of document.querySelectorAll('[data-phosphor]')) {
      item.setAttribute('aria-pressed', String(item === button));
    }
  });
}
document.getElementById('terminal-focus').addEventListener('click', () => {
  document.body.classList.toggle('focus-terminal');
  const active = document.body.classList.contains('focus-terminal');
  document.getElementById('terminal-focus').textContent = active ? 'EXIT FOCUS (ESC)' : 'FOCUS TERMINAL';
  input.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('focus-terminal')) {
    document.body.classList.remove('focus-terminal');
    document.getElementById('terminal-focus').textContent = 'FOCUS TERMINAL';
  }
});
