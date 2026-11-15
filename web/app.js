const terminalView = document.getElementById('terminal-view');
const output = document.getElementById('terminal-output');
const form = document.getElementById('command-form');
const input = document.getElementById('command-input');
const analysisView = document.getElementById('analysis-view');
const memoryGrid = document.getElementById('memory-grid');

let mode = 'vulnerable';
let lastResult = null;
let lastInput = '';
let running = false;
let commandHistory = [];
let historyIndex = 0;

function print(text = '', className = '') {
  const line = document.createElement('div');
  line.className = 'term-line' + (className ? ' ' + className : '');
  line.textContent = text;
  output.append(line);
  if (output.children.length > 200) output.firstElementChild.remove();
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
}

function printLines(lines, className = '') {
  for (const line of lines) print(line, className);
}

function boot() {
  output.replaceChildren();
  printLines([
    '4.3BSD UNIX (research-vax) (tty00)',
    '',
    'login: guest',
    'Last login: Wed Nov  2 08:42:17 1988',
    ''
  ]);
}

function showTerminal() {
  analysisView.hidden = true;
  terminalView.hidden = false;
  input.focus();
}

function showAnalysis() {
  if (!lastResult) {
    print('inspect: run finger first');
    return;
  }
  terminalView.hidden = true;
  analysisView.hidden = false;
  drawMemory();
  window.scrollTo(0, 0);
}

function drawMemory() {
  memoryGrid.replaceChildren();
  const bytes = lastResult.memory;
  for (let index = 0; index < bytes.length; index++) {
    const hex = bytes[index];
    const value = Number.parseInt(hex, 16);
    const cell = document.createElement('div');
    const role = index >= 16;
    const changed = role && lastResult.mode === 'vulnerable' &&
      lastResult.status !== 'INPUT REJECTED' && index <= lastInput.length;
    cell.className = 'memory-byte' + (role ? ' role' : '') + (changed ? ' overwritten' : '');
    const code = document.createElement('span');
    code.className = 'hex';
    code.textContent = hex;
    const character = document.createElement('span');
    character.className = 'char';
    character.textContent = value === 0 ? '␀' :
      value >= 32 && value <= 126 ? String.fromCharCode(value) : '·';
    cell.title = 'Offset ' + index + ', 0x' + hex;
    cell.append(code, character);
    memoryGrid.append(cell);
  }

  const rejected = lastResult.status === 'INPUT REJECTED';
  document.getElementById('analysis-intro').textContent = rejected
    ? 'The patched C program rejected the long input before copying it.'
    : lastResult.role === 'ADMIN'
      ? 'A long input crossed the 16-byte name field and changed the adjacent role field.'
      : 'This is the 24-byte session object returned by the C program.';
  document.getElementById('memory-summary').textContent =
    'Final bytes returned by C · ' + lastResult.mode.toUpperCase();
  document.getElementById('analysis-note').textContent = rejected
    ? 'The role still contains GUEST. The same input no longer changes the session.'
    : lastResult.mode === 'vulnerable' && lastInput.length >= 16
      ? 'Bytes at offsets 16 and beyond belong to the role, not the name. The highlighted bytes were overwritten by the request.'
      : 'The name fits within its allocated field and the role is unchanged.';
}

async function runFinger(name) {
  if (!/^[A-Za-z0-9_-]{1,21}$/.test(name)) {
    print('finger: enter 1–21 letters, digits, _ or -');
    return;
  }
  running = true;
  input.disabled = true;
  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, name })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'request failed');

    lastResult = result;
    lastInput = name;
    if (result.status === 'INPUT REJECTED') {
      print('finger: input rejected (exceeds name buffer)');
      print('Lab role: ' + result.role + '   Resource: ' + result.vault);
    } else if (result.vault === 'UNLOCKED') {
      print('finger: unexpected internal state');
      print('Lab role: ' + result.role + '   Resource: ' + result.vault, 'warning');
      print('Memory boundary crossed. Type inspect to investigate.', 'dim');
    } else if (name.length >= 16) {
      print('finger: invalid user information');
      print('Lab role: ' + (result.role || '(corrupted)') + '   Resource: ' + result.vault, 'warning');
      print('Type inspect to investigate.', 'dim');
    } else {
      print('Login: ' + name.padEnd(19) + ' Name: ' + name);
      print('Directory: /usr/' + name.padEnd(15) + ' Shell: /bin/csh');
      print('Last login Wed Nov  2 09:12:00 on tty01');
      print('No Plan.');
    }
  } catch (error) {
    print('finger: ' + error.message, 'warning');
  } finally {
    running = false;
    input.disabled = false;
    input.focus();
  }
}

async function runCommand(raw) {
  const command = raw.trim();
  if (!command) return;
  const [operation, ...args] = command.split(/\s+/);

  switch (operation.toLowerCase()) {
    case 'finger':
      if (args.length !== 1) {
        print('usage: finger <username>');
        return;
      }
      await runFinger(args[0]);
      break;
    case 'whoami':
      print('guest');
      break;
    case 'date':
      print('Wed Nov  2 09:12:00 EST 1988');
      break;
    case 'help':
      printLines([
        'Available commands:',
        '  finger <username>   Look up a user',
        '  whoami              Show current user',
        '  date                Show system date',
        '  status              Show lab session state',
        '  inspect             Open memory investigation',
        '  patch               Enable bounds checking',
        '  reset               Restore vulnerable demo',
        '  clear               Clear terminal',
        '  about               Explain this reconstruction'
      ]);
      break;
    case 'status':
      print('Local C model: ' + mode);
      if (lastResult) {
        print('Last request role: ' + (lastResult.role || '(empty)'));
        print('Last request resource: ' + lastResult.vault);
      } else print('No request has been processed.');
      break;
    case 'inspect':
      showAnalysis();
      break;
    case 'patch':
      mode = 'patched';
      print('Local demonstration updated: bounds checking enabled.');
      print('Repeat the same finger request to test the fix.');
      break;
    case 'reset':
      mode = 'vulnerable';
      lastResult = null;
      lastInput = '';
      print('Local demonstration reset to the vulnerable version.');
      break;
    case 'clear':
      output.replaceChildren();
      break;
    case 'about':
      print('Historical-style UNIX interface, not an original 1988 installation.');
      print('The local C lab is a controlled memory-corruption model.');
      print('It does not reproduce the Morris Worm or its control-flow exploit.');
      break;
    default:
      print(operation + ': Command not found.');
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (running) return;
  const command = input.value;
  input.value = '';
  print('research-vax% ' + command);
  if (command.trim()) {
    commandHistory.push(command);
    if (commandHistory.length > 50) commandHistory.shift();
    historyIndex = commandHistory.length;
  }
  await runCommand(command);
});

input.addEventListener('keydown', event => {
  if (event.key === 'ArrowUp' && commandHistory.length) {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    input.value = commandHistory[historyIndex];
  }
  if (event.key === 'ArrowDown' && commandHistory.length) {
    event.preventDefault();
    historyIndex = Math.min(commandHistory.length, historyIndex + 1);
    input.value = historyIndex === commandHistory.length ? '' : commandHistory[historyIndex];
  }
});

terminalView.addEventListener('click', () => input.focus());
document.getElementById('return-terminal').addEventListener('click', showTerminal);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !analysisView.hidden) showTerminal();
});

boot();
fetch('/api/health').then(response => response.json()).then(result => {
  if (!result.ready) print('finger: C programs not compiled (run npm run build:lab)', 'warning');
}).catch(() => print('finger: local service unavailable', 'warning'));
input.focus();
