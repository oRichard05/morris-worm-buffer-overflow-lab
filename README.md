# Morris Worm · Buffer Overflow Lab

A local, classroom-safe reconstruction of the UNIX `finger`/`fingerd` experience that led to one of the most famous vulnerabilities exploited by the Morris Worm in 1988.

## Quick start

Requires Node.js 18+, a C compiler (`cc`) and `make`.

```sh
git clone https://github.com/oRichard05/morris-worm-buffer-overflow-lab.git
cd morris-worm-buffer-overflow-lab
npm run build:lab
npm test
npm start
```

Running `npm start` also rebuilds the C models automatically when their sources change.

Open **http://127.0.0.1:4173**. The server binds only to the local loopback address. The demonstration contains no worm, exploit payload, or publicly accessible vulnerable network daemon.

## Live classroom sequence

The left side is a plain black-and-white **4.3BSD-inspired UNIX terminal** with a csh-style `research-vax% ` prompt and blinking block cursor. The right side is a **modern presentation-oriented memory animation**, not part of historical UNIX. It displays 24 large character spaces: a 16-byte NAME area in two rows, a clearly marked boundary, and an adjacent 8-byte NEXT STEP area. Each cell represents one byte; select a cell to inspect its hexadecimal value. The values are taken from the reconstructed byte writes checked against the C program’s final output.

1. Click **Run example** for `finger alice@research-vax`. The C model writes a short name inside its allotted 16-byte buffer. The symbolic next step stays `RETURN`.
2. Click **Run example** for `finger AAAAAAAAAAAAAAAADIVERT@research-vax` (16 As + `DIVERT`). The simulator accepts 22 characters, then the **verified reconstructed byte replay** shows 23 writes, including the terminating zero byte. At offset 0x10 the copied data crosses into the adjacent field, turning the symbolic next step into `DIVERT`.
3. The large memory display turns the neighboring cells amber as input crosses the limit and prominently compares **RETURN → DIVERT**. Use **Replay** to watch again or drag the timeline to inspect a particular write. Select any character cell for its offset and hexadecimal value; these details are intentionally hidden until requested so the classroom demonstration stays legible.
4. Choose **Understand the failure** for a four-step explanation of the difference between this small model and the real Morris Worm incident. At the end choose **Try the corrected version**.
5. Repeat the same long query (it is prefilled in the terminal or available as a guided example). The corrected C program rejects the input before copying and leaves `RETURN` intact. Use **Reset model** at the end of the explanation to begin again.

Other supported shell-like commands include `finger`, `finger alice`, `who`, `whoami`, `date`, `hostname`, `uname`, `pwd`, `ls`, `cat /etc/motd`, `man finger`, `clear`, and `logout`. This is not a full UNIX shell.

## What the C program actually demonstrates

The C programs use a 24-byte stack object with a 16-byte `name` field followed by an 8-byte `next_step` field. Its initial value is `RETURN`; the crafted input changes it to `DIVERT`. The vulnerable model writes bytes across the **logical field boundary**, but stays **inside the enclosing 24-byte object**, keeping the classroom experiment deterministic. The printed `FLOW: DIVERTED` is a **symbolic model outcome**, not actual instruction-pointer hijacking, shell execution, or arbitrary-code execution.

The browser visualizes each write **after the local C program finishes** by rebuilding the expected writes and comparing their final bytes with the C output. The per-cell address details are offsets within the 24-byte object, not actual machine virtual addresses. If they do not match, it does not claim to have a verified replay. The animation is not a live memory debugger trace.

The patched version checks the name length before copying, including space for the null terminator. It rejects a request that cannot fit.

You can run the binaries directly:

```sh
./lab/vulnerable alice
./lab/vulnerable AAAAAAAAAAAAAAAADIVERT
./lab/patched AAAAAAAAAAAAAAAADIVERT
npm test
```

## Historical accuracy

The `fingerd` service in 4.3BSD did not have a graphical interface. Users queried it through `finger user@host`. The real daemon used `gets()` to read into a 512-byte stack buffer without bounds checking. In November 1988, the Morris Worm exploited that vulnerability on susceptible VAX systems; the historical exploit could change the actual program counter, unlike this educational model. The worm also propagated through other mechanisms.

This project **does not execute original 4.3BSD binaries, emulate a VAX, or recreate the worm**. The user records, host name, right-hand visualizer and symbolic next-step field are educational constructions. Changes to vulnerable input handling or disabling the exposed service were among the historical defenses; the safe model's patch is not a claim to duplicate a specific 1988 vendor patch.

## References

- [4.3BSD fingerd source (1985)](https://retro11.de/ouxr/43bsd/usr/src/etc/fingerd.c.html)
- [4.3BSD finger manual (1986)](https://retro11.de/ouxr/43bsd/usr/man/cat1/finger.0.html)
- [RFC 1135: The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [MITRE CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)

The separate course presentation requirements should be checked against the course assignment.
