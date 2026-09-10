# 当前风险

- 双端源码目录没有 `node_modules`；当前 Windows `7822954` 与 Android `443c4ce` 已通过 Actions 源码 CI，但后续修改仍需由 Actions 执行完整 ESLint、Webpack、React Native 与 Gradle 验证。
- 还原后的双端源码尚未生成候选安装包并完成真机回归；账号登录与会话恢复、云同步、托管音源、Windows 关闭/托盘以及 Android 覆盖安装仍需候选包验证。
- Android 本机签名恢复目录当前不存在；当前已发布 universal APK 已用 `apksigner` 复验指纹，后续重新出包仍需通过候选构建、`apksigner` 指纹和 APK 元数据校验。
- Windows 安装包按维护者决定保持未签名，干净系统可能显示“未知发布者”。
- 2.13.5 已切换生产，仍需继续观察不同用户设备上的旧版自动更新、Android 覆盖安装和跨端来源歌单同步反馈。
- GitHub 直连 Music COS/服务器的生产同步 workflow 已取消；后续任何生产写入、服务器清单修改或 COS 删除仍需继续单独确认，且服务器清单必须同步 `asset_path`。
- COS 电视安装包对象的精确删除范围尚未核对；任何删除仍需先只读列出对象并再次确认。
- 加密签名备份位于公开仓库，安全性依赖恢复口令；恢复口令、JKS 和 Secret 不得写入源码、日志或 Artifact。
