# VisonCube Music Windows

## 项目概况

- 路径：`D:\Code\VisonCube\VisonCube-Music\Windows`。
- Electron 40.9.2、Vue 3、TypeScript、Webpack，使用 `electron-updater` 6.8.4。
- 当前源码发布版本为 `2.13.1`，Windows 安装包通过 `https://download.sjmf.xyz/VisonCube/Music/Windows` 分发。

## 更新链路

- 主进程 `src/main/modules/winMain/autoUpdate.ts` 从服务器 Music Windows 发布接口读取 `feed_url`，再以 generic provider 读取 `latest.yml`。
- 渲染进程 `src/renderer/core/useApp/useUpdate.ts` 接收更新事件并维护下载、错误和完成状态；更新弹窗位于 `src/renderer/components/layout/UpdateModal.vue`。
- Windows 安装包、`.blockmap` 和 `latest.yml` 必须保持在同一个 COS 目录。

## 构建入口

- 定向 lint：`.\node_modules\.bin\eslint.cmd <changed files>`。
- 主进程：`npm.cmd run build:main`。
- 渲染进程：`npm.cmd run build:renderer`。
