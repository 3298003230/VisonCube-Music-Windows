# 当前进度

## 2026-09-10 品牌与设置体验收敛

- 双端无封面占位已统一为 `V/C`，Windows 遗留 LX SVG 已替换为现有 C/V 几何；静态扫描未再发现用户界面的 `LX Music`、`落雪` 或 `L/X` 占位。
- 双端首次许可等待统一为 5 秒；Windows 恢复已验证的首屏路由竞争保护，登录成功后的既有回首页逻辑保持不变。
- Windows 设置恢复六组侧栏分类；Android 恢复六组竖屏卡片与横屏分组导航。“更新音源”继续沿用现有鉴权、清单校验和失败保留旧源的实现。
- Android 启动器前景相对缩小 10%，Windows 应用图标相对放大 10%；Windows 托盘资源未修改。双端同步模型测试各通过 4/4，语言 JSON、图标 XML/SVG、旧版设置实现对照与图标尺寸检查通过。
- 本轮未提交、推送、出包或更新服务器；完整零警告 lint、构建与真机界面验收仍需后续候选 Actions。

## 2026-09-10 Music 用户许可同步完成

- 已从共享协议复制出 Music 项目根目录的独立协议源，并收敛为 Music 专用的 1.1 版本；仅涵盖音乐搜索、播放、歌单、歌词、音源、账号和同步场景。
- Windows `license_zh.txt`、`license_en.txt`、`license.rtf` 与 Windows/Android 首次协议弹窗已机械同步；共享协议与 TV 路径未改动。
- 已验证两份文本、两个弹窗正文及 RTF 回读均与 Music 源一致；本轮未构建、出包、提交、推送或发布。

## 2026-09-10 原作者源码底座还原完成

- Windows 与 Android 正式 `src` 已从经验证的原作者快照重建，并只合并白名单的 VisonCube 功能；用户可见的加载、导入、更新与请求异常文案已按既有要求去除无意义表情和原作者导向。
- Windows 保留关闭选择、托盘图标、账号、云同步和托管音源；Android 保留账号、云同步、托管音源、自有更新、包名和原生图标配置。
- Windows 构建发现并恢复三项必要定制契约：账号会话数据键、请求代理函数导出和 PNG 资源类型声明；未改变业务流程或公共数据格式。
- 当前通过 CI 的源码基线提交：Windows `7822954999d94fc1bba0cdd0f70f5e51a900dc78`，Android `443c4cef1569ac4c593aa4d44dc64e78bcf657b4`。
- Windows CI #38 与 Android CI #24 均通过；双端本地 `test:music-sync` 均通过 4/4，正式 `src` 与临时 Git 工作区逐文件 SHA-256 对比为 0 差异。
- 本轮未创建标签、Release、候选安装包，也未更新 COS 或服务器；同步前完整 `src` 回退备份仍保留在本机临时目录。

## 2026-09-08 Music 2.13.5 正式发布与生产切换

- 用户测试当前候选包未发现问题后，已按确认进入正式发布与生产同步。
- 已确认 GitHub Release `v2.13.5` 存在且非草稿、非预发布：Windows 资产包含 x64 安装包、`.blockmap`、`latest.yml`、`SHA256SUMS.txt`；Android 资产包含 arm64-v8a、armeabi-v7a、x86、x86_64、universal 五个 APK 和 `SHA256SUMS.txt`。
- 已通过腾讯云控制台登录态上传 Music 白名单资产到 COS，未使用或保存长期 COS Secret：Windows 安装包、`.blockmap`、`latest.yml`、`SHA256SUMS.txt`，Android universal APK 和 `SHA256SUMS.txt`。
- 已通过腾讯云轻量应用服务器自动化助手更新 `/home/ubuntu/ServerCode/VisonCube/update/releases.json`，只修改 `music-windows` 与 `music-android`；更新前保留服务器备份：
  - `/home/ubuntu/ServerCode/VisonCube/update/backups/release-music-2.13.5-20260908T101837Z/releases.json`
  - `/home/ubuntu/ServerCode/VisonCube/update/backups/release-music-2.13.5-asset-path-20260908T102516Z/releases.json`
- 首次清单更新后发现后端接口优先使用 `asset_path` 生成下载文件名；已补充修正 Music 双端 `asset_path` 并重新验证。
- 公网验证通过：`/api/releases/music-windows` 与 `/api/releases/music-android` 均返回 `2.13.5` 且文件名、下载 URL 和 SHA-256 指向 2.13.5；Windows 安装包 Range 请求返回 `206 Partial Content`；公网下载的 Windows 安装包与 Android universal APK 长度和 SHA-256 均匹配。
- 本机使用 Android SDK `apksigner.jar` 复验 universal APK 证书指纹，匹配 `9C951C4BBA399D21751F4B194E839DA3A49EFD60534CF9B3B9D35859A6D6BC95`；`aapt dump badging` 确认包名 `com.visoncube.music`、`versionName=2.13.5`、`versionCode=86`。

## 2026-09-08 生产同步方案回退

- 按用户要求停止 COS 密钥创建流程，不再获取或配置 COS Secret。
- 已通过 GitHub API 删除 Windows 仓库的 `VISONCUBE_SERVER_SSH_KEY` Secret；当前 Windows 仓库 Actions Secrets 列表为空。
- 已从服务器 `ubuntu` 用户 `authorized_keys` 删除本轮专用 GitHub Actions SSH 公钥，并在服务器保留带时间戳备份。
- 已删除本机本轮专用 SSH 私钥/公钥文件 `C:\Users\L\.ssh\visoncube_music_actions_ed25519*`。
- 已从本地 Windows 源码和远端 Windows `main` 删除 `.github/workflows/production-sync.yml`；推送提交为 `56dd0d6543d40c45b15c70f0bb01ce4166d7f1c1`。
- 已推送 `.agent` 状态同步提交 `e20e19a0feb01d4ea4522d1f3b6d6d1dc7fd1736`，对应 Windows CI `34192474898` 通过。
- 已确认远端版本号仍为 Windows/Android `2.13.5`、Android `versionCode=86`；Android 仓库本轮没有实际内容变更，不新增提交。

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

- 还原后的双端源码尚未生成候选安装包，也未完成 Windows 关闭/托盘、账号云同步、托管音源和 Android 覆盖安装等真机回归。
- 需要重新出包时，继续由双端手动候选 Actions 构建并完成真机验收；GitHub 直连生产同步保持取消。

## 2026-09-10 对外展示收敛

- 本地 Windows/Android 源码和临时 Git 工作区已同步安装器许可、README、FAQ、Issue 模板、更新日志与发布元数据；Windows 包元数据维护者已改为 VisonCube Music。
- 静态审计确认对外资料与安装器许可不再含旧品牌、旧仓库、旧文档或旧作者导向；Windows `033cf5f` 与 Android `984e940` 已推送。
- 首轮双端候选构建仅因手写 `version.json` 与 `npm run publish` 的规范化输出不一致而在元数据校验阶段失败；现已用项目脚本重新生成，待推送并重跑候选构建。
