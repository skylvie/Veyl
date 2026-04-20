#!/usr/bin/env zsh

script_dir=${0:A:h}

if [[ "$PWD" != "$script_dir" ]]; then
    cd "$script_dir"
fi

keep_js=false
keep_out=false

for arg in "$@"; do
    case "$arg" in
        --keep-js)
            keep_js=true
            ;;
        --keep-out)
            keep_out=true
            ;;
        --rm-js)
            rm -f *.js &> /dev/null
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            echo "Usage: ./test.sh [--keep-js|--keep-out|--rm-js]" >&2
            exit 1
            ;;
    esac
done

cd ..
pnpm build
cd test

tsc index.ts --ignoreconfig
node index.js

node ../dist/cli.js -i index.ts -o out.js
node out.js

node ../dist/cli.js -i index.ts -o out.js --unnecessary_depth=false --log_level=debug > cli_depth_disabled.log
if ! grep -q "depth refs: 0 added" cli_depth_disabled.log; then
    echo "Expected --unnecessary_depth=false to disable unnecessary depth" >&2
    cat cli_depth_disabled.log >&2
    exit 1
fi

node ../dist/cli.js -i index.ts -o out.js --unnecessary-depth=true --log-level=debug > cli_depth_enabled.log
if grep -q "depth refs: 0 added" cli_depth_enabled.log; then
    echo "Expected --unnecessary-depth=true to insert unnecessary depth references" >&2
    cat cli_depth_enabled.log >&2
    exit 1
fi

if [[ "$keep_js" == true ]]; then
    exit 0
fi

if [[ "$keep_out" == true ]]; then
    rm -f index.js module.js cli_depth_disabled.log cli_depth_enabled.log
else
    rm -f *.js
    rm -f cli_depth_disabled.log cli_depth_enabled.log
fi
