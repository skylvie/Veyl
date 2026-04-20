#!/usr/bin/env zsh

cd ..
pnpm build
cd example

tsc index.ts --ignoreconfig
node index.js

node ../dist/cli.js -i index.ts -o out.js
node out.js

rm *.js
