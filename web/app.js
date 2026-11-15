const $ = id => document.getElementById(id);
const output = $('terminal-output');
const screen = $('glass');
const form = $('command-form');
const input = $('command-input');

const ribbon = $('memory-ribbon');
const magnifier = $('zoom-bytes');
const memoryLab = document.querySelector('.memory-lab');
const traceSeek = $('trace-seek');
const tracePlay = $('trace-play');
const pointer = $('write-pointer');
const blockCursor = $('terminal-block-cursor');

const users = {
  alice: { name: 'Alice Morgan', tty: 'tty01', home: '/usr/alice' },
  bsmith: { name: 'Brian Smith', tty: 'tty02', home: '/usr/bsmith' },
  guest: { name: 'Guest User', tty: 'tty00', home: '/usr/guest' }
};
let mode = 'vulnerable';
let lastResult = null;
let running = false;
let selectedByte = 16;
let zoomStart = 16;
let followPlayback = true;
let bytes = initialFrame();
let writes = [];
let position = 0;
let traceTimer = null;
let replayVerified = false;
const history = [];
let historyIndex = 0;

function initialFrame() {
  return Array(16).fill(0).concat(Array(8).fill(90));
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
  $('memory-status').textContent = 'RUNNING C';
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
    } else if (data.corrupted) {
      writeLine('finger: remote response corrupted');
    } else {
      longFinger(name.toLowerCase());
    }
  } catch (error) {
    writeLine('finger: ' + error.message);
    $('memory-status').textContent = 'SERVICE ERROR';
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
function reconstructedFrame(count) {
  const frame = initialFrame();
  for (let i = 0; i < count && i < writes.length; i++) frame[i] = writes[i];
  return frame;
}
function byteAt(index) {
  return '0x' + index.toString(16).toUpperCase().padStart(2, '0');
}
function describeByte(index) {
  const byte = bytes[index];
  const before = initialFrame()[index];
  const char = byte === 0 ? 'NUL' :
    byte >= 32 && byte <= 126 ? "'" + String.fromCharCode(byte) + "'" : 'nonprintable';
  return byteAt(index) + ' = ' + byteHex(byte) + ' ' + char
    + (index >= 16 && byte !== before ? ' (was ' + byteHex(before) + ')' : '');
}
function focusByte(index) {
  followPlayback = false;
  selectedByte = index;
  zoomStart = Math.floor(index / 8) * 8;
  renderMemory();
}
function selectWindow(index) {
  selectedByte = index;
  zoomStart = Math.floor(index / 8) * 8;
}
function renderMemory() {
  const baseline = initialFrame();
  const rejected = Boolean(lastResult && lastResult.status === 'INPUT REJECTED');
  const altered = bytes.slice(16).filter((byte, i) => byte !== baseline[16 + i]).length;
  const crossed = altered > 0;
  const finished = Boolean(lastResult && (rejected || position >= writes.length));
  const activeIndex = lastResult && !rejected && position > 0 ? position - 1 : null;

  memoryLab.classList.toggle('is-overflow', crossed);
  ribbon.replaceChildren();
  for (let index = 0; index < 24; index++) {
    const segment = document.createElement('button');
    segment.type = 'button';
    segment.className = 'ribbon-byte'
      + (index < position && !rejected ? ' written' : '')
      + (index >= 16 && bytes[index] !== baseline[index] ? ' changed' : '')
      + (activeIndex === index ? ' active' : '')
      + (index >= zoomStart && index < zoomStart + 8 ? ' focused' : '');
    segment.title = describeByte(index);
    segment.setAttribute('aria-label', describeByte(index));
    segment.addEventListener('click', () => focusByte(index));
    ribbon.append(segment);
  }

  const pointerVisible = Boolean(lastResult && !rejected && position > 0);
  pointer.classList.toggle('is-hidden', !pointerVisible);
  const pointerIndex = pointerVisible ? position - 1 : 0;
  pointer.style.left = (100 * (pointerIndex + 0.5) / 24) + '%';

  magnifier.replaceChildren();
  for (let index = zoomStart; index < zoomStart + 8; index++) {
    const value = bytes[index];
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'zoom-byte'
      + (value === 0 ? ' empty' : '')
      + (index >= 16 && value !== baseline[index] ? ' changed' : '')
      + (activeIndex === index ? ' active' : '')
      + (selectedByte === index ? ' selected' : '');
    item.textContent = byteText(value);
    item.title = describeByte(index);
    item.setAttribute('aria-label', describeByte(index));
    item.addEventListener('click', () => focusByte(index));
    magnifier.append(item);
  }
  $('zoom-range').textContent = byteAt(zoomStart) + ' — ' + byteAt(zoomStart + 7);
  $('selected-address').textContent = byteAt(selectedByte);
  $('selected-value').textContent = byteHex(bytes[selectedByte]);
  const value = bytes[selectedByte];
  $('selected-character').textContent = value === 0 ? 'NUL'
    : value >= 32 && value <= 126 ? String.fromCharCode(value) : '·';

  $('memory-status').textContent = !lastResult ? 'MEMORY READY' :
    rejected ? 'INPUT BLOCKED' : crossed ? 'MEMORY CORRUPTED' :
    finished ? 'MEMORY INTACT' : 'WRITING…';
  $('memory-delta').textContent = altered + (altered === 1 ? ' BYTE CHANGED' : ' BYTES CHANGED');
  $('trace-count').textContent = position + ' / ' + writes.length;
  traceSeek.value = String(position);
}
function setTracePosition(step) {
  position = Math.max(0, Math.min(writes.length, step));
  bytes = reconstructedFrame(position);
  if (followPlayback) {
    const next = position > 16 ? 16 : position > 8 ? 8 : 0;
    const active = position > 0 ? position - 1 : next;
    selectWindow(active);
  }
  renderMemory();
}
function playTrace() {
  if (!replayVerified || !lastResult || !writes.length) return;
  if (traceTimer !== null) {
    stopTrace();
    tracePlay.textContent = 'PLAY ▶';
    return;
  }
  if (position >= writes.length) setTracePosition(0);
  followPlayback = true;
  tracePlay.textContent = 'PAUSE Ⅱ';
  traceTimer = setInterval(() => {
    setTracePosition(position + 1);
    if (position >= writes.length) {
      stopTrace();
      tracePlay.textContent = 'REPLAY ↻';
    }
  }, 165);
}
function useResult(result, name) {
  stopTrace();
  lastResult = result;
  const target = result.memory.map(hex => Number.parseInt(hex, 16));
  const rejected = result.status === 'INPUT REJECTED';
  writes = rejected ? [] : [...name].map(c => c.charCodeAt(0)).concat(0);
  const expected = reconstructedFrame(writes.length);
  replayVerified = !rejected && expected.every((byte, index) => byte === target[index]);
  position = 0;
  followPlayback = true;
  selectedByte = rejected ? 16 : 0;
  zoomStart = rejected ? 16 : 0;
  traceSeek.max = String(writes.length || 1);
  traceSeek.disabled = !replayVerified;
  tracePlay.disabled = !replayVerified;
  tracePlay.textContent = 'REPLAY ↻';

  if (rejected || !replayVerified) {
    bytes = target;
    if (!rejected) position = writes.length;
    selectedByte = 16;
    zoomStart = 16;
  } else {
    bytes = initialFrame();
  }
  renderMemory();
  if (replayVerified) playTrace();
}
tracePlay.addEventListener('click', playTrace);
traceSeek.addEventListener('input', () => {
  if (!replayVerified) return;
  stopTrace();
  tracePlay.textContent = 'PLAY ▶';
  followPlayback = true;
  setTracePosition(Number(traceSeek.value));
});

function setMode(nextMode) {
  if (running || mode === nextMode) return;
  stopTrace();
  mode = nextMode;
  lastResult = null;
  selectedByte = 16;
  zoomStart = 16;
  followPlayback = true;
  writes = [];
  position = 0;
  replayVerified = false;
  bytes = initialFrame();

  traceSeek.value = '0';
  traceSeek.max = '1';
  traceSeek.disabled = true;
  tracePlay.disabled = true;
  tracePlay.textContent = 'REPLAY ↻';
  for (const version of ['vulnerable', 'patched']) {
    const button = $('mode-' + version);
    const active = version === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('run-mode').textContent = mode.toUpperCase();
  renderMemory();
  input.focus();
  syncTerminalCursor();
}
$('mode-vulnerable').addEventListener('click', () => setMode('vulnerable'));
$('mode-patched').addEventListener('click', () => setMode('patched'));

boot();
renderMemory();
fetch('/api/health').then(response => response.json()).then(data => {
  if (!data.ready) writeLine('finger: local C models are not compiled (run npm run build:lab)');
}).catch(() => writeLine('finger: local demonstration unavailable'));
input.focus();
syncTerminalCursor();
