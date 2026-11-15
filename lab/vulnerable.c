#include <stddef.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    char name[16];
    unsigned char adjacent[8];
} Frame;

_Static_assert(offsetof(Frame, adjacent) == 16, "Unexpected field offset");
_Static_assert(sizeof(Frame) == 24, "Unexpected frame size");

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <name>\n", argv[0]);
        return 1;
    }

    size_t length = strlen(argv[1]);
    if (length > 22) {
        fputs("Demo input must be 22 characters or fewer.\n", stderr);
        return 1;
    }

    Frame frame = {{0}, {'Z','Z','Z','Z','Z','Z','Z','Z'}};
    unsigned char *bytes = (unsigned char *)&frame;
    for (size_t i = 0; i <= length; ++i) {
        bytes[i] = (unsigned char)argv[1][i];
    }

    puts("STATUS: ACCEPTED");
    printf("CORRUPTED: %s\n", memcmp(frame.adjacent, "ZZZZZZZZ", 8) ? "YES" : "NO");
    printf("MEMORY:");
    for (size_t i = 0; i < sizeof(frame); ++i) {
        printf(" %02X", bytes[i]);
    }
    putchar('\n');
    return 0;
}
