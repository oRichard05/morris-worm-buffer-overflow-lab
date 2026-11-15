const $ = id => document.getElementById(id);
const output = $('terminal-output');
const screen = $('glass');
const form = $('command-form');
const input = $('command-input');

const nameBytes = $('name-bytes');
const nextBytes = $('next-bytes');
const tracePanel = document.querySelector('.trace-panel');
const traceSeek = $('trace-seek');
const tracePlay = $('trace-play');
const blockCursor = $('terminal-block-cursor');

const users = {
  alice: { name: 'Alice Morgan', tty: 'tty01', home: '/usr/alice' },
  bsmith: { name: 'Brian Smith', tty: 'tty02', home: '/usr/bsmith' },
  guest: { name: 'Guest User', tty: 'tty00', home: '/usr/guest' }
};
let mode = 'vulnerable';
let lastResult = null;
let running = false;
let selectedByte = null;
let bytes = initialFrame();
let writes = [];
let position = 0;
let traceTimer = null;
let replayVerified = false;
const history = [];
let historyIndex = 0;

function initialFrame() {
  return Array(16).fill(0).concat([82, 69, 84, 85, 82, 78, 0, 0]);
}
function byteText(number) {
  if (number === 0) return '·';
  return number >= 32 && number <= 126 ? String.fromCharCode(number) : '·';
}
function byteHex(number) {
  return '0x' + number.toString(16).toUpperCase().padStart(2, '0');
}
function syncTerminalCursor() {
  const index = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
  blockCursor.textContent = input.value.charAt(index) || ' ';
  blockCursor.style.left = 'calc(' + index + 'ch - ' + (input.scrollLeft || 0) + 'px)';
  blockCursor.hidden = input.disabled;
}
['input', 'keyup', 'click', 'focus', 'scroll', 'select'].forEach(eventName => {
  input.addEventListener(eventName, syncTerminalCursor);
});

