# 当前有效决策

## 2026-10-27 媒体封面与图标一致性

- Windows 系统媒体封面更新必须绑定当前歌曲 ID、封面 URL 和更新代次，异步图片回调不得覆盖后续歌曲；系统媒体信息继续由现有 Media Session 接线提供。
- Windows 默认托盘图标与 Music 深色 V/J 主图形保持品牌一致，但继续使用独立小尺寸资源和现有 ICO/PNG 回退；用户选择的其他托盘主题不被迁移。
- Android 自适应启动器前景保持深色 Music V/J 图形居中，移除会导致不同启动器偏移的额外平移；包名、签名和资源目录保持不变。

## 2026-09-29 2.13.9 与统一域名

- Windows/Android 正式版本统一为 `2.13.10`，Android 基础 `versionCode=92`；生产源码提交和发布记录以各端 `PROGRESS.md` 的 2.13.10 条目为准。
- 认证与更新 API 使用 `https://linux.visoncube.cn`，公开安装包及 Windows 更新元数据使用 `https://download.visoncube.cn`。旧域名只保留给历史客户端兼容，新源码和新发布元数据不得再生成旧域名链接。
- 继续使用候选 Actions 构建和验证；生产文件由维护端上传 COS，服务器发布清单原子更新，GitHub Actions 不直接写生产 COS 或服务器。

## 2026-09-11 2.13.7 回归修复范围

- Windows 更新只接受由自有 HTTPS 发布接口返回并通过校验的 `feed_url`，默认 `updates.invalid` 仍保留为拒绝失配配置的安全回退；关闭快捷键必须调用与标题栏、Alt+F4 相同的 `closeWindow()` 路径。
- 双端须同时兼容 `lxmusic://` 与 `visoncubemusic://`；Android 安装桥接只能从运行时包名派生 Provider authority，并对未知来源授权、安装 Intent 和 Provider 失败提供可重试的可见反馈。
- Android 单曲 URL 清理按既有“歌曲 ID + 音质”缓存键删除全部该歌曲音质，不修改全局缓存格式；旧 URL 可用性预检不恢复，避免额外 Range 请求造成播放等待。

## 结构与优化范围

- 保持 Windows Electron main/renderer/renderer-lyric 和 Android `index.js → src/app.ts → React Native Navigation` 的现有目录结构。
- 保留全部 VisonCube Music 自定义功能，只移植原作者稳定修复并处理真实 lint、类型和明确死注释。
- 不实现历史 TODO，不抽取 Android 横竖屏歌词组件，不删除原作者受 Git 跟踪的调试或备份文件，不做大版本依赖升级。
- 双端共有问题必须同步处理，公共接口、同步协议、设置字段和默认行为保持兼容。
- 普通用户歌单使用保留的远端来源 `visoncube-user` 与本地稳定歌单 ID 同步；新版远端恢复时不把该标识写入本地歌单的 `source/sourceListId`，避免被误当成可刷新的平台来源歌单，同时兼容旧客户端已生成的保留来源元数据。本地歌曲继续不上传，云端删除时仍保留本地歌曲。
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

- 更新回归修复已正式发布为双端 `2.13.7`、Android 基础 `versionCode=89`；用于验证升级链路的 2.13.6 修复包使用基础 `versionCode=88`，未覆盖既有 2.13.6 标签或 Release。
- `npm run publish` 只幂等同步 `publish/version.json`，不得修改 package 版本、增加 Android versionCode 或重复写 CHANGELOG。
- Windows 继续未签名 x64 发布并在说明中公开标注；Android 只接受既有证书指纹签名的 APK。
- 候选和正式发布分离；创建标签、GitHub Release、写入 COS、修改服务器清单均需在动作前单独确认。
- 取消 GitHub Actions 直连 Music COS/服务器的生产同步 workflow；不得继续为该 workflow 申请或保存 COS Secret。
- 服务器 `releases.json` 的 Music 条目更新必须同时维护 `asset_path` 和显式下载字段；只改 `version`、`sha256` 或 `download_url` 会导致接口仍指向旧文件。
- Android APK 生产下载使用 `https://download.visoncube.cn` 自定义域名，不使用会返回 `DownloadForbidden` 的 COS 默认域名。
- 2026-10-12 用户确认恢复“退出账号保留音源”：退出仅清会话、停止云同步并尝试服务端撤销，不删除音源、清缓存或切换当前音源。此前“退出账号即清缓存”决策已失效；手动删除仍彻底清缓存，重新更新/导入才能恢复，缓存归属及哈希校验不放宽。切换其他账号可能需要重新更新订阅源；普通自定义音源不受影响。
- COS 电视安装包只在列出精确对象并再次确认后删除；不触碰 Music 历史对象、本地 TV 项目或源码目录。

## 2026-09-10 对外展示收敛

- 用户可见和公开仓库的品牌文本统一为 VisonCube Music；更新记录只保留当前 VisonCube Music 版本说明，不再向用户展示旧项目导向。
- 顶层 LICENSE、第三方许可证、版权归属及 `lxmusic` 协议、数据目录等兼容标识不改名，避免违反许可证或破坏已有数据和链接。
