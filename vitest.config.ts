import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);

/**
 * monorepo 里有两份 React：根目录 18.3.1，apps/subslayer 本地 18.2.0。
 * @testing-library/react 被提升到根目录，它 require 到的永远是根那份 react-dom；
 * 组件源码却解析到本地那份 react。两份 React 会让 hook 直接报 Invalid hook call。
 *
 * 这里把 react 全家桶钉到「测试库实际用的那一份」，保证渲染器和组件共用同一个实例。
 */
const libraryRequire = createRequire(require.resolve('@testing-library/react'));
const reactAliases = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  'react-dom/test-utils',
].map((id) => ({
  find: new RegExp(`^${id.replace('/', '\\/')}$`),
  replacement: libraryRequire.resolve(id),
}));

export default defineConfig({
  // vitest 2 自带 vite 5，项目本身用 vite 7，两份 Plugin 类型不兼容，运行期是同一个插件
  plugins: [react() as unknown as Plugin],
  resolve: {
    alias: reactAliases,
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
});