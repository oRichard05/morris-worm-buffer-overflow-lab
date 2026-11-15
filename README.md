# Morris Worm: Stack Buffer Overflow Lab

An interactive learning project for **COMP 211 Checkoff 3** about stack buffer overflows and memory safety in C.

## Concept

**Can You Hack a 1988 Computer?**

This project explores how a memory error can change a program's behavior, using the 1988 Morris Worm as historical context. The presentation is designed as a guided demonstration: use the program, trigger the flaw, inspect memory, and test a fix.

## Run the C lab

Requirements: a C compiler (`cc`) and `make`.

```sh
cd lab
make
./vulnerable alice
./vulnerable AAAAAAAAAAAAAAAAADMIN
./patched AAAAAAAAAAAAAAAAADMIN
```

The first command uses a normal name: the role stays `GUEST` and the vault remains locked. In the vulnerable program, a longer input can overwrite the adjacent `role` field, changing it to `ADMIN`. The patched program checks the input length and rejects that same input.

Each program also prints the underlying 24 bytes of the local `Session` structure in hexadecimal. The first 16 bytes represent the name buffer; the final 8 bytes represent the role.

**Important:** This is a deliberately simplified, local demonstration of a stack buffer overflow. It uses an unchecked `strcpy` to make adjacent-data corruption visible. The original `fingerd` vulnerability involved unsafe input handling and could lead to control-flow hijacking; it did **not** work by changing a `GUEST` field to `ADMIN`. The programs here are not copies of the original `fingerd` or Morris Worm.

To remove the compiled programs:

```sh
make clean
```

## Presentation plan

1. Introduce a fictional UNIX-style user information service.
2. Demonstrate normal and unexpected program behavior.
3. Examine the stack memory representation.
4. Explain the historical `fingerd` vulnerability and the 1988 Morris Worm.
5. Test a corrected implementation and discuss memory safety.

The interactive browser interface and student-authored presentation slides are planned additions.

## References

- [RFC 1135: The Helminthiasis of the Internet](https://datatracker.ietf.org/doc/html/rfc1135)
- [MITRE CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)
- [FBI: Morris Worm](https://www.fbi.gov/history/cases-and-criminals/morris-worm)
- [Eugene Spafford, *The Internet Worm Program: An Analysis*](https://docs.lib.purdue.edu/cstech/702/)

## Scope

The C examples are for controlled, local educational use. No self-propagating code or public vulnerable service is included. Any future visualization of the memory layout will be identified as illustrative unless derived directly from the demonstration's output.
