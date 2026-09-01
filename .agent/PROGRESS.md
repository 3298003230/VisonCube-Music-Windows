# 当前进度

## 2026-09-01 2.13.5 收敛

- 已确认远端基线：Windows `a21cd7cad9a2c372e34f06098d7d168d75d4614b`，Android `6a1baa43d1378fc543ca3c66213874e0f51e02c7`；两个本地源码目录仍不包含 `.git`。
- 当前 13 个既有本地差异已复制到 `C:\Users\L\AppData\Local\Temp\visoncube-2.13.5-baseline-20260901`，并保存双端补丁与 SHA-256 清单依据。
- 保留 Windows 入口死注释清理、Android 示例入口与废弃导航注释清理，以及双端歌词请求类型包装收敛。
- 双端 lint 脚本已增加 `--max-warnings=0`。
- 已读取 Windows CI #20 的完整 lint 日志：共 43 个错误、0 个警告，其中 38 个为 `@typescript-eslint/no-floating-promises`，5 个为 `curly`。
- Windows 已按调用语义处理全部 43 个问题：异步流程等待设置保存，纯 UI 回调明确标记后台保存，换源分支补齐花括号；未关闭规则或扩大忽略范围。
- 发布元数据同步脚本已改为幂等逻辑；双端 `publish/version.json` 已同步为 2.13.5，历史首项为 2.13.4，Android versionCode 保持 86；连续运行两次哈希一致。
- `publish/changeLog.md` 已移除混入的旧上游全文，仅保留 2.13.5 当前说明和 2.13.4 定制版历史；完整历史继续保存在 CHANGELOG 与 version.json。
- 双端 Release workflow 已收敛为候选优先：Windows 只构建 x64 并验证未签名状态；Android 构建五个签名 APK并校验包名、版本码映射和证书指纹。
- Android 签名文档已明确公开仓库边界、规范 LF 文件哈希和以证书指纹作为跨平台身份依据。
- 本地验证已通过：双端来源歌单模型测试各 4/4、18 个本轮 Vue 脚本块与 Windows `local.ts` 语法检查、JSON/版本一致性、双端元数据重复运行、Windows 错误版本拒绝，以及双端临时 Git 工作区差异检查。
- Windows 候选 Build #4 在元数据校验阶段暴露 CRLF 兼容问题；发布元数据解析现统一换行，CRLF 模拟验证通过。
- Android 候选 Build #4 暴露 3 个项目自身 lint 错误；已修复发布入口 `no-void`、歌词请求包装的 `interface` 和 `async` 要求，等待双端候选重跑。

## 待完成

- 本机没有项目 `node_modules`，完整 ESLint 和构建仍需在提交、推送后由双端候选 Actions 验证。
- 候选 Artifact、真实 Windows/Android 设备验收、正式 GitHub Release、Music COS 和服务器清单更新均未执行；Build #4 失败后将用修复提交重跑候选。
