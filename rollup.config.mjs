import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

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
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    babel({
      babelHelpers: 'runtime',
      extensions: ['.js', '.ts'],
      presets: [
        '@babel/preset-env',
        '@babel/preset-typescript'
      ],
      plugins: [
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-transform-classes',
        '@babel/plugin-transform-runtime'
      ]
    }),
    terser()
  ],
  external: ['@babel/runtime']
};