# Morris Worm: Stack Buffer Overflow Lab

An interactive, local C memory-safety demonstration inspired by the 1988 Morris Worm. Prepared for COMP 211 Checkoff 3.

## Run

Requires Node.js 18+, a C compiler (`cc`), and `make`.

```sh
git clone https://github.com/oRichard05/morris-worm-buffer-overflow-lab.git
cd morris-worm-buffer-overflow-lab
npm run build:lab
npm start
```

Open http://127.0.0.1:4173. No package installation or internet connection is required after cloning.

The opening screen is a minimal, 4.3BSD-style UNIX terminal reconstruction. Enter commands directly at the prompt. For a presentation, open the page in a browser with the window maximized.

## Demonstration

Type these commands one at a time:

```text
finger alice
finger AAAAAAAAAAAAAAAAADMIN
status
inspect
```

`finger alice` returns a sample user record. The long input crosses the 16-byte name field in the controlled C demo and changes an adjacent role field to `ADMIN`. `status` displays the most recent C result. `inspect` opens a separate explanatory view showing the actual bytes returned by the C program, the fix, and historical context.

Return to the terminal, then test the corrected version:

```text
patch
finger AAAAAAAAAAAAAAAAADMIN
status
```

The patched version rejects the same input. Type `help` for the full command list, or `reset` to restore the vulnerable demo.

The terminal interface is a reconstruction, not a full UNIX shell or an original 1988 installation. Commands such as `patch` and `inspect` control this lab, not a historical operating system.

## Run the C experiments directly

```sh
npm run build:lab
./lab/vulnerable alice
./lab/vulnerable AAAAAAAAAAAAAAAAADMIN
./lab/patched AAAAAAAAAAAAAAAAADMIN
npm test
```

The programs print the session's 24 bytes in hexadecimal. The first 16 bytes hold the name; the final 8 bytes hold the role.

## Structure

```text
lab/
  vulnerable.c     Controlled name-field overrun in a stack object
  patched.c        Name length check before copying
  Makefile         Builds the C programs
  check.sh         Tests expected behaviors
web/
  server.mjs       Localhost HTTP server and C process runner
  index.html       Terminal and separately opened investigation
  app.js           Command handling and memory display
  styles.css       Minimal terminal appearance
```

## Historical context and limitations

In November 1988, the Morris Worm spread through multiple mechanisms, including a stack buffer overflow in the UNIX `fingerd` service. The historical flaw involved unchecked input to a local buffer and could redirect execution. It **did not** grant access by changing a `GUEST` role field.

The C lab deliberately uses a simpler controlled model: it writes through the byte representation of an entire 24-byte local session object. The input crosses the name field's logical boundary, modifying an adjacent role, but remains inside the enclosing object. This avoids relying on undefined out-of-object writes for a live classroom demonstration. It does not reproduce the original worm or its exploit.

All activity runs locally, with the server bound to `127.0.0.1`. No self-propagating code or publicly accessible vulnerable service is included.

## References

- [RFC 1135 — The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [The Internet Worm Program: An Analysis — Eugene Spafford](https://docs.lib.purdue.edu/cstech/702/)
- [FBI — Morris Worm](https://www.fbi.gov/history/cases-and-criminals/morris-worm)
- [MITRE CWE-121 — Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)

The required presentation slides are authored separately by the student.
