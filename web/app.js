const terminalView = document.getElementById('terminal-view');
const analysisView = document.getElementById('analysis-view');
const output = document.getElementById('terminal-output');
const glass = document.getElementById('glass');
const form = document.getElementById('command-form');
const input = document.getElementById('command-input');
const memoryGrid = document.getElementById('memory-grid');
const inspectLink = document.getElementById('inspect-link');
const previousButton = document.getElementById('step-previous');
const nextButton = document.getElementById('step-next');
const replayControls = document.getElementById('replay-controls');
const replayButton = document.getElementById('replay-button');
const replayStatus = document.getElementById('replay-status');

const users = {
  alice: { name: 'Alice Morgan', tty: 'tty01', home: '/usr/alice' },
  bsmith: { name: 'Brian Smith', tty: 'tty02', home: '/usr/bsmith' },
  guest: { name: 'Guest User', tty: 'tty00', home: '/usr/guest' }
};
let mode = 'vulnerable';
let lastResult = null;
let lastName = '';
let busy = false;
const commands = [];
let historyIndex = 0;
let lessonStep = 0;
let replayTimer = null;
let replayPosition = 0;

function write(message = '') {
  const div = document.createElement('div');
  div.className = 'line';
  div.textContent = message;
  output.append(div);
  while (output.children.length > 120) output.firstElementChild.remove();
  glass.scrollTop = glass.scrollHeight;
}
function lines(messages) { for (const message of messages) write(message); }
function startup() {
  output.replaceChildren();
  lines([
    '4.3 BSD UNIX (research-vax) (tty00)',
    '',
    'login: guest',
    'Last login: Wed Nov  2 08:42:17 1988 on tty00',
    ''
  ]);
}
function longFinger(id, showPlan = true) {
  const user = users[id];
  if (!user) { write('finger: ' + id + ': no such user'); return; }
  write('Login name: ' + id.padEnd(10) + '                 In real life: ' + user.name);
  write('Directory: ' + user.home.padEnd(28) + 'Shell: /bin/csh');
  write('On since Nov  2 09:12:00 on ' + user.tty);
  if (showPlan) write('No Plan.');
}
function shortFinger(ids) {
  write('Login       Name              TTY Idle    When            Office');
  for (const id of ids) {
    const user = users[id];
    write(id.padEnd(12) + user.name.padEnd(18) + user.tty.padEnd(4)
      + '  0:01    Nov  2 09:12');
  }
}
async function remoteFinger(name) {
  if (!name) { shortFinger(['alice','bsmith','guest']); return; }
  if (!/^[A-Za-z0-9_-]{1,21}$/.test(name)) {
    write('finger: invalid remote user name');
    return;
  }
  busy = true;
  input.disabled = true;
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, name })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'remote query failed');
    lastResult = data;
    lastName = name;
    if (name.length >= 16) inspectLink.hidden = false;
    if (data.status === 'INPUT REJECTED') {
      write('finger: remote request rejected');
    } else if (data.role === 'ADMIN' && data.vault === 'UNLOCKED') {
      write('finger: connection to research-vax closed unexpectedly');
    } else if (name.length >= 16) {
      write('finger: remote host returned no user information');
    } else {
      longFinger(name.toLowerCase());
    }
  } catch (error) {
    write('finger: ' + error.message);
  } finally {
    busy = false;
    input.disabled = false;
    input.focus();
  }
}
async function finger(args) {
  const opts = args.filter(arg => arg.startsWith('-'));
  if (opts.some(opt => !/^-[lmspqi]+$/.test(opt))) {
    write('usage: finger [-lmsp] [user ...] [user@host ...]');
    return;
  }
  const names = args.filter(arg => !arg.startsWith('-'));
  const flags = opts.join('');
  if (names.length === 0) {
    shortFinger(['alice','bsmith','guest']);
    return;
  }
  if (names.some(name => name.includes('@'))) {
    if (names.length !== 1) { write('finger: one remote query at a time'); return; }
    const [name, host, extra] = names[0].split('@');
    if (extra !== undefined || !['research-vax', 'research-vax.local'].includes((host || '').toLowerCase())) {
      write('finger: unknown host');
      return;
    }
    await remoteFinger(name);
    return;
  }
  for (const name of names) {
    const id = name.toLowerCase();
    if (!(id in users)) { write('finger: ' + name + ': no such user'); continue; }
    if (flags.includes('s') || flags.includes('q')) shortFinger([id]);
    else longFinger(id, !flags.includes('p'));
    if (names.length > 1) write();
  }
}
function manFinger() {
  lines([
    "FINGER(1)             UNIX Programmer's Manual             FINGER(1)",
    '',
    'NAME',
    '     finger - user information lookup program',
    '',
    'SYNOPSIS',
    '     finger [ options ] name ...',
    '',
    'DESCRIPTION',
    '     Display login and personal information for users.',
    '     A remote query uses the form user@host.',
    '',
    'OPTIONS',
    '     -l  long listing',
    '     -s  short listing',
    '     -p  do not display plan files'
  ]);
}
async function run(raw) {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return;
  const command = tokens.shift().toLowerCase();
  switch (command) {
    case 'finger': await finger(tokens); break;
    case 'who':
      lines(['guest    tty00   Nov  2 08:42', 'alice    tty01   Nov  2 09:12', 'bsmith   tty02   Nov  2 09:08']); break;
    case 'whoami': write('guest'); break;
    case 'hostname': write('research-vax'); break;
    case 'date': write('Wed Nov  2 21:15:00 EST 1988'); break;
    case 'pwd': write('/usr/guest'); break;
    case 'uname': write(tokens.includes('-a') ? '4.3BSD research-vax 4.3 BSD UNIX VAX' : '4.3BSD'); break;
    case 'ls': write('mail    notes    .plan'); break;
    case 'cat':
      if (tokens[0] === '/etc/motd') write('Welcome to research-vax.');
      else if (tokens[0] === '.plan') write('No Plan.');
      else write('cat: ' + (tokens[0] || '') + ': No such file or directory');
      break;
    case 'man':
      if (tokens[0] === 'finger') manFinger();
      else write('No manual entry for ' + (tokens[0] || '') + '.');
      break;
    case 'clear': output.replaceChildren(); break;
    case 'exit':
    case 'logout': startup(); break;
    default: write(command + ': Command not found.');
  }
}
function baseMemory() {
  return [...Array(16).fill(0), 71, 85, 69, 83, 84, 0, 0, 0];
}

