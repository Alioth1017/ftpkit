# FtpKit

English | [简体中文](./README_zh.md)

A command line tool for uploading files to FTP/SSH servers.

## Features

- Support both FTP and SSH (SFTP) protocols
- Concurrent file uploads for better performance
- File comparison to avoid unnecessary uploads
- Customizable entry files upload order

## Usage

### FTP Mode (default)

```bash
ftpkit -l ./dist -r /var/www/html --host example.com -u username -p password
```

### SSH Mode

```bash
ftpkit -l ./dist -r /var/www/html --host example.com -u username -p password -m ssh
```

## Options

- `-l, --localDir <localDir>` - Local directory path
- `-r, --remoteDir <remoteDir>` - Remote directory path
- `--host <host>` - Server host
- `--port <port>` - Server port (default: 21 for FTP, 22 for SSH)
- `-u, --user <user>` - Server user
- `-p, --password <password>` - Server password
- `--secure` - Use secure connection (for FTP mode only)
- `-m, --mode <mode>` - Connection mode: `ftp` or `ssh` (default: `ftp`)
- `-e, --entries <entries...>` - Entries to upload (default: `["index.html"]`)

## Development

Modify parameters such as `name, description, bin, keywords, author` in `package.json`.

Add business logic in the `index.ts` file.

Call the functions in `index.ts` in `cli.ts`.

## Testing

Execute the packaging command `pnpm build`.

Execute the functional test command `node ./dist/cli.js`.

## Publishing

Execute `npm publish`. During the process, operations such as login authorization and selection of version information are required.
