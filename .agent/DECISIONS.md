# 当前有效决策

## 结构与优化范围

- 保持 Windows Electron main/renderer/renderer-lyric 和 Android `index.js → src/app.ts → React Native Navigation` 的现有目录结构。
- 保留全部 VisonCube Music 自定义功能，只移植原作者稳定修复并处理真实 lint、类型和明确死注释。
- 不实现历史 TODO，不抽取 Android 横竖屏歌词组件，不删除原作者受 Git 跟踪的调试或备份文件，不做大版本依赖升级。
- 双端共有问题必须同步处理，公共接口、同步协议、设置字段和默认行为保持兼容。

## 关闭策略

- `common.closeAction` 的取值保持 `ask | tray | quit`，首次关闭使用统一渲染层弹窗，可选择托盘或退出并记住选择。
- 选择托盘时自动启用托盘图标；应用退出、渲染层不可用等场景保留安全退出路径。

## 依赖与质量门禁

- 定制依赖只使用不可变 `deps-*` Release，不覆盖旧标签，不使用浮动 `current` 地址。
- 双端 `npm run lint` 必须以 `--max-warnings=0` 运行；不得通过关闭规则、跳过文件或吞异常制造通过。
- 本机不安装项目 `node_modules`，完整质量门禁在 Actions 执行。

## 版本、签名与发布

- 版本固定为双端 `2.13.5`，Android 基础 `versionCode=86`。
- `npm run publish` 只幂等同步 `publish/version.json`，不得修改 package 版本、增加 Android versionCode 或重复写 CHANGELOG。
- Windows 继续未签名 x64 发布并在说明中公开标注；Android 只接受既有证书指纹签名的 APK。
- 候选和正式发布分离；创建标签、GitHub Release、写入 COS、修改服务器清单均需在动作前单独确认。
- COS 电视安装包只在列出精确对象并再次确认后删除；不触碰 Music 历史对象、本地 TV 项目或源码目录。
