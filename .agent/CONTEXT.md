# VisonCube Music 双端上下文

## 项目

- Windows 源码：`D:\Code\VisonCube\Music\Windows`，Electron 40.9.2、Vue 3、TypeScript、Webpack。
- Android 源码：`D:\Code\VisonCube\Music\Android`，React Native 与 React Native Navigation。
- 两个目录均为扁平源码目录且不包含 `.git`；提交和推送使用临时 Git 工作区。
- 当前生产发布版本为 Windows/Android `2.13.7`，Android 基础 `versionCode=89`。
- Music 用户许可的唯一源文件为 `D:\Code\VisonCube\Music\VisonCube-Music-许可协议.md`（版本 1.1）；Windows 安装页文本/RTF 与 Windows、Android 首次协议弹窗均从该文件同步。该协议只适用于 Music，不替代通用协议、TV 协议或第三方开源许可证。

## 定制功能

- Windows `common.closeAction` 支持 `ask`、`tray`、`quit`；标题栏关闭、Alt+F4 和关闭快捷键共用关闭策略。
- 来源歌单通过鉴权接口同步，使用 revision/CAS、删除墓碑和幂等操作编号；应用云端顺序时保留本地歌曲。
- 账号订阅音源使用单份受账号鉴权的本地缓存；退出任何账号时，双端都会卸载该音源并清除缓存。重新登录后，用户需手动“更新音源”或重新导入；普通手动导入音源不受影响。
- 原作者稳定修复在双端按适用范围同步，定制账号、云歌单、托管音源和关闭策略不得被上游更新覆盖。

## 2026-09 源码底座

- 双端 `src` 已以原作者最新快照为底座，只重新接入品牌、账号、云同步、托管音源、自有更新和 Windows 关闭策略；保留已验证的 Windows 首屏路由竞争保护与双端设置分类。
- 用户可见的首页、加载、导入和更新提示采用无表情的中性文案；许可证、第三方归属、协议兼容标识和音乐评论表情解码不作为品牌清理目标。
- 用户可见的无封面占位统一使用 `V/C`，应用图标继续以双端各自的 `visoncube-music-icon.svg` 为几何源；Windows 托盘使用独立小尺寸资源。
- 当前生产源码基线提交为 Windows `f7902cddf6844d5a88a14f32b9f8ea6414026149`、Android `4d6958a81c87bfa97779dd434dd344b0834a2658`。

## 构建与依赖

- 双端定制 npm 包固定使用 `VisonCube-Music-Dependent` 的不可变 Release `deps-2026-07-30-aeadf24`。
- 本机源码目录不安装 `node_modules`；完整 lint、构建和安装包验证通过 GitHub Actions 执行。
- Windows CI 运行来源歌单模型测试、零警告 ESLint 和完整源码构建；Android CI 额外生成 JS bundle 与 Debug APK。

## 发布

- 双端 Release workflow 仅手动触发；`publish_release=false` 只生成候选 Artifact，`true` 才允许创建 GitHub Release。
- Windows 只发布 x64 安装包、`.blockmap`、`latest.yml` 和 SHA-256 清单，沿用明确标注的未签名发布方式。
- Android 发布四个 ABI APK 与 universal APK；2.13.7 基础版本号为 89，ABI 包沿用 Gradle 的 89001–89004 映射。
- Android 正式包必须通过证书 SHA-256 指纹 `9C951C4BBA399D21751F4B194E839DA3A49EFD60534CF9B3B9D35859A6D6BC95` 校验。
- 2026-09-11 已正式发布 Music 2.13.7：双端 GitHub Release、Music COS 白名单资产和服务器更新接口均切换到 `2.13.7`；历史资产继续保留。
- 服务器更新接口通过 `/home/ubuntu/ServerCode/VisonCube/update/releases.json` 管理，后端实际下载文件名依赖 `asset_path`；更新版本时需同步 `asset_path`、`file_name`、`download_url` 和 `sha256`。
- Android APK 不允许通过腾讯云 COS 默认域名公开分发，生产下载必须使用已配置的自定义域名 `https://download.sjmf.xyz`；Windows 更新源也统一使用该域名。
- 2026-09-08 已取消 GitHub Actions 直连 COS/服务器的生产同步方案；后续生产同步继续保持人工门禁，不在 GitHub 保存发布专用 SSH 或 COS Secret。
- 本地 TV 项目不属于 Music 清理范围。

## 对外展示

- 对外的安装器许可、应用内首次许可、公开仓库文档、Issue 模板、发布更新说明和包元数据统一使用 VisonCube Music；顶层开源许可证、第三方归属以及兼容标识仍按其原有约束保留。
