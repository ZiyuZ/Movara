rumdl *paths=".":
    rumdl fmt {{ paths }}
    rumdl check --fix {{ paths }}

ui-prototype:
    bun.exe run --tsconfig-override=crates/movara-app/docs/prototype/tsconfig.json crates/movara-app/docs/prototype/build.ts

fmt:
    cargo.exe fmt --all

build:
    cargo.exe build --workspace --locked

check:
    cargo.exe fmt --all -- --check
    cargo.exe check --workspace --all-targets --locked
    cargo.exe clippy --workspace --all-targets --locked -- -D warnings

test:
    cargo.exe test --workspace --locked
