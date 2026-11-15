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

The interface is modeled on an early-1980s **DEC VT100-style monochrome terminal** with an imagined 4.3BSD UNIX session dated November 2, 1988. The original VT100 used a white-phosphor 80-column, 24-line display. Amber and green are optional presentation themes, not claims about the stock VT100. Terminal responses borrow the structure of period `finger` documentation, but the account records shown here are fictional.

### Demo sequence

1. In **Vulnerable** mode, run the normal input (`alice`). The role stays `GUEST` and the vault stays locked.
2. Use **Crafted Input** (`AAAAAAAAAAAAAAAAADMIN`) and run it. The demo copies into the full session byte representation without checking the 16-byte name field's boundary. The input overwrites the adjacent role bytes, causing the demo to display `ADMIN` and unlock its fictional vault.
3. Open **Memory Inspector** to see the actual 24-byte snapshot printed by the C program: 16 bytes for the name and 8 bytes for the role. Click **RESET**, then **NEXT BYTE** or **PLAY** to reconstruct the writes step by step from the input and actual final C snapshot. This replay is not a live debugger trace.
4. Open **The 1988 Incident** for historical context.
5. Select **Patched** mode and rerun the same input. The length check rejects the input, preserving `GUEST` and a locked demo resource.

For presenting, **FOCUS TERMINAL** enlarges the reconstructed display. Press **Escape** to return. The historical-looking terminal is separate from the modern explanatory panels and educational access flag.

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
  vulnerable.c    Controlled byte-level name-buffer overrun demonstration
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

The **Morris Worm** spread across parts of the early Internet in November 1988, using multiple weaknesses, including a stack buffer overflow in the UNIX `fingerd` service. The historical vulnerable program used `gets()` with a 512-byte local buffer. The historical vulnerability could redirect execution; it did **not** grant access by overwriting a `GUEST` role field.

This project deliberately uses a simplified fictional session object to make adjacent-data corruption easy to observe. The memory inspector displays actual bytes from the demonstration program, but this is **not** the original `fingerd` source, the original worm, or a complete recreation of the historical exploit.\n\n**Controlled demonstration:** Modern C libraries or compilers can stop a real out-of-bounds `strcpy` before its effects are visible. For repeatable classroom behavior, the demonstration writes through the `unsigned char` representation of the entire 24-byte session object, with a 21-character input limit. It crosses the logical 16-byte name boundary and visibly changes the neighboring role, but never writes outside the enclosing session object. This is a byte-level model of the corruption caused by a stack buffer overflow, **not** a claim to reproduce the undefined behavior of the historical bug.

Only use the illustrated inputs in a controlled local environment. This repository does not include self-propagating code or a publicly accessible vulnerable service.

## References

- [RFC 1135 — The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [Eugene Spafford — The Internet Worm Program: An Analysis](https://docs.lib.purdue.edu/cstech/702/)
- [FBI — Morris Worm](https://www.fbi.gov/history/cases-and-criminals/morris-worm)
- [MITRE CWE-121 — Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)
- [Columbia University — The DEC VT100 Terminal](https://www.cc.columbia.edu/cu/computinghistory/vt100.html)
- [IBM AOS/4.3 System Administration Guide (September 1988), example `finger` output](https://bitsavers.org/pdf/ibm/pc/rt/aos/AOS_4.3_System_Administration_Guide_Sep88.pdf)

## Presentation

The interactive demonstration supports a 5–7 minute presentation. The accompanying slides are created separately by the student, as required by the assignment.
