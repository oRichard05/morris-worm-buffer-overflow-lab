# Morris Worm: 4.3BSD Finger Lab

An educational reconstruction of the UNIX `finger`/`fingerd` user-information interface from the era of the 1988 Morris Worm, for COMP 211 Checkoff 3.

## Run locally

Requirements: Node.js 18+, a C compiler (`cc`), and `make`.

```sh
git clone https://github.com/oRichard05/morris-worm-buffer-overflow-lab.git
cd morris-worm-buffer-overflow-lab
npm run build:lab
npm test
npm start
```

Open http://127.0.0.1:4173. The local server does not accept public network connections and uses no third-party Node packages.

## Terminal

The high-contrast, black-and-white screen represents a **4.3BSD UNIX shell session**. `fingerd` itself was a network daemon, not a separate menu program. On a real UNIX system, users interacted with it using the command `finger user@host`.

Try these commands:

```text
finger
finger alice
finger -s alice
finger alice@research-vax
finger AAAAAAAAAAAAAAAAADMIN@research-vax
```

The first three display period-style user information. The fourth represents a normal remote request to a finger daemon. The final command uses the controlled C demonstration: if the vulnerable model changes its adjacent role field, the **mock remote connection closes unexpectedly**. That output is an educational stand-in for corrupted state, *not* a claim to reproduce the real worm's execution.

After the long remote query, click **See what happened (F2)** or press **F2** (on some Mac keyboards, **Fn + F2**). A separate four-step lesson explains the memory layout, why the name does not fit, how the neighboring bytes changed, and the connection to the original 1988 vulnerability. Each box represents one byte; hover for its hexadecimal value. At step three, the write replay runs automatically and can be restarted with **Replay the write**. It is reconstructed and checked against the final C memory output, not recorded from a live debugger.

At step four, choose **Try the fix**. The terminal returns with the same remote query already typed; press **Enter** to run it against the corrected C program. The long request should now be rejected. You can open the investigation again to see that the neighboring role stays unchanged. From the final step of that corrected walkthrough, **Reset experiment** restores the vulnerable model for another demonstration.

Other supported shell-like commands include `who`, `whoami`, `date`, `hostname`, `uname`, `pwd`, `ls`, `cat /etc/motd`, `man finger`, `clear`, and `logout`. This is not a full UNIX shell.

## Source accuracy and limitations

This recreation was built against the 4.3BSD [finger command source](https://retro11.de/ouxr/43bsd/usr/src/ucb/finger.c.html) (revision dated March 13, 1986), [fingerd server source](https://retro11.de/ouxr/43bsd/usr/src/etc/fingerd.c.html) (revision dated June 6, 1985), and the [1986 finger manual](https://retro11.de/ouxr/43bsd/usr/man/cat1/finger.0.html).

The authentic command supported short and long user listings, and remote queries of the form `user@host`. The server accepted a line over the network and passed it to the command. Its historical stack buffer flaw was the unbounded read `gets(line)` into a 512-byte array, which the worm exploited to redirect execution on vulnerable VAX systems.

This project **does not run the historical binaries or emulate a VAX**. It uses a small set of fictional users, a reconstructed command interface, and a simplified local C experiment. In the experiment, a 16-byte name field sits beside an 8-byte role field within one 24-byte stack object. The controlled demonstration writes across the name field boundary but stays within the enclosing object. Its `ADMIN` field exists *only inside the model* and **did not exist in the historical `fingerd` attack**. The simulated connection closure is not a recreation of code execution. The historical terminal portion intentionally contains no explanatory overlays; the separate investigation is modern teaching material.

The newer corrected C example rejects a name that would exceed its buffer, including the required NUL terminator. The original historical vulnerability was addressed by fixing or disabling vulnerable services; the presentation should not treat this educational patch as an exact reproduction of a particular 1988 vendor patch.

## C experiment

```sh
./lab/vulnerable alice
./lab/vulnerable AAAAAAAAAAAAAAAAADMIN
./lab/patched AAAAAAAAAAAAAAAAADMIN
npm test
```

The `lab` directory contains the two C programs, their Makefile, and the test script. The `web` directory contains the local HTTP server, terminal interface, styles, and separate investigation view.

## Historical references

- [4.3BSD finger.c, 1986](https://retro11.de/ouxr/43bsd/usr/src/ucb/finger.c.html)
- [4.3BSD fingerd.c, 1985](https://retro11.de/ouxr/43bsd/usr/src/etc/fingerd.c.html)
- [4.3BSD finger(1) manual, 1986](https://retro11.de/ouxr/43bsd/usr/man/cat1/finger.0.html)
- [RFC 1135: The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [MITRE CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)

Presentation slides are prepared separately by the student, in accordance with the assignment.
