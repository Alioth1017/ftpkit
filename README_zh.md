# FtpKit

[English](./README.md) | 简体中文

一个用于上传文件到 FTP/SSH 服务器的命令行工具。

## 功能特性

- 支持 FTP 和 SSH (SFTP) 协议
- 并发文件上传以提升性能
- 文件比较（大小和修改时间）以避免不必要的上传
- 可自定义入口文件上传顺序（例如：最后上传 `index.html`）

## 安装

```bash
# 全局安装
npm install -g ftpkit

# 或者使用 npx
npx ftpkit --help
```

## 使用方法

### 命令行 (CLI)

#### FTP 模式（默认）

```bash
ftpkit -l ./dist -r /var/www/html --host example.com -u username -p password
```

#### SSH 模式

```bash
ftpkit -l ./dist -r /var/www/html --host example.com -u username -p password -m ssh
```

### 编程方式使用

你也可以在 Node.js 脚本中将 FtpKit 作为库使用。

```typescript
import { FtpUpload } from 'ftpkit';

const uploader = new FtpUpload({
  localDir: './dist',
  remoteDir: '/var/www/html',
  host: 'example.com',
  user: 'username',
  password: 'password',
  mode: 'ssh', // 或 'ftp'
  entries: ['index.html'] // 最后上传的文件
});

await uploader.execute();
```

## 参数选项

- `-l, --localDir <localDir>` - 本地目录路径
- `-r, --remoteDir <remoteDir>` - 远程目录路径
- `--host <host>` - 服务器主机
- `--port <port>` - 服务器端口 (默认: FTP 为 21，SSH 为 22)
- `-u, --user <user>` - 服务器用户名
- `-p, --password <password>` - 服务器密码
- `--secure` - 使用安全连接 (仅适用于 FTP 模式)
- `-m, --mode <mode>` - 连接模式: `ftp` 或 `ssh` (默认: `ftp`)
- `-e, --entries <entries...>` - 要上传的入口文件 (默认: `["index.html"]`)

## 开发

修改 `package.json` 中的 `name、description、bin、keywords、author` 等参数

在 `index.ts` 文件中添加业务逻辑

在 `cli.ts` 中调用 `index.ts` 中的功能

## 测试

执行打包命令 `pnpm build`

执行功能测试命令 `node ./dist/cli.js`

## 发布

执行 `npm publish`，过程中需要登录授权及选择版本信息等操作
