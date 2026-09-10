# 当前有效决策

## 结构与优化范围

- 保持 Windows Electron main/renderer/renderer-lyric 和 Android `index.js → src/app.ts → React Native Navigation` 的现有目录结构。
- 保留全部 VisonCube Music 自定义功能，只移植原作者稳定修复并处理真实 lint、类型和明确死注释。
- 不实现历史 TODO，不抽取 Android 横竖屏歌词组件，不删除原作者受 Git 跟踪的调试或备份文件，不做大版本依赖升级。
- 双端共有问题必须同步处理，公共接口、同步协议、设置字段和默认行为保持兼容。
- 2026-09-09 起以原作者最新源码快照为双端 `src` 底座；仅合并品牌、账号、云同步、托管音源、自有更新、Android 包身份/签名配置和 Windows 关闭策略。2026-09-10 恢复此前已验证的 Windows 首屏路由竞争保护及双端设置分类，不恢复其他旧源码。
- 双端无封面占位使用 `V/C`；Android 启动器前景相对缩小 10%，Windows 应用图标相对放大 10%，托盘专用图标不随应用图标缩放。

## 关闭策略

- `common.closeAction` 的取值保持 `ask | tray | quit`，首次关闭使用统一渲染层弹窗，可选择托盘或退出并记住选择。
- 选择托盘时自动启用托盘图标；应用退出、渲染层不可用等场景保留安全退出路径。

## 用户许可

- Music 仅使用项目根目录的 `VisonCube-Music-许可协议.md` 作为用户可见许可源；安装页与双端首次协议显示相同正文。不得用 Music 协议覆盖 TV 或通用协议，也不得修改独立的 Apache、GPL、MIT 等第三方许可证。

## 依赖与质量门禁

- 定制依赖只使用不可变 `deps-*` Release，不覆盖旧标签，不使用浮动 `current` 地址。
- 双端 `npm run lint` 必须以 `--max-warnings=0` 运行；不得通过关闭规则、跳过文件或吞异常制造通过。
- 本机不安装项目 `node_modules`，完整质量门禁在 Actions 执行。

## 版本、签名与发布

- 版本固定为双端 `2.13.5`，Android 基础 `versionCode=86`。
- `npm run publish` 只幂等同步 `publish/version.json`，不得修改 package 版本、增加 Android versionCode 或重复写 CHANGELOG。
- Windows 继续未签名 x64 发布并在说明中公开标注；Android 只接受既有证书指纹签名的 APK。
- 候选和正式发布分离；创建标签、GitHub Release、写入 COS、修改服务器清单均需在动作前单独确认。
- 取消 GitHub Actions 直连 Music COS/服务器的生产同步 workflow；不得继续为该 workflow 申请或保存 COS Secret。
- 服务器 `releases.json` 的 Music 条目更新必须同时维护 `asset_path` 和显式下载字段；只改 `version`、`sha256` 或 `download_url` 会导致接口仍指向旧文件。
- COS 电视安装包只在列出精确对象并再次确认后删除；不触碰 Music 历史对象、本地 TV 项目或源码目录。
