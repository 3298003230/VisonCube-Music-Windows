# 当前风险

- Windows CI #20 的 43 个 lint 问题已按完整日志修复；首个 2.13.5 候选因 CRLF 元数据解析失败，修复提交尚未通过新一轮 Actions 复验。
- 双端源码目录没有 `node_modules`，本机只能运行不依赖项目包的语法、JSON、模型和元数据检查；完整 ESLint、Webpack、React Native 与 Gradle 验证依赖 Actions。
- Android 本机签名恢复目录当前不存在；Actions Secret 的有效性只能由候选构建、`apksigner` 指纹和 APK 元数据校验确认。
- Windows 安装包按维护者决定保持未签名，干净系统可能显示“未知发布者”。
- Windows 关闭/托盘、旧版自动更新、Android 覆盖安装与跨端来源歌单同步尚未完成真实设备验收。
- Music COS、服务器部署凭据和电视安装包对象的精确删除范围尚未核对；任何生产写入或删除仍需单独确认。
- 加密签名备份位于公开仓库，安全性依赖恢复口令；恢复口令、JKS 和 Secret 不得写入源码、日志或 Artifact。
