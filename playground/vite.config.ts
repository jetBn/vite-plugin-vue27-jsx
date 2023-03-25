import { defineConfig } from 'vite'
import { createVuePlugin } from '../src/index'
import Inspect from 'vite-plugin-inspect'

const config = defineConfig({
  resolve: {
    alias: {
      '/@': __dirname,
    },
  },
  build: {
    sourcemap: true,
    minify: false,
  },
  plugins: [
    Inspect(),
    createVuePlugin({ jsx: true }) as any,
  ],
})

export default config
