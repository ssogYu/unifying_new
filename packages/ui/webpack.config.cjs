// 引入 Node.js 的 path 模块，用于处理文件路径
const path = require('path');
// 引入 MiniCssExtractPlugin 插件，用于将 CSS 提取到单独的文件中
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// 引入 CssMinimizerPlugin 插件，用于在生产环境中压缩和优化 CSS 代码
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

// 判断当前是否为生产环境
// 通过检查 NODE_ENV 环境变量是否等于 'production' 来确定
// 生产环境会启用代码压缩、优化等特性
const isProduction = process.env.NODE_ENV === 'production';
// 获取输出格式，默认为 umd
// FORMAT 环境变量可以设置为 'esm'、'cjs' 或 'umd'
// - esm: ES Module 格式，现代浏览器和打包工具支持
// - cjs: CommonJS 格式，Node.js 环境使用
// - umd: Universal Module Definition，兼容 AMD、CommonJS 和全局变量
const format = process.env.FORMAT || 'umd';

// 根据格式获取输出配置
// 这个函数根据不同的模块格式返回相应的 webpack output 配置
const getOutputConfig = () => {
  // 基础配置：设置输出目录为当前目录下的 dist 文件夹
  // __dirname 表示当前文件所在的目录
  // path.resolve 将路径解析为绝对路径
  const baseConfig = {
    path: path.resolve(__dirname, 'dist'),
  };

  // ESM (ECMAScript Module) 格式配置
  // ESM 是现代 JavaScript 的模块系统，支持 import/export 语法
  if (format === 'esm') {
    return {
      ...baseConfig,
      // 输出文件名为 index.esm.js，便于识别模块格式
      filename: 'index.esm.js',
      library: {
        // 指定库的类型为 module，输出 ESM 格式
        type: 'module',
      },
    };
  }

  // CommonJS 格式配置
  // CommonJS 是 Node.js 使用的模块系统，使用 require/module.exports
  if (format === 'cjs') {
    return {
      ...baseConfig,
      // 输出文件名为 index.cjs.js，便于识别模块格式
      filename: 'index.cjs.js',
      library: {
        // 指定库的类型为 commonjs2，输出 CommonJS 格式
        // commonjs2 相比 commonjs 会导出 module.exports 的默认值
        type: 'commonjs2',
      },
    };
  }

  // UMD (Universal Module Definition) 格式配置（默认）
  // UMD 是一种兼容多种模块系统的通用格式
  return {
    ...baseConfig,
    // 输出文件名为 index.umd.js，便于识别模块格式
    filename: 'index.umd.js',
    library: {
      // 库的全局变量名称，在浏览器中通过 window.UnifyingUI 访问
      name: 'UnifyingUI',
      // 指定库的类型为 umd，支持 AMD、CommonJS 和全局变量
      type: 'umd',
    },
    // 指定全局对象为 'this'，确保在不同环境下都能正确访问
    // 在浏览器中 this 指向 window，在 Node.js 中指向 global
    globalObject: 'this',
  };
};

// 根据格式获取外部依赖配置
// externals 配置用于将某些依赖排除在打包之外，避免重复打包
// 这样可以减小包体积，并允许使用者自行安装依赖
const getExternals = () => {
  // ESM 格式的外部依赖配置
  // 在 ESM 格式下，直接使用包名作为外部依赖
  if (format === 'esm') {
    return {
      // 将 react 排除在打包之外，使用外部安装的 react
      react: 'react',
      // 将 react-dom 排除在打包之外，使用外部安装的 react-dom
      'react-dom': 'react-dom',
    };
  }

  // 其他格式（CJS 和 UMD）的外部依赖配置
  // 需要为不同的模块系统指定不同的引用方式
  return {
    react: {
      // CommonJS 环境下的引用方式：require('react')
      commonjs: 'react',
      // CommonJS2 环境下的引用方式：require('react')
      commonjs2: 'react',
      // AMD 环境下的引用方式：define(['react'], ...)
      amd: 'react',
      // 浏览器全局变量环境下的引用方式：React
      root: 'React',
    },
    'react-dom': {
      // CommonJS 环境下的引用方式：require('react-dom')
      commonjs: 'react-dom',
      // CommonJS2 环境下的引用方式：require('react-dom')
      commonjs2: 'react-dom',
      // AMD 环境下的引用方式：define(['react-dom'], ...)
      amd: 'react-dom',
      // 浏览器全局变量环境下的引用方式：ReactDOM
      root: 'ReactDOM',
    },
  };
};

