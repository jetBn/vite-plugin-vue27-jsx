import fs from 'fs'
import { createFilter } from '@rollup/pluginutils'
import type { Plugin, ViteDevServer } from 'vite'
import { normalizeComponentCode, vueComponentNormalizer } from './utils/componentNormalizer'
import { vueHotReloadCode, vueHotReload } from './utils/vueHotReload'
import { parseVueRequest } from './utils/query'
import { transformMain } from './main'
import { transformTemplateAsModule } from './template'
import { getDescriptor, getSrcDescriptor } from './utils/descriptorCache'
import { transformStyle } from './style'
import { handleHotUpdate } from './hmr'
import { transformVueJsx } from './jsxTransform'

import type {
  SFCBlock,
  SFCScriptCompileOptions,
  SFCStyleCompileOptions,
  SFCTemplateCompileOptions
} from 'vue/compiler-sfc'

import type * as _compiler from 'vue/compiler-sfc'
import { resolveCompiler } from './compiler'

export type { VueQuery } from './utils/query'


declare module 'vue/compiler-sfc' {
  interface SFCDescriptor {
    id: string
  }
}
export interface Options {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]

  isProduction?: boolean
  // options to pass on to vue/compiler-sfc
  script?: Partial<Pick<SFCScriptCompileOptions, 'babelParserPlugins'>>
  template?: Partial<
    Pick<
      SFCTemplateCompileOptions,
      | 'compiler'
      | 'compilerOptions'
      | 'preprocessOptions'
      | 'transpileOptions'
      | 'transformAssetUrls'
      | 'transformAssetUrlsOptions'
    >
  >
  style?: Partial<Pick<SFCStyleCompileOptions, 'trim'>>

  // customElement?: boolean | string | RegExp | (string | RegExp)[]
  // reactivityTransform?: boolean | string | RegExp | (string | RegExp)[]
  compiler?: typeof _compiler
  /**
   * The options for jsx transform
   * @default false
   */
   jsx?: boolean
   /**
    * The options for `@vue/babel-preset-jsx`
    */
   jsxOptions?: Record<string, any>
   /**
    * The options for esbuild to transform script code
    * @default 'esnext'
    * @example 'esnext' | ['esnext','chrome58','firefox57','safari11','edge16','node12']
    */
   target?: string | string[]
}

export interface ResolvedOptions extends Options  {
  compiler: typeof _compiler
  sourceMap?: boolean
  cssDevSourcemap?: boolean
  root: string
  devServer?: ViteDevServer
  devToolsEnabled?: boolean
  isProduction: boolean
  target?: string | string[]
}

// https://github.com/vitejs/vite/blob/e8c840abd2767445a5e49bab6540a66b941d7239/packages/vite/src/node/optimizer/scan.ts#L147
const scriptRE = /(<script\b(?:\s[^>]*>|>))(.*?)<\/script>/gims
// https://github.com/vitejs/vite/blob/e8c840abd2767445a5e49bab6540a66b941d7239/packages/vite/src/node/optimizer/scan.ts#L151
const langRE = /\blang\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/im

const checkJSX = async (content: any) => {
  return new Promise(resolve => {
    if (content.indexOf('<script') > -1 && content.indexOf('</script>') > -1) {
      let hasJsx = false;
      content.replace(/<script.*?>([\s\S]+?)<\/script>/img, (_:any, js:any) => {    //正则匹配出script中的内容
        // 判断script内是否包含jsx语法
        if (/<[^>]+>/.test(js)) {
          hasJsx = true;
        }
        return js
      });
      resolve(hasJsx);
      return false;
    } else if (/<[^>]+>/.test(content)) {
      resolve(true);
      return false;
    }
    resolve(false);
  });
}

