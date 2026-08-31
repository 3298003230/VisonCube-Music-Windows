# 当前有效决策

## 2026-08 固定远程构建依赖

- 双端 9 个定制 `.tgz` 使用公开且约定不可变的 GitHub Release 标签 `deps-2026-07-30-aeadf24`，`package.json` 与 `package-lock.json` 同时固定完整下载地址和 npm SHA-512；不得用可替换的 `current` 地址作为源码依赖。
- 固定 Release 由依赖仓库标准位置 `.github/workflows/publish-direct-npm-assets.yml` 在 GitHub Runner 中从已校验的离线大包提取，发布前核对大包 SHA-256、包名、版本和每包 SHA-512。本机不保存 `D:\Code\VisonCube\依赖`。
- Android Gradle Wrapper 使用官方 `gradle-8.8-all.zip` 地址，并固定官方 SHA-256；首次安装需要网络，后续可复用 npm/Gradle 缓存。应用版本、Electron 版本和依赖包版本均不因此改变。

## 2026-08 关闭策略与上游修复

- 首次关闭通过渲染层 `CloseConfirmModal` 选择退出或隐藏到系统托盘，可勾选记住选择；标题栏、Alt+F4 和关闭快捷键统一走同一 IPC 流程。弹窗组件挂载后发送专用就绪握手，确保登录页与主界面行为一致。
- `common.closeAction` 默认 `ask`；旧配置启用 `tray.enable` 时迁移为 `tray`，其他缺失或非法值迁移为 `ask`。选择托盘会自动启用托盘图标。
- 双端移植稳定上游修复：版本关键词换源匹配、IEC 容量单位、歌词毫秒解析、QQ 歌单总数；Windows 追加/移动顺序修复，Android QQ 回退和错误歌曲 URL 缓存清理入口。双端 MG 图片、歌词和歌曲 ID 统一使用 `songmid` 查询；Windows MG 歌词同步毫秒格式；旧配置迁移保留扁平 `tray.enable`。
- 本轮不升级 Electron 40.9.2、不替换 Android 本地 `react-native-track-player`，不改版本号、不构建或发布安装包/APK。
- 追加移植 2026-08-23 上游繁中窗口尺寸文案修复；不移植仅调整语言展示顺序的提交，因为当前定制版语言集合不同且无功能收益。

## Windows 自动更新

- 保持 `autoUpdater.autoDownload = false`，由渲染进程在用户手动操作或 `common.tryAutoUpdate` 启用时显式发送下载 IPC。
- 主进程不得在更新器未激活时静默返回，必须通知渲染进程进入错误状态。
- 下载进度在每次新下载开始前清空；收到下载错误或完成事件时立即更新状态，避免界面永久显示“下载中”。

## 发布边界

- Windows 发布版本必须在 `package.json`、服务端 `releases.json` 和 COS `latest.yml` 中保持一致。
- COS 发布时仅上传新版本的安装包、对应 `.blockmap` 与 `latest.yml`，不得清理已有历史安装包。
- 两端 `release.yml` 仅允许手动触发，默认 `publish_release=false`：只生成候选 Artifact，绝不创建标签、GitHub Release、COS 对象或服务器清单；只有维护者手动明确设为 `true` 才进入正式发布路径。
- 正式发布前先以候选 Artifact 完成真实设备验收，再配置并预检 Android 五个签名 Secret、Windows `BT_TOKEN` 和 COS 环境凭据。`COS` 上传工具仅接受白名单产物，服务器 `releases.json` 的备份与原子替换仍须由具备服务器权限的发布流程执行。

## 来源歌单同步

- 仅同步同时具有 `source` 与 `sourceListId` 的来源歌单；普通手建、试听/临时/稍后播放列表和本地歌曲不进入云端。
- 使用 `/api/music/playlists` 的 revision/CAS、删除墓碑和 `operation_id` 幂等；应用云端顺序时保留本地歌曲，同时修改必须由用户在账号页选择本机或云端版本。
- 后端不可用时播放历史和收藏继续同步，并将歌单状态显示为部分成功；不得因构建通过宣称跨端运行流程已验收。

## 2026-08 首次启动页面切换

- 上次页面恢复必须在路由 ready 后进行，并在异步读取前后校验当前路由；用户已切换到设置、歌单或其他页面时不再恢复旧页面。使用 `router.replace()`，不额外污染浏览历史。
