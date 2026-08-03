# 当前进度

## 2026-08-03 Windows 更新状态修复与 2.13.1 线上发布

- 修复自动下载设置只显示“下载中”而未实际发送下载 IPC 的问题。
- 修复更新器不可用时静默返回的问题，并在下载错误或完成时立即同步界面状态。
- 源码版本已提升至 `2.13.1`，并构建 x64 NSIS 安装包、`.blockmap` 与 `latest.yml`。
- `latest.yml` 指向 `VisonCube-Music-v2.13.1-x64-Setup.exe`，其 SHA-512 已与安装包核对一致；安装包 SHA-256 为 `F33BE5B16263A2886FF518534C468DC5B1F1AA4ECE46877D44017366E8CE3E6C`。
- `2.13.0` 安装包已硬链接备份到 `D:\Code\VisonCube\exports\VisonCube-Music-v2.13.0-x64-Setup.exe`。
- 定向 lint 与 `npm.cmd run pack:win:setup:x64` 通过。
- 已将 `2.13.1` 安装包、`.blockmap` 与 `latest.yml` 发布到 COS 的 `VisonCube/Music/Windows/`；公网清单、HTTP Range 和完整安装包 SHA-256 均已核验。
- 生产服务器已原子更新 `music-windows` 条目，备份为 `/home/ubuntu/ServerCode/VisonCube/update/releases.json.bak-20260803T160421+0800`；线上发布 API 已返回 `2.13.1` 与正确的下载、更新源地址。

## 下一步

- 在真实旧版本客户端上完成发现、下载、完成与重启安装验证。
