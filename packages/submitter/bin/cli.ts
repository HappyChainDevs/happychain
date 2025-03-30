#!/usr/bin/env bun
import { processCmd } from "../lib/cli/index"
// TODO needs --help
await processCmd(Bun.argv)
