export const docGroups=[
 {id:'quick',title:'快速入门',description:'安装、认识界面、改第一句对白并导出。',entry:'getting-started',pages:[{slug:'getting-started',title:'快速入门',description:'跟着图解，完成第一幕。'}]},
 {id:'guide',title:'使用指南',description:'用图片和操作步骤学习各个编辑器。',entry:'editor-guide',pages:[
  {slug:'editor-guide',title:'使用指南',description:'认识工作区、保存与协作方式。'},
  {slug:'writing-story',title:'撰写剧本',description:'对白、演出、分支与中文剧本案例。'},
  {slug:'characters',title:'人物与立绘',description:'导入、脸部对齐与表情生成。'},
  {slug:'backgrounds',title:'背景',description:'取景、缩放、裁剪与转场。'},
  {slug:'media',title:'音视频',description:'整理、试听和安排音乐、音效、视频。'},
  {slug:'interfaces',title:'界面设计',description:'控件、排版、图片状态与交互。'},
  {slug:'project-settings',title:'项目设置',description:'横竖屏、作品名称与初始数值。'},
  {slug:'preview',title:'预览与测试',description:'试玩、检查分支、历史与存档。'},
  {slug:'export-guide',title:'导出与分享',description:'网页版、小游戏和可继续编辑的作品。'}]},
 {id:'technical',title:'技术参考',description:'项目文件、命令行、架构和完整语法。',entry:'technical-reference',pages:[
  {slug:'technical-reference',title:'技术参考',description:'按开发任务查找参考。'},
  {slug:'project-format',title:'项目结构',description:'分文件配置、资源路径与数据字段。'},
  {slug:'command-line',title:'基本命令行',description:'创建、启动、检查、迁移与导出。'},
  {slug:'architecture',title:'架构',description:'编辑器、服务、脚本内核与 Cocos。'},
  {slug:'script-system',title:'详细脚本格式',description:'所有指令、参数、表达式与运行语义。'},
  {slug:'development',title:'源码与构建',description:'扩展编辑器和播放器，构建与打包。'},
  {slug:'minigames',title:'小游戏导出',description:'独立工具包、产物布局与发布检查。'}]}
];
export const docPages=docGroups.flatMap(group=>group.pages.map(page=>({...page,group:group.id,groupTitle:group.title})));
