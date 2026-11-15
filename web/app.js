const terminalView = document.getElementById('terminal-view');
const analysisView = document.getElementById('analysis-view');
const output = document.getElementById('terminal-output');
const glass = document.getElementById('glass');
const form = document.getElementById('command-form');
const input = document.getElementById('command-input');
const memoryGrid = document.getElementById('memory-grid');

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
function showAnalysis() {
  if (!lastResult) return;
  memoryGrid.replaceChildren();
  const {memory,status,mode:requestMode} = lastResult;
  for (let i = 0; i < memory.length; i++) {
    const value = parseInt(memory[i], 16);
    const cell = document.createElement('div');
    const role = i >= 16;
    const changed = role && requestMode === 'vulnerable' && status !== 'INPUT REJECTED' && i <= lastName.length;
    cell.className = 'memory-byte' + (role ? ' role' : '') + (changed ? ' overwritten' : '');
    const h = document.createElement('span');
    h.textContent = memory[i];
    const c = document.createElement('span');
    c.textContent = value === 0 ? '␀' : value >= 32 && value <= 126 ? String.fromCharCode(value) : '·';
    cell.append(h,c);
    cell.title = 'Offset ' + i;
    memoryGrid.append(cell);
  }
  document.getElementById('memory-label').textContent = '24 BYTES · ' + requestMode.toUpperCase();
  document.getElementById('memory-explanation').textContent =
    status === 'INPUT REJECTED' ? 'The patched program rejected this long input before copying.'
      : lastName.length >= 16 ? 'The input crossed the 16-byte name field. The highlighted bytes are adjacent role data in our controlled C model.'
      : 'The input fitted inside the name buffer; the adjacent data remained intact.';
  terminalView.hidden = true;
  analysisView.hidden = false;
  window.scrollTo(0,0);
}
function closeAnalysis() {
  analysisView.hidden = true;
  terminalView.hidden = false;
  input.focus();
}
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
document.getElementById('apply-patch').addEventListener('click', () => {
  mode = 'patched';
  closeAnalysis();
});
document.getElementById('reset-demo').addEventListener('click', () => {
  mode = 'vulnerable';
  closeAnalysis();
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
