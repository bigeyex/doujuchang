# AVG 小游戏导出工具包

这是 `skill.zip` 的独立可选工具包，包含微信小游戏、抖音小游戏的预编译 Cocos Engine 3.8.8 播放器。需要 Node.js 22+；无需 npm install、Cocos Creator 或把作品搬进工具包。

解压 `kit-minigames.zip` 后：

```text
node kit-minigames/export.mjs --doctor
node kit-minigames/export.mjs --project PROJECT --platform wechatgame --appid APPID
node kit-minigames/export.mjs --project PROJECT --platform bytedance-mini-game --appid APPID
```

PROJECT 使用用户项目空间中 AVG 作品的绝对路径，支持 v1 单文件和 v2 分文件配置。省略 --project 时读取当前工作目录。AppID 使用用户自己对应平台的小游戏 AppID；省略时微信生成游客模式工程，抖音留空，真机预览与发布仍需 AppID。

## 产物

默认写入作品的 `exports/`，每次生成新目录、ZIP 和 `.report.json` 体积报告。也可通过 `--output DIR` 指定导出父目录。

- 在微信开发者工具或抖音开发者工具中打开生成目录，项目类型选小游戏。工具包不包含这两个 IDE，也不会自动上传或代为发布。
- 主包包含固定播放器；`subpackages/story/` 包含展开后的项目 JSON、剧本正文和素材。立绘、背景、UI、音频使用平台文件/图片/音频接口；存档使用平台本地存储。
- 只复制配置登记的素材，不复制未登记原始图、AI 请求、旧导出。素材按内容哈希去重；稳定人物/背景/剧本 ID 不变。未实现自动压图或远程资源 CDN。
- 导出前检查剧本、绑定、项目内路径、播放器 SHA-256；输出体积超过平台预算时失败并清理本次临时目录。微信预算为主包 4 MiB、总包 30 MiB；抖音为主包 4 MiB、总包 20 MiB。平台规则以实际 IDE 检查为准。
- 横竖屏取自项目设置。用户修改普通配置和素材后直接再次导出，无需重编译播放器。自定义 Creator 组件与任意脚本扩展需要维护者重新构建运行时。

## 验证边界

播放器经 Cocos 官方对应平台构建；已验证独立导出、资源分包、存档/音频适配、完整性和包体检查。此环境未完成微信/抖音开发者工具及真机验证，上传前请用自己的 AppID 在对应 IDE 和设备检查字体、输入、音频与存读档。不要把导出成功说成已过审或已上线。

`source/` 保留小游戏播放器与平台适配源码，`src/core/` 是数据校验器，`runtimes/` 为已编译运行时，附 Cocos 许可证。工具仅读取源作品并新建导出，不修改创作文件。