function stopReplay() {
  if (replayTimer !== null) clearInterval(replayTimer);
  replayTimer = null;
}

function showBytes(bytes, written = 0, active = -1) {
  memoryGrid.replaceChildren();
  bytes.forEach((number, index) => {
    const cell = document.createElement('div');
    const role = index >= 16;
    const overwritten = role && index < written;
    cell.className = 'memory-byte' + (role ? ' role' : '')
      + (overwritten ? ' overwritten' : '') + (index === active ? ' current' : '');
    const character = document.createElement('span');
    character.textContent = number === 0 ? '·' :
      number >= 32 && number <= 126 ? String.fromCharCode(number) : '·';
    const offset = document.createElement('span');
    offset.className = 'offset';
    offset.textContent = String(index);
    cell.title = 'Byte ' + index + ': 0x' + number.toString(16).toUpperCase().padStart(2, '0');
    cell.append(character, offset);
    memoryGrid.append(cell);
  });
}

function replayWrites() {
  if (!lastResult || lessonStep !== 2) return;
  stopReplay();
  const writes = [...lastName].map(char => char.charCodeAt(0)).concat(0);
  const starting = baseMemory();
  const expected = starting.slice();
  writes.forEach((value, index) => { expected[index] = value; });
  const actual = lastResult.memory.map(hex => parseInt(hex, 16));

  if (expected.some((value, index) => value !== actual[index])) {
    replayControls.hidden = true;
    showBytes(actual, lastName.length + 1);
    document.getElementById('memory-explanation').textContent =
      'The final C memory does not match the reconstructed writes. Replay is unavailable.';
    return;
  }

  replayPosition = 0;
  const bytes = starting.slice();
  showBytes(bytes);
  replayStatus.textContent = '0 / ' + writes.length + ' bytes written';
  document.getElementById('memory-explanation').textContent =
    'Watch the name fill its 16 spaces, then reach the neighboring role field.';

  replayTimer = setInterval(() => {
    if (lessonStep !== 2 || analysisView.hidden) { stopReplay(); return; }
    const index = replayPosition;
    bytes[index] = writes[index];
    replayPosition++;
    showBytes(bytes, replayPosition, index);
    replayStatus.textContent = replayPosition + ' / ' + writes.length + ' bytes written';
    if (index >= 16) {
      document.getElementById('memory-explanation').textContent =
        'Byte ' + index + ' is outside the name buffer. The role is being changed.';
    }
    if (replayPosition === writes.length) {
      stopReplay();
      replayStatus.textContent = 'Finished · ' + writes.length + ' bytes written';
      document.getElementById('memory-explanation').textContent =
        'The role changed from GUEST to ' + lastResult.role +
        '. This is a controlled C model, not the original 1988 exploit.';
    }
  }, 150);
}

