# 当前有效决策

## Windows 自动更新

- 保持 `autoUpdater.autoDownload = false`，由渲染进程在用户手动操作或 `common.tryAutoUpdate` 启用时显式发送下载 IPC。
- 主进程不得在更新器未激活时静默返回，必须通知渲染进程进入错误状态。
- 下载进度在每次新下载开始前清空；收到下载错误或完成事件时立即更新状态，避免界面永久显示“下载中”。

## 发布边界

- Windows 发布版本必须在 `package.json`、服务端 `releases.json` 和 COS `latest.yml` 中保持一致。
- COS 发布时仅上传新版本的安装包、对应 `.blockmap` 与 `latest.yml`，不得清理已有历史安装包。

## 来源歌单同步

- 仅同步同时具有 `source` 与 `sourceListId` 的来源歌单；普通手建、试听/临时/稍后播放列表和本地歌曲不进入云端。
- 使用 `/api/music/playlists` 的 revision/CAS、删除墓碑和 `operation_id` 幂等；应用云端顺序时保留本地歌曲，同时修改必须由用户在账号页选择本机或云端版本。
- 后端不可用时播放历史和收藏继续同步，并将歌单状态显示为部分成功；不得因构建通过宣称跨端运行流程已验收。
