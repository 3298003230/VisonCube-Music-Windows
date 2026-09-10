# 当前风险

- 2026-09-09 的源码底座还原尚未完成完整 CI：本机没有项目 `node_modules`，只能运行不依赖依赖的同步模型测试、语法与元数据校验；在提交、推送或发布前必须完成候选 lint、构建和真机验收。
- 双端源码目录没有 `node_modules`，本机只能运行不依赖项目包的语法、JSON、模型和元数据检查；完整 ESLint、Webpack、React Native 与 Gradle 验证依赖 Actions。Windows `e20e19a` 推送后的 CI 已通过；Android 本轮未改代码，未新触发 CI。
- Android 本机签名恢复目录当前不存在；当前已发布 universal APK 已用 `apksigner` 复验指纹，后续重新出包仍需通过候选构建、`apksigner` 指纹和 APK 元数据校验。
- Windows 安装包按维护者决定保持未签名，干净系统可能显示“未知发布者”。
- 2.13.5 已切换生产，仍需继续观察不同用户设备上的旧版自动更新、Android 覆盖安装和跨端来源歌单同步反馈。
- GitHub 直连 Music COS/服务器的生产同步 workflow 已取消；后续任何生产写入、服务器清单修改或 COS 删除仍需继续单独确认，且服务器清单必须同步 `asset_path`。
- COS 电视安装包对象的精确删除范围尚未核对；任何删除仍需先只读列出对象并再次确认。
- 加密签名备份位于公开仓库，安全性依赖恢复口令；恢复口令、JKS 和 Secret 不得写入源码、日志或 Artifact。
