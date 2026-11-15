# Morris Worm · Buffer Overflow Lab

A local, classroom-safe demonstration of the memory-boundary problem behind the 1988 Morris Worm's exploitation of the UNIX `fingerd` service.

## Run

Requires Node.js 18+, a C compiler, and `make`.

```sh
npm start
```

Open **http://127.0.0.1:4173**. `npm start` rebuilds the local C examples automatically. Run `npm test` to check the C models.

## Presentation

The screen intentionally contains only two views: a reconstructed 4.3BSD-style UNIX terminal on the left, and a large animated **memory visualization** on the right. There is no tutorial, suggested-command widget, or explanation screen; the presenter narrates what happens.

Use the terminal to send a remote `finger` request. These three commands show the difference:

```sh
finger alice@research-vax
finger AAAAAAAAAAAAAAAADIVERT@research-vax
finger AAAAAAAAAAAAAAAADIVERT@research-vax
```

For the third request, select **PATCHED** in the memory display before running the command again. The memory clears when switching between **VULNERABLE** and **PATCHED**.

The memory view depicts a 24-byte C stack object with a 16-byte `name` field and an adjacent 8-byte `next_step` field. One large cell represents one byte. A normal name fits; a longer name crosses the marked boundary and overwrites neighboring bytes. A patched program rejects the long name before copying.

Replay and the playback slider allow the presenter to revisit individual writes. Selecting any byte reveals its offset and hexadecimal value. The animation reconstructs writes **after the C program finishes**, and verifies the reconstructed final values against the program's output. It is not a live debugger trace.

## Historical scope

In 1988, the real 4.3BSD `fingerd` used an unchecked input routine with a 512-byte stack buffer. The Morris Worm exploited that vulnerability on vulnerable VAX systems to redirect real execution.

This project does **not** recreate the original worm, execute code through a return address, emulate a VAX, or expose a network attack surface. The `RETURN` and `DIVERT` labels are symbolic data in the C model, not machine instruction pointers. The vulnerable model crosses the logical boundary between fields while staying within the enclosing 24-byte object. The server binds to `127.0.0.1` only.

## References

- [4.3BSD fingerd source](https://retro11.de/ouxr/43bsd/usr/src/etc/fingerd.c.html)
- [RFC 1135: The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [MITRE CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)
