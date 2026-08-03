# 当前进度

## 2026-08-03 Windows 更新状态修复与 2.13.1 发布候选

- 修复自动下载设置只显示“下载中”而未实际发送下载 IPC 的问题。
- 修复更新器不可用时静默返回的问题，并在下载错误或完成时立即同步界面状态。
- 源码版本已提升至 `2.13.1`，并构建 x64 NSIS 安装包、`.blockmap` 与 `latest.yml`。
- `latest.yml` 指向 `VisonCube-Music-v2.13.1-x64-Setup.exe`，其 SHA-512 已与安装包核对一致；安装包 SHA-256 为 `F33BE5B16263A2886FF518534C468DC5B1F1AA4ECE46877D44017366E8CE3E6C`。
- `2.13.0` 安装包已硬链接备份到 `D:\Code\VisonCube\exports\VisonCube-Music-v2.13.0-x64-Setup.exe`。
- 定向 lint 与 `npm.cmd run pack:win:setup:x64` 通过。

## 下一步

- 将 `2.13.1` 安装包、`.blockmap` 与 `latest.yml` 上传至 COS 的 `VisonCube/Music/Windows/`，必须保留 `2.13.0` 对象。
- 上传后将同一版本、文件路径与 SHA-256 部署至生产服务器 `releases.json`，重启服务并检查 API、`latest.yml` 和 HTTP Range。
- 在真实旧版本客户端上完成发现、下载、完成与重启安装验证。
