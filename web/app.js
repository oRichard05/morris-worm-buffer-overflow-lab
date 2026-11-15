const $ = id => document.getElementById(id);
const terminalView = $('terminal-view');
const analysisView = $('analysis-view');
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
const payload = 'AAAAAAAAAAAAAAAADIVERT';
let mode = 'vulnerable';
let lastResult = null;
let lastName = '';
let running = false;
let format = 'ascii';
let selectedByte = null;
let bytes = initialFrame();
let writes = [];
let position = 0;
let traceTimer = null;
let replayVerified = false;
let lessonStep = 0;
const history = [];
let historyIndex = 0;

function initialFrame() {
  return Array(16).fill(0).concat([82, 69, 84, 85, 82, 78, 0, 0]);
}
function byteText(number) {
  if (format === 'hex') return number.toString(16).padStart(2, '0').toUpperCase();
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
  $('trace-source').textContent = 'AWAITING RESULT';
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
    lastName = name;
    useResult(data, name);
    updateGuide();
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
    $('trace-source').textContent = 'NO NEW SNAPSHOT';
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
function renderDumpRow(start, baseline, crossed) {
  const row = document.createElement('div');
  row.className = 'dump-row';
  if (crossed && start >= 16) row.classList.add('is-overwritten');

  const address = document.createElement('span');
  address.className = 'dump-address';
  address.textContent = '+0x' + start.toString(16).toUpperCase().padStart(2, '0');

  const values = document.createElement('div');
  values.className = 'dump-hex';
  for (let index = start; index < start + 8; index++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    const changed = index >= 16 && index < position && bytes[index] !== baseline[index];
    cell.className = 'mem-byte'
      + (index < position ? ' written' : '')
      + (crossed && changed ? ' crossed' : '')
      + (index === position - 1 && position > 0 ? ' cursor' : '')
      + (index === selectedByte ? ' chosen' : '');
    cell.textContent = byteHex(bytes[index]).slice(2);
    cell.title = describeByte(index);
    cell.setAttribute('aria-label', cell.title);
    cell.addEventListener('click', () => {
      selectedByte = index;
      $('byte-info').textContent = describeByte(index);
      renderTrace();
    });
    values.append(cell);
  }
  const ascii = document.createElement('span');
  ascii.className = 'dump-ascii';
  ascii.textContent = bytes.slice(start, start + 8)
    .map(value => value >= 32 && value <= 126 ? String.fromCharCode(value) : '·')
    .join('');

  row.append(address, values, ascii);
  return row;
}

function renderTrace() {
  const baseline = initialFrame();
  nameBytes.replaceChildren();
  nextBytes.replaceChildren();
  const crossed = replayVerified && position > 16;
  const finishing = lastResult && (lastResult.status === 'INPUT REJECTED' || position >= writes.length);
  const changed = lastResult && finishing &&
    bytes.slice(16).some((value, index) => value !== baseline[16 + index]);

  tracePanel.classList.toggle('is-crossing', crossed);
  $('flow-visual').classList.toggle('is-diverted',
    Boolean(lastResult && finishing && lastResult.flow === 'DIVERTED'));
  nameBytes.append(renderDumpRow(0, baseline, crossed), renderDumpRow(8, baseline, crossed));
  nextBytes.append(renderDumpRow(16, baseline, crossed));

  $('flow-value').textContent = !lastResult ? '—'
    : lastResult.status === 'INPUT REJECTED' ? 'RETURN'
    : !finishing && crossed ? 'WRITING…'
    : finishing ? lastResult.next || '?' : 'RETURN';
  $('trace-count').textContent = position + ' / ' + writes.length + ' BYTES';
  traceSeek.value = String(position);
  $('trace-state').textContent = !lastResult ? 'READY'
    : lastResult.status === 'INPUT REJECTED' ? 'BLOCKED'
    : !finishing && crossed ? 'OVERFLOW'
    : !finishing && position > 0 ? 'WRITING'
    : changed ? 'ALTERED' : finishing ? 'COMPLETE' : 'READY';
  $('trace-caption').textContent = !lastResult ? 'Run a query to inspect memory.'
    : lastResult.status === 'INPUT REJECTED' ? 'Rejected before writing any input bytes.'
    : !finishing && crossed ? 'Bytes are now crossing the 16-byte limit.'
    : !finishing ? 'Reconstructing the memory writes…'
    : lastResult.flow === 'DIVERTED' ? 'The symbolic next step has changed.'
    : 'The input stayed within its buffer.';
  $('trace-source').textContent = !lastResult ? 'BEFORE INPUT'
    : lastResult.status === 'INPUT REJECTED' ? 'PATCHED / C RESULT'
    : replayVerified ? 'VERIFIED C REPLAY' : 'C RESULT';
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
    tracePlay.textContent = 'Play';
    return;
  }
  if (position >= writes.length) setTracePosition(0);
  tracePlay.textContent = 'Pause';
  traceTimer = setInterval(() => {
    setTracePosition(position + 1);
    if (position >= writes.length) {
      stopTrace();
      tracePlay.textContent = 'Replay';
    }
  }, 95);
}
function useResult(result, name) {
  stopTrace();
  selectedByte = null;
  $('input-preview').textContent = name;
  $('input-length').textContent = name.length + ' CHARS + END BYTE';
  const target = result.memory.map(hex => Number.parseInt(hex, 16));
  const rejected = result.status === 'INPUT REJECTED';
  writes = rejected ? [] : [...name].map(char => char.charCodeAt(0)).concat(0);
  const expected = reconstructedFrame(writes.length);
  replayVerified = !rejected && expected.every((byte, index) => byte === target[index]);
  position = 0;

  traceSeek.max = String(writes.length || 1);
  traceSeek.disabled = !replayVerified;
  tracePlay.disabled = !replayVerified;
  tracePlay.textContent = 'Replay';

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
  tracePlay.textContent = 'Play';
  setTracePosition(Number(traceSeek.value));
});

