import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/library.umd.js',
      format: 'umd',
      name: 'library',
      sourcemap: true,
    },
    {
      file: 'dist/library.es.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  external: [
    'ssh2-sftp-client',
    'basic-ftp',
    'chalk',
    'commander',
    'fs',
    'path',
    'fs/promises'
  ],
  plugins: [
    json(),
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    typescript(),
    babel({
      babelHelpers: 'runtime',
      plugins: ['@babel/plugin-transform-runtime'],
    }),
    terser(),
  ],
};