# Morris Worm: Stack Buffer Overflow Lab

A local interactive demonstration of stack buffer overflows and memory safety in C, using the **1988 Morris Worm** as historical context. Created for COMP 211 Checkoff 3.

## Run the interactive lab

Requirements: **Node.js 18 or newer**, a C compiler (`cc`), and `make`.

```sh
git clone https://github.com/oRichard05/morris-worm-buffer-overflow-lab.git
cd morris-worm-buffer-overflow-lab
npm run build:lab
npm start
```

Open **http://127.0.0.1:4173** in your browser. The website and C programs run entirely on your computer. No `npm install`, external libraries, or internet connection is needed after cloning.

### Demo sequence

1. In **Vulnerable** mode, run the normal input (`alice`). The role stays `GUEST` and the vault stays locked.
2. Use **Crafted Input** (`AAAAAAAAAAAAAAAAADMIN`) and run it. The unchecked copy extends beyond the 16-byte name buffer into the adjacent role field, causing the demo to display `ADMIN` and unlock its fictional vault.
3. Open **Memory Inspector** to see the actual 24-byte snapshot printed by the C program: 16 bytes for the name and 8 bytes for the role.
4. Open **The 1988 Incident** for historical context.
5. Select **Patched** mode and rerun the same input. The length check rejects the input, preserving `GUEST` and a locked vault.

The interface accepts up to 21 ASCII characters and the server binds only to `127.0.0.1`. It runs the two C programs as local subprocesses, without invoking a shell.

## Run the C programs directly

```sh
npm run build:lab
./lab/vulnerable alice
./lab/vulnerable AAAAAAAAAAAAAAAAADMIN
./lab/patched AAAAAAAAAAAAAAAAADMIN
npm test
```

`npm test` checks the expected outputs of all three scenarios. To remove the compiled programs, use `make -C lab clean`.

## Project structure

```text
lab/
  vulnerable.c    Unchecked copy into a local stack object
  patched.c       Bounds check before copying
  Makefile        Compiles both programs
  check.sh        Checks the expected outcomes
web/
  server.mjs      Local HTTP server and C process runner
  index.html      Interactive terminal, status panel, and case study
  app.js          Experiment controls and memory visualization
  styles.css      Interface styles
package.json      Local commands
```

## Historical context and limitations

The **Morris Worm** spread across parts of the early Internet in November 1988, using multiple weaknesses, including a stack buffer overflow in the UNIX `fingerd` service. The historical vulnerability could redirect execution; it did **not** grant access by overwriting a `GUEST` role field.

This project deliberately uses a simplified fictional session object to make adjacent-data corruption easy to observe. The memory inspector displays actual bytes from the demonstration program, but this is **not** the original `fingerd` source, the original worm, or a complete recreation of the historical exploit. Out-of-bounds writes are undefined behavior in C; this demo has been checked in a controlled build, and results are not guaranteed across every compiler and platform.

Only use the illustrated inputs in a controlled local environment. This repository does not include self-propagating code or a publicly accessible vulnerable service.

## References

- [RFC 1135 — The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [Eugene Spafford — The Internet Worm Program: An Analysis](https://docs.lib.purdue.edu/cstech/702/)
- [FBI — Morris Worm](https://www.fbi.gov/history/cases-and-criminals/morris-worm)
- [MITRE CWE-121 — Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)

## Presentation

The interactive demonstration supports a 5–7 minute presentation. The accompanying slides are created separately by the student, as required by the assignment.
