# 当前风险

- 双端源码目录没有 `node_modules`，本机只能运行不依赖项目包的语法、JSON、模型和元数据检查；完整 ESLint、Webpack、React Native 与 Gradle 验证依赖 Actions。Windows `e20e19a` 推送后的 CI 已通过；Android 本轮未改代码，未新触发 CI。
- Android 本机签名恢复目录当前不存在；Actions Secret 的有效性只能由候选构建、`apksigner` 指纹和 APK 元数据校验确认。
- Windows 安装包按维护者决定保持未签名，干净系统可能显示“未知发布者”。
- Windows 关闭/托盘、旧版自动更新、Android 覆盖安装与跨端来源歌单同步尚未完成真实设备验收。
- GitHub 直连 Music COS/服务器的生产同步 workflow 已取消；后续任何生产写入、服务器清单修改或 COS 删除仍需重新设计流程并单独确认。
- COS 电视安装包对象的精确删除范围尚未核对；任何删除仍需先只读列出对象并再次确认。
- 加密签名备份位于公开仓库，安全性依赖恢复口令；恢复口令、JKS 和 Secret 不得写入源码、日志或 Artifact。
