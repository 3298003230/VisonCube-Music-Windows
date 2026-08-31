# 当前风险

- `D:\Code\VisonCube\依赖` 已不再需要，9 个定制 npm 包改由固定 GitHub Release 获取；GitHub Actions 已验证 npm ci、ESLint、Windows bundle、Android JS bundle 和 Debug APK。两个项目本机仍无 `node_modules`，未执行本地构建；首次安装依赖 GitHub 与 Gradle 官方分发网络，离线环境需预热标准 npm/Gradle 缓存。
- 关闭弹窗和托盘行为尚未在真实 Windows 桌面环境手工验收；应验证取消、记忆选择、托盘恢复/退出和无残留进程。

- 来源歌单同步和 Windows `2.13.2` 已部署并通过构建、清单、完整下载哈希与 Range 验证，但 Android/Windows 同账号首次合并、删除、本地歌曲保留、重试和冲突选择仍需完整运行验收。
- 从旧版本自动更新到 `2.13.2`、重启安装以及安装后不再重复提示更新，仍需在干净 Windows 测试环境完成。
- Windows `2.13.2` 安装包未配置 Authenticode 数字签名，干净系统可能显示未知发布者提示。
- GitHub Actions 当前未配置 Android Release 所需的 5 个签名 Secret；Release workflow 现会在构建前明确失败，正式发布前必须由维护者在仓库设置中补齐，值不会写入源码。
- Windows Beta 候选包只存在于 GitHub Artifact，尚未安装到真实桌面验收；候选包不等同于生产更新包。
- 服务器公网接口和 COS 对象已只读核对，但本地没有服务器 SSH 凭据，无法直接审查远端部署脚本；本轮未执行任何生产上传或清单修改。
- GitHub 双端 `main` 已同步最新普通提交（Windows `586f5646`，Android `5e453035`）；本地解压目录不是 Git 工作树，后续修改需先读取远端 `main` 头并使用非强制更新。