function updateGuide() {
  let label, title, description, command = '';
  const hasLong = Boolean(lastResult && lastName.length >= 16);
  if (mode === 'patched' && hasLong) {
    label = '04 / PROTECTED'; title = 'The copy was stopped';
    description = 'Same request. The next step stayed RETURN.';
  } else if (mode === 'patched') {
    label = '04 / COMPARE'; title = 'Test the fix';
    description = 'Run the same long request with the length check.';
    command = 'finger ' + payload + '@research-vax';
  } else if (hasLong) {
    label = '03 / EXPLAIN'; title = 'Follow the overwritten bytes';
    description = 'The boundary has been crossed. Examine the trace.';
  } else if (lastResult) {
    label = '02 / OVERFLOW'; title = 'Now exceed 16 bytes';
    description = 'Compare this write with a longer request.';
    command = 'finger ' + payload + '@research-vax';
  } else {
    label = '01 / BASELINE'; title = 'Start with a short name';
    description = 'Watch a normal request stay inside its buffer.';
    command = 'finger alice@research-vax';
  }
  $('guide-step').textContent = label;
  $('guide-title').textContent = title;
  $('guide-description').textContent = description;
  $('guide-command').textContent = command;
  $('guide-command').hidden = !command;
  $('guide-run').hidden = !command;
  $('inspect-link').hidden = !hasLong;
}
$('guide-run').addEventListener('click', async () => {
  const cmd = $('guide-command').textContent;
  if (!cmd || running) return;
  const button = $('guide-run');
  button.disabled = true;
  try { await submitCommand(cmd); }
  finally { button.disabled = false; input.focus(); }
});

