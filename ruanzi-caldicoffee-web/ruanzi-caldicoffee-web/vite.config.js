import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  transpileDependencies: true,
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'https://www.caldicoffee.com.cn', // 后端服务地址
        // target: 'https://www.ruanzi.net', // 后端服务地址
        changeOrigin: true, // 修改请求源
        rewrite: (path) => path.replace(/^\/api/, '/') // 可选：重写路径
      }
    },
  },
  plugins: [
    vue(),
    // vueDevTools(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },

  // build: {
  //   outDir: 'dist', // 生成输出的根目录。如果该目录存在，则会在生成之前将其删除。 默认文件夹名称为dist
  //   minify: 'terser', // 设置使用 Terser 进行代码压缩
  //   target: 'esnext',
  //   terserOptions: {
  //     compress: {
  //     drop_console: true, // 生产环境去掉控制台 console
  //     drop_debugger: true, // 生产环境去掉控制台 debugger 默认就是true
  //     dead_code: true, // 删除无法访问的代码 默认就是true
  //     }
  //   },
  //   chunkSizeWarningLimit: 2000, // 调整区块大小警告限制
  // },
})

