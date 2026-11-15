# Morris Worm: Buffer Overflow Lab

An interactive C memory-safety project inspired by the 1988 Morris Worm. Developed for COMP 211 Checkoff 3.

## Start the program

Requirements: Node.js 18+, a C compiler (`cc`), and `make`.

```sh
git clone https://github.com/oRichard05/morris-worm-buffer-overflow-lab.git
cd morris-worm-buffer-overflow-lab
npm run build:lab
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173) in a browser. No third-party packages are needed.

The program opens directly into a fictional 1988-style UNIX user information system. Navigate by typing menu numbers and pressing Enter.

## Demonstration sequence

1. Select **2 — Restricted records**. Access should be denied.
2. Return to the menu. Select **1 — User directory** and enter `alice` to make a normal request.
3. Return to **1 — User directory** and enter `AAAAAAAAAAAAAAAAADMIN` (16 A's followed by `ADMIN`).
4. Return to the menu and select **2 — Restricted records** again. The fictional records are now accessible because the C experiment returned an overwritten `ADMIN` role.
5. Press **I** to open the separate memory investigation. This view displays the actual 24-byte output from the C program, explanations, historical context, and an option to apply the fix.
6. Select **Apply fix and return to computer**. Repeat the same long lookup, then try option **2**. Access should remain denied.

**Escape** returns to the menu or closes the investigation. **Enter** advances between screens. The menu is intentionally minimal so the security demonstration happens before the technical explanation.

## Run the C programs directly

```sh
npm run build:lab
./lab/vulnerable alice
./lab/vulnerable AAAAAAAAAAAAAAAAADMIN
./lab/patched AAAAAAAAAAAAAAAAADMIN
npm test
```

The programs print the 24 bytes of a local `Session` object in hexadecimal. The first 16 bytes store the name and the final 8 bytes store the role.

## Project files

```text
lab/
  vulnerable.c     Controlled memory-boundary demonstration
  patched.c        Corrected input-length check
  Makefile         Builds both programs
  check.sh         Checks expected outcomes
web/
  server.mjs       Local HTTP server and C process runner
  index.html       UNIX-style program and separate investigation
  app.js           Menu navigation and C-backed requests
  styles.css       Monochrome terminal styling
```

## Historical background

The Morris Worm spread across parts of the early Internet in November 1988, using several techniques. One was a stack buffer overflow in the UNIX `fingerd` service. The real vulnerability involved unsafe input handling and could change the program's execution flow.

This lab is **not** a reproduction of the original `fingerd` application, worm, or exploit. The terminal menu, restricted records, and `GUEST`/`ADMIN` role are fictional teaching devices. The local C code demonstrates adjacent-field corruption by writing within the byte representation of a single 24-byte stack object, without exceeding the enclosing object. The browser's session authorization is derived from that C result. This makes the experiment reliable without relying on undefined out-of-object writes.

The server binds only to `127.0.0.1`. It is intended for controlled local use, not public hosting.

## References

- [RFC 1135 — The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [The Internet Worm Program: An Analysis — Eugene Spafford](https://docs.lib.purdue.edu/cstech/702/)
- [FBI — Morris Worm](https://www.fbi.gov/history/cases-and-criminals/morris-worm)
- [MITRE CWE-121 — Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)

The presentation slides are authored separately by the student, in accordance with the assignment.