function writeLine(text = '') {
  const line = document.createElement('div');
  line.className = 'line';
  line.textContent = text;
  output.append(line);
  while (output.children.length > 120) output.firstElementChild.remove();
  screen.scrollTop = screen.scrollHeight;
}
function writeLines(lines) { for (const line of lines) writeLine(line); }
function boot() {
  output.replaceChildren();
  writeLines([
    '4.3 BSD UNIX (research-vax) (tty00)',
    '',
    'login: guest',
    'Last login: Wed Nov  2 08:42:17 1988 on tty00',
    ''
  ]);
}
function longFinger(name, plan = true) {
  const user = users[name];
  if (!user) { writeLine('finger: ' + name + ': no such user'); return; }
  writeLine('Login name: ' + name.padEnd(10) + '                 In real life: ' + user.name);
  writeLine('Directory: ' + user.home.padEnd(28) + 'Shell: /bin/csh');
  writeLine('On since Nov  2 09:12:00 on ' + user.tty);
  if (plan) writeLine('No Plan.');
}
function shortFinger(names) {
  writeLine('Login       Name              TTY Idle    When            Office');
  for (const name of names) {
    const user = users[name];
    writeLine(name.padEnd(12) + user.name.padEnd(18) + user.tty.padEnd(4)
      + '  0:01    Nov  2 09:12');
  }
}
async function remoteFinger(name) {
  if (!name) { shortFinger(['alice', 'bsmith', 'guest']); return; }
  if (!/^[A-Za-z0-9_-]{1,22}$/.test(name)) {
    writeLine('finger: invalid remote user name');
    return;
  }
  running = true;
  input.disabled = true;
  syncTerminalCursor();
  stopTrace();
  $('trace-state').textContent = 'RUNNING C';
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, name })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'request failed');
    if (!Array.isArray(data.memory) || data.memory.length !== 24) {
      throw new Error('C program returned an unexpected memory layout');
    }
    lastResult = data;
    useResult(data, name);
    if (data.status === 'INPUT REJECTED') {
      writeLine('finger: remote request rejected');
    } else if (data.flow === 'DIVERTED' || data.flow === 'CORRUPTED') {
      writeLine('finger: connection to research-vax closed unexpectedly');
    } else {
      longFinger(name.toLowerCase());
    }
  } catch (error) {
    writeLine('finger: ' + error.message);
    $('trace-state').textContent = 'SERVICE ERROR';
  } finally {
    running = false;
    input.disabled = false;
    input.focus();
    syncTerminalCursor();
  }
}
async function finger(args) {
  const opts = args.filter(part => part.startsWith('-'));
  if (opts.some(opt => !/^-[lmspqi]+$/.test(opt))) {
    writeLine('usage: finger [-lmsp] [user ...] [user@host ...]');
    return;
  }
  const names = args.filter(part => !part.startsWith('-'));
  const flags = opts.join('');
  if (!names.length) { shortFinger(['alice', 'bsmith', 'guest']); return; }
  if (names.some(name => name.includes('@'))) {
    if (names.length !== 1) { writeLine('finger: one remote query at a time'); return; }
    const [name, host, extra] = names[0].split('@');
    if (extra !== undefined || !['research-vax', 'research-vax.local'].includes((host || '').toLowerCase())) {
      writeLine('finger: unknown host');
      return;
    }
    await remoteFinger(name);
    return;
  }
  for (const name of names) {
    const key = name.toLowerCase();
    if (!users[key]) { writeLine('finger: ' + name + ': no such user'); continue; }
    if (flags.includes('s') || flags.includes('q')) shortFinger([key]);
    else longFinger(key, !flags.includes('p'));
    if (names.length > 1) writeLine();
  }
}
async function run(raw) {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return;
  const command = parts.shift().toLowerCase();
  switch (command) {
    case 'finger': await finger(parts); break;
    case 'who': writeLines(['guest    tty00   Nov  2 08:42', 'alice    tty01   Nov  2 09:12', 'bsmith   tty02   Nov  2 09:08']); break;
    case 'whoami': writeLine('guest'); break;
    case 'hostname': writeLine('research-vax'); break;
    case 'date': writeLine('Wed Nov  2 21:15:00 EST 1988'); break;
    case 'pwd': writeLine('/usr/guest'); break;
    case 'uname': writeLine(parts.includes('-a') ? '4.3BSD research-vax 4.3 BSD UNIX VAX' : '4.3BSD'); break;
    case 'ls': writeLine('mail    notes    .plan'); break;
    case 'cat':
      if (parts[0] === '/etc/motd') writeLine('Welcome to research-vax.');
      else if (parts[0] === '.plan') writeLine('No Plan.');
      else writeLine('cat: ' + (parts[0] || '') + ': No such file or directory');
      break;
    case 'man':
      if (parts[0] === 'finger') writeLines([
        "FINGER(1)            UNIX Programmer's Manual           FINGER(1)",
        '',
        'NAME',
        '     finger - user information lookup program',
        '',
        'SYNOPSIS',
        '     finger [ options ] name ...',
        '',
        'DESCRIPTION',
        '     Display local or remote user information.',
        '     Remote requests use user@host.'
      ]);
      else writeLine('No manual entry for ' + (parts[0] || '') + '.');
      break;
    case 'clear': output.replaceChildren(); break;
    case 'logout':
    case 'exit': boot(); break;
    default: writeLine(command + ': Command not found.');
  }
}
async function submitCommand(command) {
  if (running || !command.trim()) return;
  writeLine('research-vax% ' + command);
  history.push(command);
  if (history.length > 40) history.shift();
  historyIndex = history.length;
  await run(command);
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (running) return;
  const command = input.value;
  input.value = '';
  syncTerminalCursor();
  void submitCommand(command);
});
input.addEventListener('keydown', event => {
  if (event.key === 'ArrowUp' && history.length) {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    input.value = history[historyIndex];
  } else if (event.key === 'ArrowDown' && history.length) {
    event.preventDefault();
    historyIndex = Math.min(history.length, historyIndex + 1);
    input.value = historyIndex === history.length ? '' : history[historyIndex];
  }
});
screen.addEventListener('click', event => {
  if (event.target !== input) input.focus();
});

function stopTrace() {
  if (traceTimer !== null) clearInterval(traceTimer);
  traceTimer = null;
}
function reconstructedFrame(step) {
  const frame = initialFrame();
  for (let i = 0; i < step && i < writes.length; i++) frame[i] = writes[i];
  return frame;
}
function describeByte(index) {
  const number = bytes[index];
  const kind = index < 16 ? 'NAME' : 'NEXT STEP';
  const before = initialFrame()[index];
  let text = byteHex(index) + ' / ' + kind + ' = ' + byteHex(number);
  if (number >= 32 && number <= 126) text += " ('" + String.fromCharCode(number) + "')";
  if (index >= 16 && number !== before) text += ' · previously ' + byteHex(before);
  return text;
}
function renderMemoryCell(index, baseline, crossed) {
  const cell = document.createElement('button');
  const changed = crossed && index >= 16 &&
    index < position && bytes[index] !== baseline[index];
  const current = position > 0 && index === position - 1;

  cell.type = 'button';
  cell.className = 'memory-cell'
    + (bytes[index] === 0 ? ' empty' : '')
    + (index < position ? ' written' : '')
    + (changed ? ' crossed' : '')
    + (current ? ' current' : '')
    + (index === selectedByte ? ' selected' : '');
  cell.textContent = byteText(bytes[index]);
  cell.title = describeByte(index);
  cell.setAttribute('aria-label', cell.title);
  cell.addEventListener('click', () => {
    selectedByte = index;
    $('byte-info').textContent = describeByte(index);
    $('byte-info').hidden = false;
    renderTrace();
  });
  return cell;
}

