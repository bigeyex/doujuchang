---
name: avg-maker
description: 创作、编辑和预览文字冒险（AVG）及轻养成游戏，支持可视化编辑、中文剧本、Cocos 播放与游戏导出。
---

# 豆剧场 AVG Maker

## 启动与交付

作品放在用户的项目空间，工具留在技能目录。需要 Node.js 22+；已带构建好的编辑器、启动服务和 Cocos 引擎，无需安装依赖或 Creator。以下命令相对本技能目录执行，PROJECT 为作品绝对路径：

```text
node scripts/avg.mjs init --project PROJECT --language zh
node scripts/avg.mjs serve --project PROJECT --port 5173
node scripts/avg.mjs check --project PROJECT
```

中文环境优先使用中文关键词及人物、背景、变量、剧本等标识符；init 的 --language zh 创建全中文引用示例，其他语言可省略。已有项目保留稳定 ID，修改 ID 要同步引用。

创作完成先在编辑器内给用户预览，优先使用宿主 AI 的内置浏览器或预览工具打开实际输出的 URL，并保持服务运行。不要在初次创作交付时自行打包 ZIP；用户需要导出时再导出。用户说“启动编辑器”时，恢复同一项目服务并重新打开页面。

## 修改作品

入口 project.json；配置在 config/{characters,backgrounds,audio,videos,screens,variables,theme}.json；剧本列表 scripts/index.json 的首项为入口，正文为 .avg；素材放 story-assets/，使用项目内相对路径。编辑器自动保存并检测外部修改。按任务需要读取 [项目格式](references/project-format.md) 或 [脚本格式](references/script-system.md)，无需一次加载全部参考。

对白写“人物ID: 文本”，演出用中文标签，例如 [显示 林夏 位置=左侧]。所有变量为已声明全局变量，文本使用 {变量} 插值。jump 与 call/return、循环和弹窗均按顺序等待。

AI 立绘默认透明半身图；参考已有立绘保留人物身份、画布、位置和服装，只改表情。编辑器的“交给 Agent”可能只保存请求，实际生成需调用宿主可用的图像工具。请求处理入口：

```text
node scripts/avg.mjs requests --project PROJECT
node scripts/avg.mjs complete-request --id ID --file IMAGE --name 表情 --project PROJECT
```

## 导出与扩展

编辑器“导出”支持 Web、Creator、微信与抖音小游戏，小游戏组件首次使用自动下载。命令行 Web/Creator：

```text
node scripts/avg.mjs export --format web --project PROJECT
node scripts/avg.mjs export --format creator --project PROJECT
```

产物在作品 exports/。Web 包通过网页服务运行；生成 Creator 工程无需 Creator，继续编辑/原生构建才需 Creator 3.8.8。小游戏手动工具用法见 [小游戏](references/minigames.md)。修改编辑器或引擎逻辑时下载 [source.zip](https://wangyu.tech/avg/source.zip)，构建说明按需读 [引擎分发](references/runtime-distribution.md)。
