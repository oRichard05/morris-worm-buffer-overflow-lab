# Morris Worm: Stack Buffer Overflow Lab

An interactive learning project for **COMP 211 Checkoff 3**, focused on **stack buffer overflows and memory safety in C**.

## Concept

**Can You Hack a 1988 Computer?**

The planned presentation is a guided, approximately six-minute demonstration inspired by the `fingerd` vulnerability exploited by the 1988 Morris Worm:

1. Explore a fictional, historical-style UNIX user information service.
2. Observe how an unexpectedly long input can cause a memory-safety failure in a small, deliberately vulnerable **local C demonstration**.
3. Investigate the underlying stack buffer overflow using a clearly labeled educational memory visualization.
4. Compare vulnerable behavior with a corrected, length-checked implementation.
5. Explain the historical incident, the actual repairs, and the broader lesson for memory-safe programming.

**Historical accuracy:** This project is a teaching reconstruction, **not** the original `fingerd` program, the Morris Worm, or an exact reproduction of the 1988 exploit. The Morris Worm used several methods to spread; this project focuses only on its stack-buffer-overflow connection.

## Planned components

- **C lab:** a small, intentionally vulnerable demonstration and a patched version, runnable locally in a controlled environment.
- **Interactive interface:** a retro terminal view and a guided memory inspector.
- **Presentation materials:** student-authored slides for a 5–7 minute talk and Q&A.
- **Documentation:** instructions to reproduce the educational experiments, references, and findings.

## Status

Project planning / initial setup. Implementation and experiment results will be documented as they are completed and verified.

## References

- [RFC 1135: The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [MITRE CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)
- [FBI: Morris Worm](https://www.fbi.gov/history/cases-and-criminals/morris-worm)
- [Eugene Spafford, *The Internet Worm Program: An Analysis*](https://docs.lib.purdue.edu/cstech/702/)

## Safety and scope

All vulnerability experiments are intended for local, controlled educational use. No original worm, self-propagation, external targets, or intentionally vulnerable public service will be deployed. Any visualized memory layout will be identified as illustrative unless directly measured from the demo.
