# Morris Worm · Buffer Overflow Lab

A local, classroom-safe reconstruction of a memory-boundary failure inspired by the `fingerd` vulnerability exploited by the Morris Worm in 1988.

## Run

Requires Node.js 18+, `make`, and a C compiler.

```sh
npm start
```

Open **http://127.0.0.1:4173**. The command automatically rebuilds both C examples. To check the C programs, run `npm test`.

## Presentation

The left half is a simple black-and-white, 4.3BSD-inspired terminal. The right half is **only memory**, without a scripted tutorial or explanatory page.

The memory display now has two interactive scales: a **continuous 24-byte address ribbon** showing where the program writes, and an **eight-byte magnifier**. The white vertical line marks the end of the 16-byte name buffer. The eight bytes to the right are adjacent memory initialized to `Z` (`0x5A`).

Click any position on the ribbon to examine its eight-byte group. Click a large character in the magnifier to inspect the exact address and hex value. During execution, the magnifier follows the write pointer; you can use **REPLAY** or drag the timeline to replay or scrub the writes.

Suggested commands for a presenter to type in the terminal:

```text
finger alice@research-vax
finger AAAAAAAAAAAAAAAABBBBBB@research-vax
```

The first uses a short name, so adjacent memory remains unchanged. The second uses 16 `A` characters followed by 6 `B` characters, which overwrites 7 bytes of adjacent memory, including the terminating zero byte. The overflow turns those affected bytes orange. Select **PATCHED** and repeat the second command: the input is rejected and adjacent memory stays intact.

## Technical scope

The local C model uses one 24-byte stack object with a 16-byte name array and an eight-byte neighboring array. The vulnerable example copies at most 23 bytes, so it crosses the *logical field boundary* without escaping the enclosing object. The patched version checks the length before copying. Actual final bytes come from the compiled C program; the browser reconstructs the individual writes and verifies that its reconstructed result matches the C output before replaying them.

The real 4.3BSD `fingerd` used an unchecked input operation with a 512-byte stack buffer. In 1988, that flaw was exploited by the Morris Worm to redirect control flow on vulnerable VAX systems. Our safe illustration shows **adjacent-data corruption only**—not a historical binary, return-address overwrite, or executable worm. The server binds to `127.0.0.1` and does not expose a vulnerable network service.

## References

- [4.3BSD fingerd source](https://retro11.de/ouxr/43bsd/usr/src/etc/fingerd.c.html)
- [RFC 1135: The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [MITRE CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)
