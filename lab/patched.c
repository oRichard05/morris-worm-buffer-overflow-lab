#include <stdio.h>
#include <string.h>

typedef struct {
    char name[16];
    char role[8];
} Session;

int main(int argc, char **argv) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <name>\n", argv[0]);
        return 1;
    }

    Session session = {{0}, "GUEST"};
    size_t name_length = strlen(argv[1]);
    if (name_length >= sizeof(session.name)) {
        puts("STATUS: INPUT REJECTED");
    } else {
        memcpy(session.name, argv[1], name_length + 1);
        puts("STATUS: ACCEPTED");
    }

    printf("NAME: %.16s\n", session.name);
    printf("ROLE: %.8s\n", session.role);
    printf("VAULT: %s\n", strcmp(session.role, "ADMIN") == 0 ? "UNLOCKED" : "LOCKED");
    printf("MEMORY:");
    const unsigned char *bytes = (const unsigned char *)&session;
    for (size_t i = 0; i < sizeof(session); i++) {
        printf(" %02X", bytes[i]);
    }
    putchar('\n');
    return 0;
}
