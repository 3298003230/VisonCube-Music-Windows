# VisonCube Music 双端上下文

## 项目

- Windows 源码：`D:\Code\VisonCube\Music\Windows`，Electron 40.9.2、Vue 3、TypeScript、Webpack。
- Android 源码：`D:\Code\VisonCube\Music\Android`，React Native 与 React Native Navigation。
- 两个目录均为扁平源码目录且不包含 `.git`；提交和推送使用临时 Git 工作区。
- 当前发布版本为 Windows/Android `2.13.5`，Android 基础 `versionCode=86`。

## 定制功能

- Windows `common.closeAction` 支持 `ask`、`tray`、`quit`；标题栏关闭、Alt+F4 和关闭快捷键共用关闭策略。
- 来源歌单通过鉴权接口同步，使用 revision/CAS、删除墓碑和幂等操作编号；应用云端顺序时保留本地歌曲。
- 原作者稳定修复在双端按适用范围同步，定制账号、云歌单、托管音源和关闭策略不得被上游更新覆盖。

## 构建与依赖

- 双端定制 npm 包固定使用 `VisonCube-Music-Dependent` 的不可变 Release `deps-2026-07-30-aeadf24`。
- 本机源码目录不安装 `node_modules`；完整 lint、构建和安装包验证通过 GitHub Actions 执行。
- Windows CI 运行来源歌单模型测试、零警告 ESLint 和完整源码构建；Android CI 额外生成 JS bundle 与 Debug APK。

## 发布

- 双端 Release workflow 仅手动触发；`publish_release=false` 只生成候选 Artifact，`true` 才允许创建 GitHub Release。
- Windows 只发布 x64 安装包、`.blockmap`、`latest.yml` 和 SHA-256 清单，沿用明确标注的未签名发布方式。
- Android 发布四个 ABI APK 与 universal APK；基础版本号为 86，ABI 包沿用 Gradle 的 86001–86004 映射。
- Android 正式包必须通过证书 SHA-256 指纹 `9C951C4BBA399D21751F4B194E839DA3A49EFD60534CF9B3B9D35859A6D6BC95` 校验。
- Music COS 和服务器清单只在候选与真机验收通过并再次确认后更新；本地 TV 项目不属于清理范围。
