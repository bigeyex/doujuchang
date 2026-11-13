# 基本命令行

以下命令以解压后的技能目录 `avg-maker/` 为工作目录，要求 Node.js 22+。`PROJECT` 替换为作品的绝对路径，路径含空格时加引号。工具和作品分开保存，所有作品命令显式传入同一个 `--project`。

## 检查环境

```sh
node scripts/avg.mjs doctor
```

检查 Node 版本和随包引擎文件。基础技能已经带有可运行编辑器与服务，无需 `npm install` 或 `npm ci`。要开发编辑器，请下载独立源码包。

## 创建与打开

```sh
node scripts/avg.mjs init --project PROJECT --language zh
node scripts/avg.mjs serve --project PROJECT --port 5173
```

`init` 复制校园示例到新目录，不覆盖已有作品。`serve` 输出本机 URL，默认使用已构建编辑器。保持服务进程运行，在浏览器中打开该 URL；同一端口被占用时选择其他端口。

服务仅监听本机地址。素材与导出内容来自指定作品目录，不要将工具目录当作作品目录。

## 检查作品

```sh
node scripts/avg.mjs check --project PROJECT
```

检查剧本编译、资源引用、变量与界面绑定等，并确认资源文件存在。失败时输出脚本、行号和消息，进程以非零状态退出。修正后重新检查，再在预览里验证交互。

## 导出

```sh
node scripts/avg.mjs export --format web --project PROJECT
node scripts/avg.mjs export --format creator --project PROJECT
```

每次在作品的 `exports/` 中创建新目录和 ZIP，并输出实际位置。

| 格式 | 产物 | 如何使用 |
| --- | --- | --- |
| web | 游戏网页、内置引擎、配置与素材 | 部署到静态网站，或在导出目录运行 `node serve.mjs`，打开输出的地址。 |
| creator | Cocos Creator 3.8.8 工程 | 用匹配版本 Creator 打开，继续开发或构建平台版本。 |

Web 游戏通过 HTTP 运行，不使用 `file://`。生成 Creator 工程本身无需安装 Creator，后续编辑和构建才需要它。小游戏导出见[专用工具包](minigames.md)。

## 迁移旧项目

```sh
node scripts/avg.mjs migrate --project PROJECT
```

将旧的单文件配置拆分为当前项目结构，保留剧本和素材。迁移前备份整个作品目录；迁移后检查和预览。

## 处理立绘生成请求

```sh
node scripts/avg.mjs requests --project PROJECT
node scripts/avg.mjs complete-request --id ID --file IMAGE --name 表情 --project PROJECT
```

`requests` 列出编辑器提交的待处理请求。完成实际图像生成后，使用请求 ID 和图片路径逐张导入；工具会登记表情并更新请求结果。此接口不自行生成图片。

## 备份与共享

复制整个作品目录即可继续编辑，至少保留 `project.json`、`config/`、`scripts/`、`story-assets/` 与 `schema/`。`exports/` 可以重新生成；浏览器游玩存档不代替创作源文件。
