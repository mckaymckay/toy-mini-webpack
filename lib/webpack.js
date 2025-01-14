const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser"); // 解析AST语法树
const traverse = require("@babel/traverse").default; // 遍历AST语法树
const babel = require("@babel/core"); // 将AST语法树转化为js代码（ES5）

module.exports = class Webpack {
  /**
  *  构造函数，获取webpack配置
  *  @param {*} options
  */

  constructor(options) {
    // 保存配置信息
    const { entry, output } = options
    this.entry = entry
    this.output = output
  }

  /**
   * webpack 运行函数
   */

  run () {
    console.log('开始执行Webpack!')

    /**
     * 解析模块
     * 打包
     */

    // 解析模块，生成依赖关系图(dependency gragh)
    this.depsGraph = this.parseModules(this.entry)


    this.bundle()
  }

  /**
   * parseModules：模块解析
   * @param {*} file
   * 分析模块信息 + 递归遍历引入模块
   * 1. getModuleInfo：分析模块信息
   * 2. getDeps：递归遍历引入模块
   */
  parseModules (file) {
    const entry = this.getModuleInfo(file)
    const tempArr = [entry]

    // 递归遍历，获取引入模块代码
    this.getDeps(tempArr, entry)
    console.log(49, tempArr)

    // 将tempArr转成对象
    const depsGraph = {}
    tempArr.forEach(moduleInfo => {
      depsGraph[moduleInfo.file] = {
        deps: moduleInfo.deps,
        code: moduleInfo.code
      }
    })
    return depsGraph; // 返回依赖关系图
  }

  /**
  *  分析模块
  *  @param {*} file
  *  @returns Object
  */
  getModuleInfo (file) {
    const body = fs.readFileSync(file, 'utf-8')

    // 转化为AST语法树
    const ast = parser.parse(body, {
      sourceType: 'module', // 表示我们解析的是ES模块
    })

    // 依赖收集:相对项目根路径的相对路径
    const deps = {}

    traverse(ast, {
      // visitor函数：针对语法中的特定节点类型，这里找引入模块的语句，就是ImportDeclaration节点类型
      ImportDeclaration ({ node }) {
        // 入口文件路径
        const dirname = path.dirname(file)
        // 引入文件路径
        const abspath = "./" + path.join(dirname, node.source.value)
        deps[node.source.value] = abspath
      }
    })

    // ES6转化为ES5语法
    const { code } = babel.transformFromAst(ast, null, {
      presets: ["@babel/preset-env"],
    })

    return {
      file,   // 解析文件的路径
      deps,  // 该文件的依赖对象
      code   // 文件代码
    };
  }

  /**
   * 递归遍历引入模块, 获取依赖
   *  @param {*} temp: 保存分析结果
   *  @param {*} module：依赖对象
  */
  getDeps (temp, { deps }) {
    // 遍历依赖
    Object.keys(deps).forEach(key => {
      // 去重
      if (!temp.some(item => item.file === deps[key])) {
        // 获取依赖模块代码
        const child = this.getModuleInfo(deps[key])
        temp.push(child)
        // 递归遍历
        this.getDeps(temp, child)
      }
    })
  }

  bundle () {
    const content = `
    (function (__webpack_modules__) {
      function __webpack_require__(moduleId) {
        function require(relPath) {
          return __webpack_require__(__webpack_modules__[moduleId].deps[relPath])
          }
          var exports = {};
          (function (require,exports,code) {
            eval(code)
          })(require,exports,__webpack_modules__[moduleId].code)
          return exports
        }
        __webpack_require__('${this.entry}')
    })(${JSON.stringify(this.depsGraph)})
  `;


    if (!fs.existsSync(this.output.path)) {
      fs.mkdirSync(this.output.path)
    }
    const filePath = path.join(this.output.path, this.output.filename)
    fs.writeFileSync(filePath, content)


    // (function (__webpack_modules__) {
    //   function __webpack_require__ (moduleId) {
    //     // 实现require方法
    //     function require (relPath) {
    //       return __webpack_require__(__webpack_modules__[moduleId].deps[relPath])
    //     }
    //     // 保存导出模块
    //     var exports = {};

    //     // 调用函数
    //     (function (require, exports, code) {
    //       eval(code)
    //     })(require, exports, __webpack_modules__[moduleId].code)


    //     // 返回导出模块
    //     return exports
    //   }
    //   __webpack_require__(this.entry)
    // })(this.depsGraph)
  }

}