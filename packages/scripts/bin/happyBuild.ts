#!/usr/bin/env bun
import { join } from "node:path"
import { build } from "../lib/bundle"
import { cliArgs } from "../lib/cli-args"

// load config
const { default: configs } = await import(join(process.cwd(), cliArgs.config))

await build({ configs, options: cliArgs })
