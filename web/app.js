const programView = document.getElementById('program-view');
const analysisView = document.getElementById('analysis-view');
const display = document.getElementById('program-display');
const form = document.getElementById('entry-form');
const input = document.getElementById('entry-input');
const prompt = document.getElementById('entry-prompt');
const hint = document.getElementById('program-hint');
const memoryGrid = document.getElementById('memory-grid');

let screen = 'menu';
let mode = 'vulnerable';
let sessionRole = 'GUEST';
let lastResult = null;
let lastInput = '';
let busy = false;

function line(text = '', style = '') {
  return { text, style };
}

function render(lines, label = 'Selection:', help = 'ENTER: select') {
  display.replaceChildren();
  for (const item of lines) {
    const entry = typeof item === 'string' ? line(item) : item;
    const row = document.createElement('div');
    row.className = 'screen-line' + (entry.style ? ' ' + entry.style : '');
    row.textContent = entry.text;
    display.append(row);
  }
  prompt.textContent = label;
  hint.textContent = help;
  input.value = '';
  input.disabled = false;
  form.hidden = false;
  input.focus();
}

function menu(notice = '') {
  screen = 'menu';
  render([
    line('RESEARCH COMPUTING CENTER', 'heading'),
    line('USER INFORMATION SERVICE  /  1988', 'subheading'),
    '',
    '--------------------------------------------------------',
    '',
    '     1   User directory',
    '     2   Restricted records',
    '     3   System information',
    '     4   Log out',
    '',
    '--------------------------------------------------------',
    '',
    notice ? line(notice, 'message') : ''
  ]);
}

function directory() {
  screen = 'lookup';
  render([
    line('USER DIRECTORY', 'heading'),
    '--------------------------------------------------------',
    '',
    'Search the local user information database.',
    '',
    'Enter a user name:'
  ], 'Name:', 'ENTER: search   ESC: main menu');
}

function result(lines, title = 'USER DIRECTORY') {
  screen = 'result';
  render([
    line(title, 'heading'),
    '--------------------------------------------------------',
    '',
    ...lines,
    '',
    '',
    line('Press ENTER to continue.', 'dim')
  ], '', 'ENTER: main menu   ESC: main menu' + (lastInput.length >= 16 ? '   F2: investigation' : ''));
  form.classList.add('continue');
}

function restricted() {
  screen = 'result';
  if (sessionRole === 'ADMIN') {
    render([
      line('RESTRICTED RECORDS', 'heading'),
      '--------------------------------------------------------',
      '',
      line('ACCESS GRANTED', 'granted'),
      '',
      'RECORD ID:   RC-018',
      'CLASS:       INTERNAL',
      'SUBJECT:     Research Operations',
      '',
      'This is fictional demonstration data.',
      '',
      line('Press ENTER to continue.', 'dim')
    ], '', 'ENTER: main menu   F2: investigation');
  } else {
    render([
      line('RESTRICTED RECORDS', 'heading'),
      '--------------------------------------------------------',
      '',
      line('ACCESS DENIED', 'denied'),
      '',
      'Administrator authorization required.',
      '',
      '',
      line('Press ENTER to continue.', 'dim')
    ], '', 'ENTER: main menu');
  }
}

function systemInformation() {
  screen = 'result';
  render([
    line('SYSTEM INFORMATION', 'heading'),
    '--------------------------------------------------------',
    '',
    'Machine:     research-vax',
    'Operating:   4.3BSD UNIX',
    'Date:        Wed Nov  2 1988',
    'Terminal:    tty00',
    'Services:    user directory, records archive',
    '',
    '',
    line('Press ENTER to continue.', 'dim')
  ], '', 'ENTER: main menu');
}

function logout() {
  sessionRole = 'GUEST';
  screen = 'logout';
  render([
    line('SESSION CLOSED', 'heading'),
    '--------------------------------------------------------',
    '',
    'Connection to research-vax terminated.',
    '',
    '',
    line('Press ENTER to reconnect.', 'dim')
  ], '', 'ENTER: reconnect');
}

