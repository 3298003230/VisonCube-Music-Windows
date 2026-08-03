# 当前有效决策

## Windows 自动更新

- 保持 `autoUpdater.autoDownload = false`，由渲染进程在用户手动操作或 `common.tryAutoUpdate` 启用时显式发送下载 IPC。
- 主进程不得在更新器未激活时静默返回，必须通知渲染进程进入错误状态。
- 下载进度在每次新下载开始前清空；收到下载错误或完成事件时立即更新状态，避免界面永久显示“下载中”。

## 发布边界

- Windows 发布版本必须在 `package.json`、服务端 `releases.json` 和 COS `latest.yml` 中保持一致。
- COS 发布时仅上传新版本的安装包、对应 `.blockmap` 与 `latest.yml`，不得清理已有历史安装包。