function renderLesson() {
  if (!lastResult) return;
  stopReplay();

  const rejected = lastResult.status === 'INPUT REJECTED';
  const isLong = lastName.length >= 16;
  const initial = baseMemory();
  const letters = [...lastName].map(c => c.charCodeAt(0)).concat(0);
  let bytes = initial.slice();

  if (lessonStep === 1) {
    for (let i = 0; i < Math.min(letters.length, 16); i++) bytes[i] = letters[i];
  } else if (lessonStep >= 2) {
    bytes = lastResult.memory.map(value => parseInt(value, 16));
  }

  const steps = [
    {
      title: 'Where does the name go?',
      description: 'The C program has 16 bytes reserved for a name, followed by 8 bytes for a role.',
      explanation: 'Each box is one byte. The name also needs a final byte to mark its end, so at most 15 letters fit safely.'
    },
    {
      title: isLong ? 'The name does not fit' : 'The name fits',
      description: 'This request contains ' + lastName.length + ' characters. With the end-of-string byte, it needs ' + (lastName.length + 1) + ' spaces. Only 16 are available for the name.',
      explanation: isLong
        ? 'The first 16 boxes show where the letters would go. There is still more input left, but no more room in the name field.'
        : 'There is room for the whole name and the end-of-string byte.'
    },
    {
      title: rejected ? 'The fix stops the write' : isLong ? 'The input crosses the boundary' : 'The memory stays intact',
      description: rejected
        ? 'The corrected C program checked the length before copying anything. The request was rejected.'
        : isLong
          ? 'The input keeps going past the name field. In our C model, it changes the neighboring role from GUEST to ' + lastResult.role + '.'
          : 'The input stays inside the name field. The role remains GUEST.',
      explanation: rejected
        ? 'No input was copied. The neighboring role still reads GUEST.'
        : isLong
          ? 'Watch the letters reach the end of the name field and enter the next memory region.'
          : 'All the bytes stay where they belong.'
    },
    {
      title: mode === 'patched' ? 'Why did the fix work?' : 'What happened in 1988?',
      description: mode === 'patched'
        ? 'The same long input was rejected because it would not fit in the buffer. The neighboring data was left unchanged.'
        : 'The real UNIX fingerd service used an unchecked gets() call with a 512-byte buffer. The Morris Worm exploited that mistake to redirect the program\'s execution.',
      explanation: mode === 'patched'
        ? 'The historical lesson: check an input\'s length before writing it into memory. Return to the terminal or reset the experiment to compare.'
        : 'Our 16-byte model only changes a role field; the 1988 attack could change which instructions ran. Choose Try the fix to repeat the same input with a length check.'
    }
  ];

  const detail = steps[lessonStep];
  document.getElementById('step-number').textContent = 'STEP ' + (lessonStep + 1) + ' OF 4';
  document.getElementById('step-title').textContent = detail.title;
  document.getElementById('step-description').textContent = detail.description;
  document.getElementById('memory-explanation').textContent = detail.explanation;
  document.getElementById('memory-label').textContent = lessonStep === 0
    ? 'BEFORE INPUT' : lessonStep === 1 ? 'FIRST 16 BYTES' : 'RESULT FROM C';

  const canReplay = lessonStep === 2 && isLong && !rejected && lastResult.mode === 'vulnerable';
  replayControls.hidden = !canReplay;
  showBytes(bytes, lessonStep >= 2 && !rejected && isLong ? lastName.length + 1 : 0);
  if (canReplay) replayWrites();

  previousButton.disabled = lessonStep === 0;
  nextButton.textContent = lessonStep === 3
    ? mode === 'patched' ? 'Back to terminal →' : 'Try the fix →'
    : 'Next →';
  document.getElementById('reset-demo').hidden = !(lessonStep === 3 && mode === 'patched');
}

