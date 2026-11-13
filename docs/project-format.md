# 项目结构

把作品放进独立项目目录，如 `workspace/my-story/`；技能目录仅保存工具。首次使用 `init --project <作品目录>` 复制示例，后续所有命令明确传入同一目录，或以该目录为工作目录。文件均为 UTF-8；配置是 JSON，剧本是可解析的 `.avg` 标签文本，图片/音视频保留原文件并由配置引用。

```text
my-story/
  project.json                  项目名称、画幅、开始/游戏界面、配置文件索引
  config/
    variables.json              全局变量声明与默认值
    characters.json             人物、立绘、脸部中心、构图与顺序
    backgrounds.json            背景、图片变换与转场
    audio.json                  音频/音效/BGM 清单
    videos.json                 MP4 视频清单
    screens.json                页面、控件、坐标、绑定与按钮事件
    theme.json                  纸纹路径与界面配色
  scripts/
    index.json                  有序剧本清单；第一项为入口
    main.avg                    标签剧本
    ...
  story-assets/
    characters/<人物ID>/        半身 PNG、各表情
    backgrounds/                场景图
    audio/                      音乐、音效
    videos/                     MP4 视频
    ui/                         纹理、图标、界面图片
    source/                     可选的原始素材
  schema/project.schema.json    配置结构，$defs 对应各类配置
  .avg/requests/                编辑器提交的 AI 请求 JSON（按需生成）
  exports/                     可重新生成的 Web / Creator 导出（按需生成）
```

## 项目入口

`project.json` 是唯一入口；`files` 指向实际配置。所有路径相对作品根目录，使用 `/`，不可指向技能目录、绝对路径或 `..` 外部文件。

```json
{
  "$schema": "schema/project.schema.json",
  "schemaVersion": 2,
  "id": "my-story",
  "name": "我的故事",
  "display": {"orientation": "portrait", "shortEdge": 720, "longEdge": 1280},
  "startScreen": "title",
  "defaultScreen": "game",
  "files": {
    "scripts": "scripts/index.json",
    "variables": "config/variables.json",
    "characters": "config/characters.json",
    "backgrounds": "config/backgrounds.json",
    "audio": "config/audio.json",
    "videos": "config/videos.json",
    "screens": "config/screens.json",
    "theme": "config/theme.json"
  }
}
```

## 改什么，读哪个文件

| 需求 | 文件与关键字段 |
| --- | --- |
| 改剧本/入口顺序 | `scripts/index.json` 的 `{id,name,path}` 数组；正文位于对应 `.avg`。数组不自动串联执行。 |
| 新增变量 | `config/variables.json` 的 `"attr.health":{"type":"number","default":30}`；类型仅 number / boolean / string，路径不能与父节点重复声明。 |
| 新增人物/表情 | `config/characters.json` 数组，人物 `{id,name,color,poses}`；立绘见下例。第一张为默认，也用来裁切头像。 |
| 改背景 | `config/backgrounds.json` 的 `{id,name,image,rect,transition,duration}`；rect 为图片相对画幅的中心 x/y 和宽高 w/h，可超出 0–1 并由画幅裁剪；时长为秒。旧 fit/focus 配置仍可读取。 |
| 新增音频 | `config/audio.json` 的 `{id,name,file,kind,volume}`；kind 为 audio / sound / bgm，volume 为可选的 0–1 默认音量；文件放在 `story-assets/audio/`。 |
| 新增视频 | `config/videos.json` 的 `{id,name,file,volume}`；MP4 放在 `story-assets/videos/`，剧本用 `[视频 ID]` 播放。 |
| 改界面/按钮 | `config/screens.json` 数组：页面 `{id,name,kind,controls}`，kind 为 base / popup；popup 有 title，开始页可指定 background ID。 |
| 改对话框 | `config/screens.json` 中 game 页的 dialogue：`x,y,w,h,fontSize,color,background,opacity`。 |
| 改主题 | `config/theme.json` 的 `{paper,panel,ink,accent}`；paper 为图片路径，其余为颜色。 |

```json
{
  "id": "normal", "name": "坚定",
  "image": "story-assets/characters/lin/normal.png",
  "framing": "bust", "faceCenter": {"u": 0.59, "v": 0.28},
  "crop": 0.32, "scale": 1
}
```

立绘默认为上半身透明 PNG，framing 为 bust（旧全身可用 full）。faceCenter 是图像左上原点、鼻子附近的归一化坐标；crop 为头像裁切比例。切换表情时按脸部中心对齐。

```json
{
  "id": "train", "name": "练习", "type": "button", "text": "练习一次",
  "x": 0.5, "y": 0.6, "w": 0.7, "h": 0.065,
  "color": "#f4eddf", "textColor": "#453d36", "fontSize": 27,
  "enabled": "attr.health >= 10",
  "actions": [{"type": "call", "target": "training"}]
}
```

控件类型：text / button / image / panel / progress / slider / toggle / input / history。坐标 x/y 是控件中心、左上原点，w/h 是画幅比例；字号按参考像素。progress / slider 使用表达式字符串 value、max；slider / toggle / input 的 bind 必须是已声明的可写变量路径。text 可插入 `{attr.health}`；visible / enabled 为布尔表达式。按钮 actions 依次执行 call / popup / close / switch / start / save / load / history；call 的 target 是剧本 ID，popup / switch 的 target 是页面 ID。

旧 v2 未配置 files.videos 时视为空视频清单；编辑器下一次保存会补上配置文件。音频 kind 只用于分类，sound/music 均按资源 ID 引用。

## 直接编辑与版本迁移

- 显示名称可以改，稳定 ID 被剧本/界面引用，改 ID 时同步引用。
- 新资源先保存到作品内，再登记清单；不要把宿主临时生成路径写进项目。目录可整体复制迁移。
- 编辑器会检测外部修改；保存配置/剧本后，编辑器无未保存改动时自动载入，有冲突时保留双方版本供选择。
- 完成修改运行 `check --project <目录>`，交互在“预览”页检查。预览变量和浏览器存档不改变项目默认配置；项目无需依赖浏览器缓存才能编辑或运行。
- 旧 schemaVersion 1 的单文件项目继续可读写；`migrate --project <目录>` 可拆分为 v2，不改变剧本和素材。导出运行包会生成自包含的扁平运行配置，不作为创作源文件回写。

## 图片控件与对白组合

控件 image 代替背景颜色；按钮可另设 hoverImage / pressedImage / disabledImage，开关用 onImage / offImage，进度条或滑条用 trackImage / fillImage。图片均为项目内路径，导出时一起收集。对话框可设 image；dialogue.speaker 和 dialogue.text 各自保存 x/y/w/h、fontSize、color、可选 image，位置尺寸相对父对话框，四角缩放保持比例。history 控件显示运行时历史，不把历史文本写进创作配置。

背景另存 reference:{width,height} 记录编辑时的参考画幅；切换横竖屏时按同一缩放比例转换 rect，保留素材比例并继续裁剪。
