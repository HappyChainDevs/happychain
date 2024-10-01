#!/usr/bin/env bun
import { join } from "node:path"
import { build } from "../bundle"
import { cliArgs } from "../cli-args"

// load config
const { default: configs } = await import(join(process.cwd(), cliArgs.config))

await build({ configs, options: cliArgs })
