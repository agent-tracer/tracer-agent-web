#!/usr/bin/env node
// 상한은 매니페스트가 소유하고 전부 0이므로 예산 파일도 백로그도 두지 않는다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BUDGETS, ROOT_DIR } from "../architecture.manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage"]);
const SOURCE = /\.(?:ts|tsx)$/;
const TEST = /\.(?:test|spec)\.tsx?$/;
const DECLARATION = /\.d\.ts$/;

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

/** 300줄을 넘는 파일은 책임이 여럿이라는 신호다. */
export function findOversized(files, maxLines) {
  return files
    .filter((file) => SOURCE.test(file) && !TEST.test(file) && !DECLARATION.test(file))
    .map((file) => ({ file, lines: fs.readFileSync(file, "utf8").split("\n").length }))
    .filter((candidate) => candidate.lines > maxLines)
    .sort((left, right) => right.lines - left.lines);
}

function main() {
  const source = path.join(ROOT, ROOT_DIR);
  const files = fs.existsSync(source) ? walk(source) : [];
  const oversized = findOversized(files, BUDGETS.maxFileLines);

  if (oversized.length > BUDGETS.oversizedFiles) {
    console.error("구조 상한을 넘었다.\n");
    console.error(`  ✗ oversizedFiles: ${oversized.length}개 (상한 ${BUDGETS.oversizedFiles})`);
    for (const offender of oversized) {
      console.error(`      ${path.relative(ROOT, offender.file)} (${offender.lines}줄)`);
    }
    console.error("\n상한을 올리지 않는다. 파일을 나눈다.");
    process.exit(1);
  }

  console.log(`구조 상한 통과 (oversizedFiles ${oversized.length}/${BUDGETS.oversizedFiles})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
