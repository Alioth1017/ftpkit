# CLI Library Template

English | [简体中文](./README_zh.md)

## Development

Modify parameters such as `name, description, bin, keywords, author` in `package.json`.

Add business logic in the `index.ts` file.

Call the functions in `index.ts` in `cli.ts`.

## Testing

Execute the packaging command `pnpm build`.

Execute the functional test command `node./dist/cli.js`.

## Publishing

Execute `npm publish`. During the process, operations such as login authorization and selection of version information are required.
