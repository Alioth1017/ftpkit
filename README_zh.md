# CLI Library Template

[English](./README.md) | 简体中文

## 开发

修改 `package.json` 中的 `name、description、bin、keywords、author` 等参数

在 `index.ts` 文件中添加业务逻辑

在 `cli.ts` 中调用 `index.ts` 中的功能

## 测试

执行打包命令 `pnpm build`

执行功能测试命令 `node ./dist/cli.js`

## 发布

执行 `npm publish`，过程中需要登录授权及选择版本信息等操作