function renderTrace() {
  const baseline = initialFrame();
  const rejected = Boolean(lastResult && lastResult.status === 'INPUT REJECTED');
  const crossed = replayVerified && position > 16;
  const finished = Boolean(lastResult && (rejected || position >= writes.length));
  const overwritten = finished && bytes.slice(16).some((byte, index) => byte !== baseline[16 + index]);

  tracePanel.classList.toggle('is-crossing', crossed);
  tracePanel.classList.toggle('is-rejected', rejected);
  nameBytes.replaceChildren();
  nextBytes.replaceChildren();
  for (let i = 0; i < 24; i++) {
    (i < 16 ? nameBytes : nextBytes).append(renderMemoryCell(i, baseline, crossed));
  }

  $('boundary-caption').textContent = rejected ? 'BLOCKED'
    : crossed ? 'OVERFLOW' : 'BUFFER LIMIT';
  $('trace-state').textContent = !lastResult ? 'READY'
    : rejected ? 'BLOCKED'
    : !finished && crossed ? 'OVERFLOW'
    : !finished && position > 0 ? 'WRITING'
    : overwritten ? 'OVERWRITTEN' : finished ? 'COMPLETE' : 'READY';
  $('trace-count').textContent = position + ' / ' + writes.length;
  traceSeek.value = String(position);
}

function setTracePosition(next) {
  position = Math.min(writes.length, Math.max(0, next));
  bytes = reconstructedFrame(position);
  renderTrace();
}
function playTrace() {
  if (!replayVerified || !lastResult || !writes.length) return;
  if (traceTimer !== null) {
    stopTrace();
    tracePlay.textContent = 'PLAY ▶';
    return;
  }
  if (position >= writes.length) setTracePosition(0);
  tracePlay.textContent = 'PAUSE Ⅱ';
  traceTimer = setInterval(() => {
    setTracePosition(position + 1);
    if (position >= writes.length) {
      stopTrace();
      tracePlay.textContent = 'REPLAY ↻';
    }
  }, 170);
}
function useResult(result, name) {
  stopTrace();
  selectedByte = null;
  $('byte-info').hidden = true;

  const target = result.memory.map(hex => Number.parseInt(hex, 16));
  const rejected = result.status === 'INPUT REJECTED';
  writes = rejected ? [] : [...name].map(character => character.charCodeAt(0)).concat(0);
  const calculated = reconstructedFrame(writes.length);
  replayVerified = !rejected && calculated.every((byte, index) => byte === target[index]);
  position = 0;

  traceSeek.max = String(writes.length || 1);
  traceSeek.disabled = !replayVerified;
  tracePlay.disabled = !replayVerified;
  tracePlay.textContent = 'REPLAY ↻';

  if (rejected || !replayVerified) {
    bytes = target;
    if (!rejected) position = writes.length;
  } else {
    bytes = initialFrame();
  }
  renderTrace();
  if (replayVerified) playTrace();
}

tracePlay.addEventListener('click', playTrace);
traceSeek.addEventListener('input', () => {
  if (!replayVerified) return;
  stopTrace();
  tracePlay.textContent = 'PLAY ▶';
  setTracePosition(Number(traceSeek.value));
});

function setMode(nextMode) {
  if (mode === nextMode) return;
  stopTrace();
  mode = nextMode;
  lastResult = null;
  selectedByte = null;
  writes = [];
  position = 0;
  replayVerified = false;
  bytes = initialFrame();

  traceSeek.value = '0';
  traceSeek.max = '1';
  traceSeek.disabled = true;
  tracePlay.disabled = true;
  tracePlay.textContent = 'REPLAY ↻';
  $('byte-info').hidden = true;
  for (const version of ['vulnerable', 'patched']) {
    const button = $('mode-' + version);
    const active = version === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  renderTrace();
  input.focus();
  syncTerminalCursor();
}
$('mode-vulnerable').addEventListener('click', () => setMode('vulnerable'));
$('mode-patched').addEventListener('click', () => setMode('patched'));

boot();
renderTrace();
fetch('/api/health').then(response => response.json()).then(data => {
  if (!data.ready) writeLine('finger: local C models are not compiled (run npm run build:lab)');
}).catch(() => writeLine('finger: local demonstration unavailable'));
input.focus();
syncTerminalCursor();
