# Transaction Manager

## `package.json`

The `package.json` file lists a few dependencies that are aliases to the `empty-module` package.
These packages are dynamic mikro-orm dependencies (they're database connectors).

Whenever bundling, bun (and presumably other bundlers) will complain that these packages are not
installed. By aliasing them to `empty-module` as we do here, we avoid every user of the library
having to manually exclude these packages from their bundle.