function showAnalysis() {
  if (!lastResult) return;
  lessonStep = 0;
  renderLesson();
  terminalView.hidden = true;
  analysisView.hidden = false;
  window.scrollTo(0,0);
}

function closeAnalysis() {
  stopReplay();
  analysisView.hidden = true;
  terminalView.hidden = false;
  input.focus();
}

previousButton.addEventListener('click', () => {
  lessonStep = Math.max(0,lessonStep - 1);
  renderLesson();
});
function changeVersion(nextMode) {
  const previousQuery = lastName;
  mode = nextMode;
  lastResult = null;
  inspectLink.hidden = true;
  closeAnalysis();
  input.value = previousQuery ? 'finger ' + previousQuery + '@research-vax' : '';
  input.focus();
}

nextButton.addEventListener('click', () => {
  if (lessonStep === 3) {
    if (mode === 'patched') closeAnalysis();
    else changeVersion('patched');
    return;
  }
  lessonStep++;
  renderLesson();
});
inspectLink.addEventListener('click', showAnalysis);
replayButton.addEventListener('click', replayWrites);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const value = input.value;
  input.value = '';
  write('research-vax% ' + value);
  if (value.trim()) {
    commands.push(value);
    if (commands.length > 40) commands.shift();
    historyIndex = commands.length;
  }
  await run(value);
});
input.addEventListener('keydown', event => {
  if (event.key === 'ArrowUp' && commands.length) {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    input.value = commands[historyIndex];
  }
  if (event.key === 'ArrowDown' && commands.length) {
    event.preventDefault();
    historyIndex = Math.min(commands.length, historyIndex + 1);
    input.value = historyIndex === commands.length ? '' : commands[historyIndex];
  }
});
terminalView.addEventListener('click', () => input.focus());
document.getElementById('return-terminal').addEventListener('click', closeAnalysis);
document.getElementById('reset-demo').addEventListener('click', () => {
  changeVersion('vulnerable');
});
document.addEventListener('keydown', event => {
  if (event.key === 'F2' && analysisView.hidden && lastResult) {
    event.preventDefault();
    showAnalysis();
  }
  if (event.key === 'Escape' && !analysisView.hidden) {
    event.preventDefault();
    closeAnalysis();
  }
});
startup();
fetch('/api/health').then(res => res.json()).then(data => {
  if (!data.ready) write('finger: C lab is not compiled');
}).catch(() => write('finger: local demo server unavailable'));
input.focus();
