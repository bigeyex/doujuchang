# 小游戏导出工具包

小游戏导出按需下载 [kit-minigames.zip](https://wangyu.tech/avg/kit-minigames.zip)，与基础 `skill.zip` 分开。包含微信和抖音的 Cocos 3.8.8 预编译播放器，用户无需安装 Creator 或为工具包安装 npm 依赖。

## 导出

解压后，在终端运行，PROJECT 换成 Agent 项目空间内作品的绝对目录：

```text
node kit-minigames/export.mjs --doctor
node kit-minigames/export.mjs --project PROJECT --platform wechatgame --appid APPID
node kit-minigames/export.mjs --project PROJECT --platform bytedance-mini-game --appid APPID
```

AppID 使用对应平台自己的小游戏账号。微信省略 AppID 时可生成游客工程；真机与发布仍需有效 AppID。导出目录、ZIP 和体积报告位于作品的 exports/，每次生成新目录；`--output DIR` 可改父目录。

把生成目录导入微信开发者工具或抖音开发者工具。此处的目标是小游戏，普通小程序不是同一发布格式。开发者工具、账号、上传和审核不包含在本工具包中。

## 包体与素材

播放器在主包，故事配置、剧本和素材在 `subpackages/story/`。工具只打包配置登记的资源，按内容哈希去重，不带未登记原始图、旧导出和 AI 请求。现阶段不自动压图，也不要求部署 CDN。

体积报告检查主包和总量。导出器预设预算为：微信主包 4 MiB / 总包 30 MiB，抖音主包 4 MiB / 总包 20 MiB；超过预算会停止导出并说明原因。这些是工具的检查阈值，实际发布限制以平台最新规则和开发者工具为准。详见 [Cocos 小游戏分包文档](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/subpackage.html)。

修改文字、立绘、背景、界面或方向后，重新导出即可。原始作品仍保留在用户项目空间；工具不会回写创作配置。

## 发布前检查

导出后，在对应开发者工具中使用自己的 AppID 检查字体、输入、音频、存读档和设备方向，再进行真机测试。导出不会自动上传、提交审核或发布。

## 视频

MP4 按 videos.json 清单打入故事分包，使用与 Web 相同的 `[视频 ID]` 阻断指令。预编译播放器包含 Cocos 平台视频模块；暂停、结束、取消跟随会话。平台对音量、跳过和编码的支持有差异，最终需在各开发者工具与真机检查；视频会占用分包预算，超限时导出器报错。
