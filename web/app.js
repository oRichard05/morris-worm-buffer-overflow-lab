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
    memoryExplain.textContent = `The name buffer ends at offset 15. The input writes into the adjacent role field beginning at offset 16. The highlighted bytes come from the C program's memory dump. This is a controlled example of undefined behavior.`;
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
  roleDetail.textContent = unlocked ? 'Privilege escalation in demo' : 'Restricted permissions';
  vaultDetail.textContent = unlocked ? 'Unexpected access granted' : 'Access restricted';
  document.getElementById('input-length').textContent = `${name.length} bytes`;
  showMemory(result, name);
  if (result.status === 'INPUT REJECTED') {
    setMessage('safe', 'Input rejected by length check', 'The patched program prevented the overflow and kept the vault locked.');
    terminalLine('STATUS: INPUT REJECTED', 'success');
  } else if (unlocked) {
    setMessage('danger', 'Security boundary crossed', 'Untrusted name data changed the role field to ADMIN.');
    terminalLine('ALERT: VAULT UNLOCKED WITHOUT AUTHORIZATION', 'error');
  } else if (name.length >= 16 && mode === 'vulnerable') {
    setMessage('danger', 'Adjacent memory was modified', 'The input crossed the name buffer boundary. The role was corrupted but access was not granted.');
    terminalLine('WARNING: OUT-OF-BOUNDS WRITE DETECTED IN DEMO', 'error');
  } else {
    setMessage('safe', 'Normal behavior', 'The input fits within the buffer and access remains restricted.');
  }
  for (const line of result.stdout.split('\n').filter(line => !line.startsWith('MEMORY:'))) {
    terminalLine(line, line.includes('UNLOCKED') ? 'error' : '');
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