function showAnalysis() {
  if (!lastResult) return;
  stopTrace();
  lessonStep = 0;
  drawLesson();
  terminalView.hidden = true;
  analysisView.hidden = false;
  window.scrollTo(0, 0);
}
function closeAnalysis() {
  analysisView.hidden = true;
  terminalView.hidden = false;
  input.focus();
}
function drawLesson() {
  if (!lastResult) return;
  const rejected = lastResult.status === 'INPUT REJECTED';
  const long = lastName.length >= 16;
  const actual = lastResult.memory.map(hex => Number.parseInt(hex, 16));
  let current = initialFrame();
  if (lessonStep === 1) {
    const first = [...lastName].map(char => char.charCodeAt(0)).concat(0);
    for (let i = 0; i < Math.min(16, first.length); i++) current[i] = first[i];
  }
  if (lessonStep >= 2) current = actual;

  const steps = [
    {
      title: 'A fixed amount of space',
      description: 'The local C model reserves 16 bytes for a name. The next 8 bytes hold a label describing what the program would do next.',
      note: 'These are neighboring fields of one C stack object, not the original 1988 machine layout.'
    },
    {
      title: long ? 'The request does not fit' : 'The request fits',
      description: lastName.length + ' characters need ' + (lastName.length + 1) + ' bytes with the end marker. The name field has only 16.',
      note: rejected ? 'This is only a preview. The corrected program rejected the input before copying it.'
        : 'Notice where the name ends and the next field begins.'
    },
    {
      title: rejected ? 'The length check prevents the write' : long ? 'The copy reaches the next field' : 'The next field stays unchanged',
      description: rejected ? 'The corrected program refused the oversized input. No neighboring bytes were touched.'
        : long ? 'The unchecked write changed the symbolic next step from RETURN to ' + lastResult.next + '.'
          : 'The string ended before reaching the boundary.',
      note: rejected ? 'The next-step field still contains RETURN.'
        : 'The main inspector replays these bytes individually, using the result returned by C.'
    },
    {
      title: 'What really happened in 1988',
      description: 'The historical 4.3BSD fingerd used gets() with a 512-byte stack buffer and did not check the incoming line length. The Morris Worm exploited this flaw on vulnerable VAX systems to redirect real execution.',
      note: 'Our model changes data representing a next step. It does not overwrite an actual return address or execute the worm.'
    }
  ];
  const detail = steps[lessonStep];
  $('lesson-count').textContent = String(lessonStep + 1).padStart(2, '0') + ' / 04';
  $('lesson-title').textContent = detail.title;
  $('lesson-text').textContent = detail.description;
  $('lesson-note').textContent = detail.note;
  $('lesson-memory').replaceChildren();
  current.forEach((value, index) => {
    const cell = document.createElement('div');
    cell.className = 'lesson-byte' + (index >= 16 ? ' next' : '')
      + (lessonStep >= 2 && !rejected && index >= 16 && value !== initialFrame()[index] ? ' overwritten' : '');
    const char = document.createElement('span');
    char.textContent = value === 0 ? '·' : value >= 32 && value <= 126 ? String.fromCharCode(value) : '·';
    const addr = document.createElement('small');
    addr.textContent = index.toString(16).padStart(2, '0').toUpperCase();
    cell.append(char, addr);
    $('lesson-memory').append(cell);
  });
  $('lesson-previous').disabled = lessonStep === 0;
  $('lesson-next').textContent = lessonStep < 3 ? 'Next →'
    : mode === 'vulnerable' ? 'Try the corrected version →' : 'Return to terminal →';
  $('lesson-reset').hidden = !(lessonStep === 3 && mode === 'patched');
}
function switchMode(nextMode) {
  stopTrace();
  const previous = lastName;
  mode = nextMode;
  lastResult = null;
  lastName = '';
  writes = [];
  position = 0;
  replayVerified = false;
  bytes = initialFrame();
  selectedByte = null;
  $('input-preview').textContent = 'Awaiting a finger request';
  $('input-length').textContent = '0 BYTES';
  traceSeek.disabled = true;
  tracePlay.disabled = true;
  traceSeek.max = '1';
  tracePlay.textContent = 'Replay';
  renderTrace();
  updateGuide();
  closeAnalysis();
  input.value = previous ? 'finger ' + previous + '@research-vax' : '';
  syncTerminalCursor();
}
$('inspect-link').addEventListener('click', showAnalysis);
$('back-terminal').addEventListener('click', closeAnalysis);
$('lesson-previous').addEventListener('click', () => {
  lessonStep = Math.max(0, lessonStep - 1);
  drawLesson();
});
$('lesson-next').addEventListener('click', () => {
  if (lessonStep === 3) {
    if (mode === 'patched') closeAnalysis();
    else switchMode('patched');
    return;
  }
  lessonStep++;
  drawLesson();
});
$('lesson-reset').addEventListener('click', () => switchMode('vulnerable'));
document.addEventListener('keydown', event => {
  if (event.key === 'F2' && analysisView.hidden && lastResult) {
    event.preventDefault(); showAnalysis();
  }
  if (event.key === 'Escape' && !analysisView.hidden) {
    event.preventDefault(); closeAnalysis();
  }
});

boot();
renderTrace();
updateGuide();
fetch('/api/health').then(response => response.json()).then(data => {
  if (!data.ready) writeLine('finger: local C models are not compiled (run npm run build:lab)');
}).catch(() => writeLine('finger: local demonstration unavailable'));
input.focus();
syncTerminalCursor();
