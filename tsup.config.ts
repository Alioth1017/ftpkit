import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],
  target: 'node14',
  outDir: 'dist',
  clean: false,
  dts: false,
  noExternal: ['chalk'],
  banner: {
    js: '#!/usr/bin/env node'
  }
});
