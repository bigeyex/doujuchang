# 源码与构建

下载 [source.zip](../source.zip) 后，在独立目录开发工具。用户作品继续保留在原项目目录，启动时指定它；不要用源码示例覆盖作品。

## 开发编辑器

源码包含编辑器、项目服务、脚本内核、Cocos 模板、测试和文档，也附带已构建的 Web 与小游戏播放器。需要 Node.js 22+ 和 npm。

```sh
npm ci
node scripts/cli.mjs serve --dev --project PROJECT --port 5173
```

修改 React 页面、样式和编辑表单时使用开发服务。构建后可用生产服务检查：

```sh
npm run build
node scripts/cli.mjs serve --project PROJECT --port 5173
```

修改编辑器不需要安装 Creator。基础 skill 包专用于直接运行，完整开发环境位于源码包中。

## 修改脚本或播放器

修改 `src/core/` 或 `cocos-template/AvgPlayer.ts` 后，需使用 Cocos Creator 3.8.8 重建播放器。可以通过 `COCOS_CREATOR` 指定 Creator 可执行文件路径。

```sh
npm run engine:build
npm run minigames:build
npm run engine:verify
```

Web 构建结果位于 `public/engine/`；小游戏播放器位于 `kits/minigames/runtimes/`。构建会记录文件清单、哈希和源代码指纹，启动与导出检查播放器是否完整、是否与源代码一致。

添加指令通常需要同时修改关键词表、指令 schema、编译校验、运行调度、属性表单及 Cocos 演出。为新指令定义等待完成与取消行为，避免停止游戏后旧回调继续推进。

## 验证与打包

```sh
npm test
npm run minigames:test
npm run product:build
npm run product:verify
npm run distribution:test
```

最后一项使用 Python，解压真实发行包并验证独立启动和导出。界面修改还应在浏览器里检查实际排版与交互。

| 产物 | 用途 |
| --- | --- |
| `product/skill.zip` | 可直接运行的技能包，含构建后的编辑器、服务、引擎和示例，不要求安装 npm 依赖。 |
| `product/source.zip` | 完整工具源码与开发依赖锁文件，不包含 node_modules。 |
| `product/kit-minigames.zip` | 按需下载的微信、抖音小游戏导出工具包。 |
| `product/index.html`、`product/docs/` | 产品介绍和分层文档。 |

项目数据和工具发行包分开更新。发布新工具前，用现有作品检查读取、保存、预览和导出。