// 获取样式加载器配置
// 这个函数返回用于处理 CSS 文件的 loader 数组
// loader 从右到左执行，即后写的 loader 先执行
const getStyleLoaders = () => {
  // 基础的样式加载器配置
  const baseLoaders = [
    // css-loader：解析 CSS 文件中的 @import 和 url() 语句
    // 将 CSS 转换为 JavaScript 模块，使其能被 webpack 处理
    'css-loader',
    {
      // postcss-loader：使用 PostCSS 处理 CSS
      // PostCSS 是一个用 JavaScript 转换 CSS 的工具
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          // PostCSS 插件列表，目前为空
          // 可以添加 autoprefixer、cssnano 等插件
          plugins: [],
        },
      },
    },
  ];

  // style-loader：将 CSS 注入到 DOM 中
  // 在开发环境中，style-loader 会将 CSS 通过 <style> 标签注入到页面
  // 在生产环境中，通常会使用 MiniCssExtractPlugin 替代 style-loader
  return ['style-loader', ...baseLoaders];
};

// Webpack 基础配置对象
// 这个配置对象包含了 webpack 打包所需的核心配置
const baseConfig = {
  // 入口文件：指定 webpack 打包的起点
  // 从 src/index.ts 开始，递归分析所有依赖
  entry: './src/index.ts',
  // 输出配置：使用 getOutputConfig() 函数获取
  output: getOutputConfig(),
  // 解析配置：配置模块如何被解析
  resolve: {
    // 自动解析的扩展名
    // 在引入模块时，可以省略这些扩展名
    // 例如：import './App' 会自动尝试解析 ./App.ts、./App.tsx 等
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    // 路径别名配置
    // 可以使用简短的别名代替长路径
    // 例如：import '@/components/Button' 代替 import '../../components/Button'
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // 外部依赖配置：使用 getExternals() 函数获取
  externals: getExternals(),
  // 模块配置：配置模块的处理规则
  module: {
    // 规则数组：每个规则定义了如何处理特定类型的文件
    rules: [
      {
        // TypeScript 文件处理规则
        // 匹配所有 .ts 和 .tsx 文件
        test: /\.(ts|tsx)$/,
        // 使用 ts-loader 处理 TypeScript 文件
        use: [
          {
            loader: 'ts-loader',
            options: {
              // transpileOnly: true 表示只进行类型转换，不进行类型检查
              // 这样可以加快编译速度，类型检查由 IDE 或单独的命令完成
              transpileOnly: true,
              // TypeScript 编译器选项
              compilerOptions: {
                // 输出模块格式为 ESNext（最新的 ECMAScript 模块）
                module: 'esnext',
                // 目标 JavaScript 版本为 ES5
                // 确保代码能在较旧的浏览器中运行
                target: 'es5',
                // JSX 转换为 React.createElement 调用
                jsx: 'react',
              },
            },
          },
        ],
        // 排除 node_modules 目录，不处理其中的文件
        // node_modules 中的文件通常是已经编译好的，不需要再次处理
        exclude: /node_modules/,
      },
      {
        // CSS 文件处理规则
        // 匹配所有 .css 文件
        test: /\.css$/,
        // 使用 getStyleLoaders() 函数获取的 loader 数组处理
        use: getStyleLoaders(),
      },
      {
        // SCSS 文件处理规则
        // 匹配所有 .scss 文件
        test: /\.scss$/,
        // 使用 getStyleLoaders() 加上 sass-loader 处理
        // sass-loader 将 SCSS 编译为 CSS
        use: [...getStyleLoaders(), 'sass-loader'],
      },
      {
        // LESS 文件处理规则
        // 匹配所有 .less 文件
        test: /\.less$/,
        // 使用 getStyleLoaders() 加上 less-loader 处理
        // less-loader 将 LESS 编译为 CSS
        use: [...getStyleLoaders(), 'less-loader'],
      },
      {
        // 图片资源处理规则
        // 匹配常见的图片格式：png、jpg、jpeg、gif、svg、ico
        test: /\.(png|jpe?g|gif|svg|ico)$/,
        // 使用 asset/resource 类型处理
        // webpack 5 内置的资源模块，会生成单独的文件并导出 URL
        type: 'asset/resource',
        generator: {
          // 输出文件名模板
          // [name]: 原始文件名
          // [hash]: 文件内容的哈希值，用于缓存控制
          // [ext]: 文件扩展名
          filename: 'images/[name].[hash][ext]',
        },
      },
      {
        // 字体文件处理规则
        // 匹配常见的字体格式：woff、woff2、eot、ttf、otf
        test: /\.(woff2?|eot|ttf|otf)$/,
        // 使用 asset/resource 类型处理
        // 会生成单独的文件并导出 URL
        type: 'asset/resource',
        generator: {
          // 输出文件名模板
          // 字体文件会输出到 fonts 目录下
          filename: 'fonts/[name].[hash][ext]',
        },
      },
    ],
  },
};

// 生产环境配置
// 当 NODE_ENV 为 production 时应用这些配置
if (isProduction) {
  // 设置模式为生产环境
  // webpack 会自动启用一些优化，如代码压缩、作用域提升等
  baseConfig.mode = 'production';
  // 生成 source map 文件
  // source map 用于调试，可以将编译后的代码映射回源代码
  // 'source-map' 会生成单独的 .map 文件，不影响构建产物大小
  baseConfig.devtool = 'source-map';
  // 优化配置
  baseConfig.optimization = {
    // 启用代码压缩
    // webpack 会使用 TerserPlugin 压缩 JavaScript 代码
    minimize: true,
    // 自定义压缩器
    minimizer: [
      // '...' 表示保留 webpack 默认的压缩器（TerserPlugin）
      '...',
      // 添加 CSS 压缩器
      // CssMinimizerPlugin 使用 cssnano 压缩 CSS 代码
      // 可以移除空白、注释、优化选择器等
      new CssMinimizerPlugin(),
    ],
  };
} else {
  // 开发环境配置
  // 当 NODE_ENV 不为 production 时应用这些配置
  baseConfig.mode = 'development';
  // 生成 source map 文件
  // 开发环境下也生成 source map，便于调试
  baseConfig.devtool = 'source-map';
  // 开发服务器配置
  // webpack-dev-server 提供了一个简单的开发服务器，支持热更新
  baseConfig.devServer = {
    // 静态文件服务配置
    static: {
      // 指定静态文件目录
      // 开发服务器会从这个目录提供静态文件
      directory: path.join(__dirname, 'dist'),
    },
    // 启用热模块替换（HMR）
    // 当代码修改时，只更新变化的模块，不刷新整个页面
    hot: true,
    // 不自动打开浏览器
    // 设置为 true 会在启动服务器时自动打开默认浏览器
    open: false,
    // 开发服务器端口号
    // 可以通过 http://localhost:3000 访问应用
    port: 3000,
    // 启用 gzip 压缩
    // 减少传输的数据量，提高加载速度
    compress: true,
    // 客户端配置
    client: {
      // 浏览器覆盖层配置
      // 当编译出错时，在浏览器中显示错误覆盖层
      overlay: {
        // 显示错误信息
        errors: true,
        // 不显示警告信息
        warnings: false,
      },
    },
    // HTTP 响应头配置
    headers: {
      // 允许跨域访问
      // '*' 表示允许任何来源的跨域请求
      'Access-Control-Allow-Origin': '*',
    },
  };
}

// ESM 格式需要开启输出模块实验性特性
// webpack 5 中，输出 ESM 格式需要开启 experiments.outputModule
if (format === 'esm') {
  baseConfig.experiments = {
    // 启用输出模块功能
    // 允许 webpack 输出 ESM 格式的代码
    outputModule: true,
  };
}

// 导出配置对象
// webpack 会使用这个配置对象进行打包
module.exports = baseConfig;
