# 内置 Cocos 引擎的分发约定

## 普通用户不安装 Creator

Skill 包携带 Cocos Engine 3.8.8 的预编译 Web 运行时及 AVG 播放器，位于 `assets/toolkit/public/engine`。包含实际引擎 JS、加载器、资源包、启动页和许可证；不通过本机 Creator 路径、CDN 或首次下载获取引擎。

普通环境只需要 Node.js 22+ 和支持 WebGL 的浏览器。skill.zip 内包含预构建编辑器、内置引擎及打包好的 Node 启动服务；无需 npm、安装依赖或联网下载。

```text
node scripts/avg.mjs doctor
node scripts/avg.mjs serve --project <项目目录>
node scripts/avg.mjs export --format web --project <项目目录>
node scripts/avg.mjs export --format creator --project <项目目录>
```

默认 serve 使用已构建的编辑器。开发 Web 编辑器请下载独立源码包后使用 `serve --dev`。修改剧本、人物、图片、游戏 UI、全局变量和方向都是数据修改，不需要重编译引擎。

## 源码开发

需要调整编辑器或增加逻辑时下载 [source.zip](https://wangyu.tech/avg/source.zip)，解压为独立工具目录；用户作品仍留在原项目空间，启动时显式指定 --project。源码包含编辑器、脚本内核、Cocos 播放器、构建/导出工具、测试、文档和示例，已带 Web 与小游戏引擎，排除 node_modules 与构建缓存。

```text
npm ci
node scripts/cli.mjs serve --dev --project <项目目录>
npm run build
node scripts/cli.mjs serve --project <项目目录>
```

只修改 React 编辑器时无需 Creator。修改 `src/core` 或 `cocos-template/AvgPlayer.ts` 涉及预编译播放器，须按下文重建 Web 和小游戏引擎，再打包发布。基础 skill 包保留生成 Creator 工程和校验所需的内核/模板，不包含完整编辑器开发环境；不要在该包运行 npm ci。

## 完整性与版本

`runtime-manifest.json` 记录引擎版本、随包文件大小和 SHA-256，以及 AVG 播放器/脚本执行器的源代码指纹。

- 启动、Web 导出、skill 打包均先验证引擎。
- 文件缺失/损坏提示重新解压完整技能包，不提示用户安装 Creator。
- 修改底层播放器而未重建时阻止发布，避免源代码和内置执行器不一致。
- `npm run engine:verify` 仅使用 Node 内置模块，可以在尚未安装 npm 依赖时检查引擎包。
- `doctor` 不搜索、启动或依赖 Creator。

## Creator 工程与原生构建

生成 Creator 工程仅使用随包的代码、素材和 `cocos-template/engine-settings.json`，没有本机 SDK 文件读取，也没有静默缺省配置。

用户选择在 Creator 中继续编辑或发布原生平台时，才需要自行安装匹配的 Creator 3.8.8 与平台工具链。工程 ZIP 不等于原生可执行程序。

## 维护者重建

`npm run engine:build` 是维护工具，不属于用户初始化步骤。维护者修改 `AvgPlayer.ts` 或 `src/core` 后，使用可选的 Creator 3.8.8 重建，并自动刷新内置清单，再验证和打包。

可用 `COCOS_CREATOR` 指定构建工具。这个查找逻辑独立保存在 `creator-tools.mjs`，普通启动、检查和导出不会导入它。当前选择的是分发预编译引擎，不要求用户安装完整引擎源码或编辑器。

## 无 Creator 回归验证

自动测试会移除子进程的可执行文件搜索路径、把 Creator 指向不存在的位置，验证 doctor；同时拒绝 SDK 文件复制，验证工程导出包含完整的随包设置。Web 导出和引擎缺失/篡改检查均有回归测试。测试不会卸载或修改电脑上已有的 Creator。
