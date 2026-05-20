#!/usr/bin/env node
// install-aliases.mjs — set project-local git aliases for product/meta log
// filtering (commit-discipline.md). Idempotent: re-running is safe and will
// not clobber a user's customized value, only fill in missing aliases.

import { execFileSync } from "node:child_process";

const ALIASES = {
  "product-log": "log --pretty=format:'%h %s' --invert-grep --grep=^meta",
  "meta-log": "log --pretty=format:'%h %s' --grep=^meta",
};

function readAlias(name) {
  try {
    return execFileSync("git", ["config", "--local", "--get", `alias.${name}`], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function setAlias(name, value) {
  execFileSync("git", ["config", "--local", `alias.${name}`, value], {
    stdio: "inherit",
  });
}

let added = 0;
let kept = 0;
for (const [name, value] of Object.entries(ALIASES)) {
  const current = readAlias(name);
  if (current === null) {
    setAlias(name, value);
    console.log(`  + alias.${name} = ${value}`);
    added++;
  } else if (current === value) {
    kept++;
  } else {
    console.log(`  ! alias.${name} already set to a custom value: ${current}`);
    console.log(`    skipping (set --local alias.${name} manually to override)`);
    kept++;
  }
}

console.log(`\ndone. added=${added} kept=${kept}`);
console.log(`try:  git product-log -n 10   /   git meta-log -n 10`);
