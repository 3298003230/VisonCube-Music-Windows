# VisonCube Music Windows

## 项目概况

- 路径：`D:\Code\VisonCube\Music\Windows`（ZIP 已扁平解压，源码目录直接包含 `package.json`、`src`、`.agent`）。
- Electron 40.9.2、Vue 3、TypeScript、Webpack，使用 `electron-updater` 6.8.4。
- 当前源码发布版本为 `2.13.3`；本轮只优化源码，不生成安装包或发布产物。
- Windows 关闭策略由 `common.closeAction` 控制：`ask` 首次询问、`tray` 隐藏到系统托盘、`quit` 退出程序。

## 更新链路

- 主进程 `src/main/modules/winMain/autoUpdate.ts` 从服务器 Music Windows 发布接口读取 `feed_url`，再以 generic provider 读取 `latest.yml`。
- 渲染进程 `src/renderer/core/useApp/useUpdate.ts` 接收更新事件并维护下载、错误和完成状态；更新弹窗位于 `src/renderer/components/layout/UpdateModal.vue`。
- Windows 安装包、`.blockmap` 和 `latest.yml` 必须保持在同一个 COS 目录。

## 云同步

- `src/renderer/features/musicSync/` 负责播放历史、收藏和来源歌单同步；来源歌单通过鉴权接口 `/api/music/playlists` 使用 revision/CAS、删除墓碑和幂等操作编号。
- 仅同步具有 `source` 与 `sourceListId` 的来源歌单；普通手建、试听/临时/稍后播放列表和本地歌曲保持本机。应用云端歌单时保留本地歌曲，并在账号页提供重试、保留本机和采用云端操作。

## 构建入口

- Windows 5 个、Android 4 个定制 npm 包固定使用 `VisonCube-Music-Dependent` 的 `deps-2026-07-30-aeadf24` Release 直链，不再要求 `D:\Code\VisonCube\依赖`；Android Gradle Wrapper 使用 Gradle 官方 8.8 分发地址和固定 SHA-256。
- 定向 lint：`.\node_modules\.bin\eslint.cmd <changed files>`。
- 主进程：`npm.cmd run build:main`。
- 渲染进程：`npm.cmd run build:renderer`。
- 来源歌单模型测试：`npm.cmd run test:music-sync`。

## 云端构建

- Windows GitHub Actions `CI` run `33370107565` 已通过 npm ci、来源歌单测试、全量 ESLint 和完整 `npm run build`；后续提交使用仅检查改动源码文件的定向 lint，run `33370642949` 已再次全绿。
- Android GitHub Actions `CI` run `33369508808` 已通过 npm ci、来源歌单测试、Lint、JS bundle、Gradle Debug APK，并上传 7 天保留的 Debug Artifact。
- CI 使用固定 SHA 的 actions、Node 22、Java 17、npm/Gradle runner cache；正式 Release 工作流仅手动触发。