async function lookup(name) {
  if (!/^[A-Za-z0-9_-]{1,21}$/.test(name)) {
    render([
      line('USER DIRECTORY', 'heading'),
      '--------------------------------------------------------',
      '',
      line('Invalid name. Use 1–21 letters, digits, _ or -.', 'denied'),
      '',
      'Enter a user name:'
    ], 'Name:', 'ENTER: search   ESC: main menu');
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
    if (!response.ok) throw new Error(data.error || 'Unable to contact user directory');

    lastResult = data;
    lastInput = name;
    sessionRole = data.role === 'ADMIN' && data.vault === 'UNLOCKED' ? 'ADMIN' : 'GUEST';

    if (data.status === 'INPUT REJECTED') {
      result([
        line('Request rejected.', 'denied'),
        '',
        'User name exceeds the accepted length.',
        'No records were changed.'
      ]);
    } else if (name.length >= 16) {
      result([
        'Request processed.',
        '',
        'No matching directory entry found.'
      ]);
    } else {
      result([
        'Login:      ' + name,
        'Name:       ' + name,
        'Directory:  /usr/' + name,
        'Shell:      /bin/csh',
        '',
        'Last login: Wed Nov  2 09:12:00'
      ]);
    }
  } catch (error) {
    sessionRole = 'GUEST';
    result([line('Service unavailable: ' + error.message, 'denied')]);
  } finally {
    busy = false;
    input.disabled = false;
    input.focus();
  }
}

async function submit(value) {
  if (busy) return;
  const entry = value.trim();
  form.classList.remove('continue');

  if (screen === 'menu') {
    if (entry === '1') directory();
    else if (entry === '2') restricted();
    else if (entry === '3') systemInformation();
    else if (entry === '4') logout();
    else menu('Select a number from 1 to 4.');
  } else if (screen === 'lookup') {
    if (entry) await lookup(entry);
  } else if (screen === 'logout') {
    menu();
  } else {
    menu();
  }
}

function drawMemory() {
  memoryGrid.replaceChildren();
  if (!lastResult) return;
  for (let index = 0; index < lastResult.memory.length; index++) {
    const hex = lastResult.memory[index];
    const value = Number.parseInt(hex, 16);
    const role = index >= 16;
    const written = role && lastResult.mode === 'vulnerable'
      && lastResult.status !== 'INPUT REJECTED' && index <= lastInput.length;

    const byte = document.createElement('div');
    byte.className = 'memory-byte' + (role ? ' role' : '') + (written ? ' overwritten' : '');

    const number = document.createElement('span');
    number.textContent = hex;
    number.className = 'hex';

    const character = document.createElement('span');
    character.textContent = value === 0 ? '␀' : value >= 32 && value <= 126
      ? String.fromCharCode(value) : '·';
    character.className = 'char';

    byte.title = 'Offset ' + index + ' · 0x' + hex;
    byte.append(number, character);
    memoryGrid.append(byte);
  }

  const rejected = lastResult.status === 'INPUT REJECTED';
  document.getElementById('memory-label').textContent =
    '24 BYTES · ' + lastResult.mode.toUpperCase();

  document.getElementById('memory-explanation').textContent = rejected
    ? 'The corrected program rejected the input, leaving the adjacent role unchanged.'
    : lastInput.length >= 16
      ? 'The highlighted bytes belong to the role field, not the name. Our model crossed the name boundary within the same stack object.'
      : 'The input fits inside the name buffer. The role remains unchanged.';
}

function showAnalysis() {
  if (!lastResult) return;
  drawMemory();
  programView.hidden = true;
  analysisView.hidden = false;
  window.scrollTo(0, 0);
}

function backToProgram() {
  analysisView.hidden = true;
  programView.hidden = false;
  input.focus();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  void submit(input.value);
});

input.addEventListener('keydown', event => {
  if (event.key === 'Escape' && screen !== 'menu') {
    event.preventDefault();
    form.classList.remove('continue');
    menu();
  }
  if (event.key === 'F2' && lastResult) {
    event.preventDefault();
    showAnalysis();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'F2' && !busy && lastResult && analysisView.hidden) {
    event.preventDefault();
    showAnalysis();
  }
  if (event.key === 'Escape' && !analysisView.hidden) {
    event.preventDefault();
    backToProgram();
  }
});

programView.addEventListener('click', () => input.focus());
document.getElementById('return-program').addEventListener('click', backToProgram);

document.getElementById('apply-patch').addEventListener('click', () => {
  mode = 'patched';
  sessionRole = 'GUEST';
  backToProgram();
  menu('System maintenance complete.');
});

document.getElementById('reset-demo').addEventListener('click', () => {
  mode = 'vulnerable';
  sessionRole = 'GUEST';
  lastResult = null;
  lastInput = '';
  backToProgram();
  menu();
});

menu();
fetch('/api/health')
  .then(response => response.json())
  .then(data => {
    if (!data.ready) menu('Directory service unavailable. Build C programs first.');
  })
  .catch(() => menu('Directory service unavailable.'));
