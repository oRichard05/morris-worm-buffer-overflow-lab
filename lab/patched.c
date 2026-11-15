#include <stddef.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    char name[16];
    char next_step[8];
} Frame;

_Static_assert(offsetof(Frame, next_step) == 16, "Unexpected field offset");
_Static_assert(sizeof(Frame) == 24, "Unexpected frame size");

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <name>\n", argv[0]);
        return 1;
    }

    Frame frame = {{0}, "RETURN"};
    size_t length = strlen(argv[1]);
    if (length > 22) {
        fputs("Demo input must be 22 characters or fewer.\n", stderr);
        return 1;
    }

    if (length >= sizeof(frame.name)) {
        puts("STATUS: INPUT REJECTED");
    } else {
        memcpy(frame.name, argv[1], length + 1);
        puts("STATUS: ACCEPTED");
    }

    printf("NAME: %.16s\n", frame.name);
    printf("NEXT: %.8s\n", frame.next_step);
    puts("FLOW: NORMAL");
    printf("MEMORY:");
    const unsigned char *bytes = (const unsigned char *)&frame;
    for (size_t i = 0; i < sizeof(frame); ++i) {
        printf(" %02X", bytes[i]);
    }
    putchar('\n');
    return 0;
}