export function createVuePlugin(rawOptions: Options = {}): Plugin {

  const options: ResolvedOptions = {
    isProduction: process.env.NODE_ENV === 'production',
    compiler: null as any, // to be set in buildStart
    ...rawOptions,
    root: process.cwd(),
  }

  const filter = createFilter(options.include || /\.vue$/, options.exclude)
  const name = 'vite-plugin-vue27-jsx'

  return {
    name,
    config(config) {
      if (!config.optimizeDeps) config.optimizeDeps = {};
      if (!config.optimizeDeps.esbuildOptions) config.optimizeDeps.esbuildOptions = {};
      if (!config.optimizeDeps.esbuildOptions.plugins) config.optimizeDeps.esbuildOptions.plugins = [];
      config.optimizeDeps.esbuildOptions.plugins.push({
        name,
        async setup(build) {
          build.onLoad({ filter: /\.vue$/ },
            async ({ path }): Promise<any> => {
              const raw = fs.readFileSync(path, 'utf8');
              let js = '';
              let loader = 'js';
              let match = null;
              scriptRE.lastIndex = 0;
              // https://github.com/vitejs/vite/blob/e8c840abd2767445a5e49bab6540a66b941d7239/packages/vite/src/node/optimizer/scan.ts#L240
              while (match = scriptRE.exec(raw)) {
                const [, openTag, content] = match;
                const langMatch = openTag.match(langRE);
                const lang = langMatch && (langMatch[1] || langMatch[2] || langMatch[3]);
                if (lang === 'ts' || lang === 'tsx' || lang === 'jsx') {
                  loader = lang
                }else if (await checkJSX(content)) {
                  loader = 'jsx';
                }
                js = content;
              }

              return {
                loader,
                contents: js,
              };
            });
          build.onLoad({ filter: /\.js$/ },
            async ({ path }): Promise<any> => {
              const raw = fs.readFileSync(path, 'utf8');
              if (/<[^>]+>/.test(raw)) {
                return {
                  loader: 'jsx',
                  contents: raw,
                };
              }
            });
        },
      });

      if (options.jsx) {
        return {
          esbuild: {
            include: /\.ts$/,
            exclude: /\.(tsx|jsx)$/,
          },
        }
      }
    },

    handleHotUpdate(ctx) {
      if (!filter(ctx.file))
        return

      return handleHotUpdate(ctx, options)
    },

    configResolved(config) {
      options.isProduction = config.isProduction
      options.root = config.root

      if (!config.resolve.alias.some(({ find }) => find === 'vue')) {
        config.resolve.alias.push({
          find: 'vue',
          replacement: 'vue/dist/vue.runtime.esm.js'
        })
      }
    },

    configureServer(server) {
      options.devServer = server
    },

    buildStart() {
      options.compiler = options.compiler || resolveCompiler(options.root)
    },
    // 处理 ES6 的 import 语句，最后需要返回一个模块的 id
    async resolveId(id) {
      if (id === vueComponentNormalizer || id === vueHotReload) {
        return id
      }
      // serve subpart requests (*?vue) as virtual modules
      if (parseVueRequest(id).query.vue) {
        return id
      }
    },

    load(id) {
      if (id === vueComponentNormalizer) {
        return normalizeComponentCode
      }

      if (id === vueHotReload) {
        return vueHotReloadCode
      }

      const { filename, query } = parseVueRequest(id)
      // select corresponding block for subpart virtual modules
      if (query.vue) {
        if (query.src) {
          return fs.readFileSync(filename, 'utf-8')
        }
        const descriptor = getDescriptor(filename, options)!
        let block: SFCBlock | null | undefined

        if (query.type === 'script') {
          block = descriptor.script!
        } else if (query.type === 'template') {
          block = descriptor.template!
        } else if (query.type === 'style') {
          block = descriptor.styles[query.index!]
        } else if (query.index != null) {
          block = descriptor.customBlocks[query.index]
        }
        if (block) {
          return {
            code: block.content,
            map: block.map as any,
          }
        }
      }
    },

    async transform(fileCode, id, transformOptions) {
      let code = fileCode;
      const ssr = transformOptions?.ssr === true
      const { filename, query } = parseVueRequest(id)
      if (/\.(vue)$/.test(id)) {
        let hasJsx = false;
        fileCode.replace(/<script.*?>([\s\S]+?)<\/script>/img, (_, js) => {    //正则匹配出script中的内容
          // 判断script内是否包含jsx语法和是否已加lang="jsx"
          if (/<[^>]+>/.test(js) &&
            /<script.*?>/.test(_) &&
            !(/<script\s*lang=("|')jsx("|').*?>/.test(_))) {
            hasJsx = true;
          }
          return js
        });
        if (hasJsx) {
          code = fileCode.replace('<script', '<script lang="jsx"');
        }
      }
      if (/\.(tsx|jsx)$/.test(id)) {
        return transformVueJsx(code, id, options.jsxOptions)
      }
      // js文件包含jsx语法自动转换
      if (!query.vue && /\.(js)$/.test(id) && /<[^>]+>/.test(code)) {
        return transformVueJsx(code, id, options.jsxOptions)
      }

      if ((!query.vue && !filter(filename)) || query.raw) {
        return
      }

      if (!query.vue) {
        // main request
        return transformMain(code, filename, options, this, ssr)
        // return await transformMain(code, filename, options, this as any)
      }

      const descriptor = query.src
      ? getSrcDescriptor(filename, query)!
      : getDescriptor(filename, options)!
      
      
      // sub block request
      if (query.type === 'template') {
        return {
          code: await transformTemplateAsModule(
            code,
            descriptor,
            options,
            this,
            ssr
          ),
          map: {
            mappings: ''
          }
        }
        // return compileSFCTemplate(
        //   code,
        //   descriptor.template!,
        //   filename,
        //   options,
        //   this as any,
        // )
      }
      if (query.type === 'style') {
        return await transformStyle(
          code,
          descriptor,
          Number(query.index),
          options,
          this,
          filename
        )
      }
    },
  }
}
