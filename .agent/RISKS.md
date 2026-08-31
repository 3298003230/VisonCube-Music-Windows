# 当前风险

- `D:\Code\VisonCube\依赖` 已不再需要，9 个定制 npm 包改由固定 GitHub Release 获取；但两个项目仍无 `node_modules`，系统和 Codex Node Runtime 均无 npm CLI，因此 ESLint、生产构建及真实 GUI/真机验收尚未运行。首次安装还依赖 GitHub 与 Gradle 官方分发网络，离线环境需预热标准 npm/Gradle 缓存。
- 关闭弹窗和托盘行为尚未在真实 Windows 桌面环境手工验收；应验证取消、记忆选择、托盘恢复/退出和无残留进程。

- 来源歌单同步和 Windows `2.13.2` 已部署并通过构建、清单、完整下载哈希与 Range 验证，但 Android/Windows 同账号首次合并、删除、本地歌曲保留、重试和冲突选择仍需完整运行验收。
- 从旧版本自动更新到 `2.13.2`、重启安装以及安装后不再重复提示更新，仍需在干净 Windows 测试环境完成。
- Windows `2.13.2` 安装包未配置 Authenticode 数字签名，干净系统可能显示未知发布者提示。
- GitHub `main` 已发布 `dcb854d8`；本地主分支因早期等价提交使用不同哈希仍与远端历史分叉。不得强推，后续工作应从远端 `main` 基线继续，或在 Git 传输恢复后执行正常历史汇合。
