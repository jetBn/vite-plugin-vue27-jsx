# vite-plugin-vue27-jsx
Vite plugin for Vue2.7.x
* vue文件内自动识别转换`<script lang="jsx"></script>`
* js文件自动识别转换jsx


由于相关[vite-plugin-vue2-jsx](https://github.com/hujinbin/vite-plugin-vue2-jsx)没有支持对应的vue2.7.x版本所以相关自己fork一份以及对应[vite-plugin-vue2](https://github.com/vitejs/vite-plugin-vue2)官方的vue2.7x插件结合了。


## Install

```bash
npm install vite-plugin-vue27-jsx -D
```

```js
// vite.config.js
import { createVuePlugin } from 'vite-plugin-vue27-jsx'

export default {
  plugins: [
    createVuePlugin(/* options */)
  ],
}
```

主要是将[vite-plugin-vue2-jsx](https://github.com/hujinbin/vite-plugin-vue2-jsx)的`vueTemplateOptions`配置移除，由[vite-plugin-vue2](https://github.com/vitejs/vite-plugin-vue2) 中的`options`中`template`控制, 以及移除了一些不需要的依赖比如`vue-template-compiler`。
`

项目配置`options`来源于 [vite-plugin-vue2-jsx](https://github.com/hujinbin/vite-plugin-vue2-jsx)与[vite-plugin-vue2](https://github.com/vitejs/vite-plugin-vue2) 结合具体可跳转查看
## [Options]

### `jsx`

Type: `Boolean`<br>
Default: `false`

jsx 转换的选项。

### `jsxOptions`

Type: `Object`<br>

The options for `@vue/babel-preset-jsx`.

### `target`

Type: `String`<br>

esbuild 转换脚本代码的选项