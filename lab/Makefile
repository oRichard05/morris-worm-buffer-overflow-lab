CC = cc
CFLAGS = -std=c11 -O0 -Wall -Wextra -Wpedantic

all: vulnerable patched

vulnerable: vulnerable.c
	$(CC) $(CFLAGS) $< -o $@

patched: patched.c
	$(CC) $(CFLAGS) $< -o $@

clean:
	rm -f vulnerable patched

.PHONY: all clean
