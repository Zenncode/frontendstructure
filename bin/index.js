#!/usr/bin/env node

import { initProject, printHelp } from "../lib/init.js";

const [command, ...args] = process.argv.slice(2);

if (!command || command === "--help" || command === "-h") {
  printHelp();
} else if (command === "init") {
  try {
    await initProject(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`x ${message}`);
    process.exitCode = 1;
  }
} else {
  console.error(`x Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}
