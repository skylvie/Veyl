#!/usr/bin/env zsh

rm *.js &> /dev/null

tsc index.ts --ignoreconfig
node index.js

node ../dist/cli.js -i index.ts -o out.js
node out.js