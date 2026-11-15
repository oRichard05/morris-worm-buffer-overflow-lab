#include <stddef.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    char name[16];
    char role[8];
} Session;

_Static_assert(offsetof(Session, role) == 16, "Unexpected role offset");
_Static_assert(sizeof(Session) == 24, "Unexpected session size");

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <name>\n", argv[0]);
        return 1;
    }

    size_t length = strlen(argv[1]);
    if (length > 21) {
        fputs("Demo input must be 21 characters or fewer.\n", stderr);
        return 1;
    }

    Session session = {{0}, "GUEST"};
    unsigned char *bytes = (unsigned char *)&session;
    for (size_t i = 0; i <= length; i++) {
        bytes[i] = (unsigned char)argv[1][i];
    }

    printf("NAME: %.16s\n", session.name);
    printf("ROLE: %.8s\n", session.role);
    printf("VAULT: %s\n", strcmp(session.role, "ADMIN") == 0 ? "UNLOCKED" : "LOCKED");
    printf("MEMORY:");
    for (size_t i = 0; i < sizeof(session); i++) {
        printf(" %02X", bytes[i]);
    }
    putchar('\n');
    return 0;
}
