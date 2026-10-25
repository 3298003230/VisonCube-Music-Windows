# 当前进度

## 2026-10-25 双端稳定上游修复与 2.13.10（源码阶段）

- 按已核对的稳定上游版本同步酷狗分享链歌单回退、QQ 音乐推荐歌单和容量单位修复；保留账号、同步、托管音源、关闭策略、品牌资源和启动诊断。
- Windows 增加 QQ 推荐歌单接线与双端 IEC 容量单位；Android 同步腾讯 QRC 歌词解码、QQ 搜索、MG 图片/歌曲 ID/歌词兼容修复，并保留现有缓存与账号行为。
- 版本更新为 Windows/Android 2.13.10，Android versionCode=92；新增对应静态回归测试和变更记录。
- 已创建前置备份 backups/music-upstream-sync-20261024；本轮已完成源码测试、GitHub CI、普通推送和正式 Release；COS 与服务器更新清单仍未修改。
- 最终提交为 2a5a074（同步修复）和 b0bca9e（lint 风格修复），已普通推送 Windows main；CI run 40112614211 成功，包含同步测试、零警告 lint、源码构建和 Windows 候选流程。Android 对应提交和 CI 结果已在 Android 文档记录。

- 正式发布 workflow run 40155493400 成功，已创建 GitHub Release v2.13.10，包含 Windows x64 安装包、blockmap、latest.yml 和 SHA256SUMS.txt；Windows 安装包沿用未签名发布方式。

## 2026-10-24 Music 深色图标资源切换（本地资源验证完成）

- 使用用户提供的 `B-VC联结-深色/VisonCubeMusic` 方案替换 Windows 应用/安装器图标资源和 Android 启动器图标资源；保留原有目录、包名、托盘逻辑、版本、签名和业务代码。
- Windows 使用深色 Music ICO，并从同一 1024 PNG 生成现有 16/32/48/64/128/256/512 与 `icon.png` 资源；Android 普通/圆形密度图从同一 PNG 生成，自适应图标使用深色背景和对应紫色/白色前景；前景安全区保持缩放和居中。
- 修改前资源已备份至 `D:\Code\VisonCube\backups\music-dark-icon-20261024`，含 `MANIFEST.json` 哈希清单；本轮未修改 Mac `icon.icns`、托盘专用图标、TV、业务代码、版本或发布配置。
- 已完成 PNG 尺寸/哈希、Android XML、Windows SVG 与资源引用静态检查；尚未运行完整 lint/build、未生成安装包、未提交或推送。

## 2026-10-14 Windows 诊断安装包（已校验，待用户实测）

- 用户要求提供安装包；仅提交现有首屏诊断白名单文件，并普通推送 Windows main 后手动触发 release.yml，publish_release=false。执行前远端 main 仍为 2650ece，临时 Git 工作区干净，本地 33 项测试和 5 个 TypeScript 语法检查再次通过。
- 保持 2.13.9、不改 Android/依赖/安装器/生产；候选通过后下载到 Music/Installers/2.13.9-startup-diagnostics-candidate-20261014/Windows，并复核归档摘要、文件哈希、版本、latest.yml 与 NotSigned 状态。首屏慢和安装完成停顿的根因仍待该包在用户机器采样，不宣称已修复。
- 提交 7f4c836 已普通推送 main；CI 38495770672 和候选 38495771054 全部成功，测试、零警告 lint、全部源码编译、x64 打包及资产核验通过；正式 Release job skipped，未更新 COS 或服务器。
- 本机 EXE 为 107280376 字节、ProductVersion 2.13.9、NotSigned，SHA-256 为 56a7e6b5a8c8649da0aadb4f31a3c1af7b5b9940502469b167d8adba5ad08459。GitHub Artifact 11864070504 的归档摘要 e0e556d93b97e4ed960b5724a478a432ad1f78861aa6a8bc93960e5f822c9415、三个资产 SHA-256、latest.yml 的 SHA-512 与长度均复验一致；只读检查安装包内 app.asar，确认版本及主进程采样器、15 个渲染计时标记均已打包。
- 本轮没有启动或安装新包；开机首次/彻底退出后二次启动，以及安装结束勾选/取消运行应用的停顿对照仍待用户实际设备验证。上述最终产物记录仅补充本地文档，不再为文档触发额外提交或候选构建。

## 2026-10-13 Windows 首屏分段诊断（本地验证完成，待候选构建）

- 用户提供的 main.log 中，慢启动的页面加载段为 2323–2761ms，快启动为 275–338ms；会话读取仅 6–15ms，更新检查记录均在首屏就绪后。日志确定了主要耗时阶段，尚不能区分资源读取、脚本求值与界面初始化，不能据此宣称启动问题已修复。
- 仅在渲染入口、会话恢复和音源初始化中加入内存 Performance 标记；Windows 主进程在原首屏显示回调后异步采样，沿用 main.log。采样只含固定阶段名称和数值，无账号、令牌、歌单或资源 URL；原等待顺序、错误传播、窗口显示、退出保留音源及关闭策略不变。缺少结束标记表示采样时尚未完成，不等同于失败。
- 本地既有 test:music-sync 对应 Node 命令通过 33/33（原 27 项加 6 项诊断测试）；5 个修改的 TypeScript 文件通过 node --check。覆盖未完成/失败采样不阻塞窗口、无敏感数据、空性能记录、非 Windows/已销毁渲染层、未完成会话不阻塞挂载、音源失败传播及原窗口/同步/更新回归。测试用类型擦除 API 仍有原有实验性提示；完整 lint/build 与冷启动实机验收未运行。
- “安装完成点击完成后停顿”另行只读核对：本项目无自定义 NSIS Finish 逻辑，锁定 app-builder-lib 26.9.0 默认模板调用 StdUtils.ExecShellAsUser 启动快捷方式，无等待窗口就绪的项目代码。尚未测量该系统调用耗时，未修改安装器；需用勾选/取消运行应用对照测试区分停顿来源。
- 修改前 7 个白名单文件已备份到 backups/music-startup-timing-20261013-6d4a。版本仍为 2.13.9；Android、依赖、构建配置和生产均未改；本轮未提交、推送或生成新安装包。

## 2026-10-12 双端退出账号保留音源（候选包已构建，待真机验收）

- 按用户新增要求，仅移除双端退出流程中的托管音源删除、回退切换及相应未使用导入；退出仍清除本地会话、停止云同步并尝试服务端撤销。音源手动删除、缓存清理、账号归属及哈希校验不改。
- 修改前备份位于 `backups/music-signout-retain-20261012-16cd`；Windows 保留本轮启动小补丁，Android 只恢复退出保留音源。现有 Node 测试分别通过 Windows 27/27、Android 14/14；新增测试执行实际退出代码，覆盖正常/过期/空会话、重复退出和服务端撤销失败，确认不删除/切换音源；改动前该测试双端均失败。修改的退出及测试文件通过 `node --check`。
- 用户已单独确认提交、非强制推送与双端候选构建。Windows 最终代码提交 `2650ece`、Android `65731f8` 已推送 main；Windows CI `38194697204` / 候选 `38194697865`、Android CI `38194330369` / 候选 `38194350121` 均成功，双端测试、零警告 lint、源码构建及打包/资产核验完成。Windows 首次 CI 因按需页面加载函数缺少 async 失败，仅补该关键字后重跑通过；两端正式 Release job 均 skipped，COS/服务器未改。
- 版本仍为双端 2.13.9（Android 基础 versionCode=91）；本机新包位于 `Music/Installers/2.13.9-startup-signout-candidate-20261012`。Windows EXE 为 107278335 字节、NotSigned、SHA-256 `4a8ca6a24e2d7d1c1c8054123c4993464092e1210ae5da483ce6057b9bb19b97`；arm64-v8a APK 为 14121071 字节、包名 com.visoncube.music、versionCode=91003、SHA-256 `122679f7efb923c3eba05b1fae0ac55ade44f23bf4ab09a55bb085bcf5067dda`。下载归档与 GitHub Artifact 摘要、文件校验清单均一致，Windows latest.yml 的 SHA-512/长度匹配；APK 本地 apksigner 验证 v1/v2 签名、既有证书指纹及 Provider 通过。apksigner 的 60 条 META-INF/JAR 元数据提示与旧正式 arm64 包完全一致，未新增。
- 退出/重新登录后保留音源、手动删除后不恢复和开机冷启动速度仍需安装后的真实设备验收；上述最终产物记录仅补充本地文档，不再为文档触发额外提交或候选构建。

## 2026-10-12 Windows 保守启动补丁（待云端及安装包验收）

- 托管音源内容与元数据均未变化时跳过重复持久化；删除不存在的托管音源时不再空写盘。保留原缓存校验、账号归属校验、压缩与错误传播，不改变缓存格式。
- 仅改密码页改为按需加载；登录卡片、账号会话恢复、首屏前的本地会话读取、同步启动顺序、播放和关闭/托盘策略均未调整。应用就绪、基础初始化、会话读取、窗口准备与首屏就绪新增数值耗时日志；窗口分段日志在首屏就绪后记录，不包含会话或歌单内容。
- 本地现有 Node 测试命令通过 26/26，覆盖同进程重复/并发恢复、已有缓存恢复、内容/元数据变化、无效脚本、压缩失败保留旧源、空删除、删除后重新安装、普通源保留、按需路由和无敏感内容的诊断日志；原有窗口、同步模型与更新接线测试保持通过。5 个修改的 TypeScript 文件通过 `node --check`，白名单 diff、调用方、换行与空白检查完成。
- 启动部分仅修改 4 个运行代码文件及现有测试/进度文件；备份位于 `backups/music-startup-conservative-20261012-82be`。本机无 node_modules，完整 lint/build 和异步页面分块编译现已通过最终 Actions 并生成候选包；开机冷启动/二次启动速度仍未实测，不能据此宣称冷启动已解决。版本仍为 2.13.9；Android 本轮仅另行恢复退出保留音源，COS/服务器未改。

## 2026-10-10 Windows 首屏显示等待修复

- 移除 `ready-to-show` 后等待渲染层窗口模式、最迟再等 5 秒的显示门槛；创建窗口时从既有本地会话预判登录/主窗口尺寸，渲染层仍负责实际会话恢复和后续尺寸校正。会话有效性判断提取为共用函数，保留原来的 60 秒到期安全边界；读取异常时记录不含会话内容的警告并回退登录尺寸。
- 仅修改窗口显示与会话有效性共用代码，保留账号、同步、音源、关闭/托盘、版本 2.13.9 和依赖。修改前备份位于 `backups/music-startup-20261010-531e7e81`。
- 本地 `test:music-sync` 对应命令通过 20/20，修改的 TypeScript 文件通过 Node 语法检查；执行真实窗口模块的模拟 Electron 测试覆盖无渲染回调、会话过期/读取失败、重复与延迟回调、登录/退出尺寸恢复、全屏、小屏幕、隐藏启动、托盘恢复/退出。同一回归测试在修改前的窗口代码上失败，修复后通过。测试用 Node 类型擦除 API 有实验性提示，不进入生产代码；本地无构建依赖，完整 lint/build 使用既有云端环境完成。
- 源码提交 `1f0c8ca` 已非强制推送；CI `38054205367` 与候选构建 `38054232171` 均成功，测试、零警告 lint、全部源码编译及 x64 打包/校验通过，正式发布任务 skipped。未修改 Android、版本、COS 或服务器。
- 候选包保存于 `Music/Installers/2.13.9-startup-fix-candidate/Windows`；EXE 107275317 字节、版本 2.13.9、`NotSigned`，SHA-256 `ac7eb5afa8095164b8f6ff046c99a6d14ee5b1b1d24189323f6ab8345a5d0bb0`，归档摘要、三个文件校验和以及 `latest.yml` 的 SHA-512/长度均匹配。实际开机冷启动速度、安装后的登录/托盘体验尚未实测，需要覆盖安装并重启电脑验收；本段最终产物记录仅补充本地文档，未另推送文档提交。

## 2026-09-29 Music 2.13.9 正式发布与新域名切换

- Windows 提交 `8c9f13b`、Android 提交 `accf122` 已推送；两端服务域名统一为 `linux.visoncube.cn`，生产下载统一为 `download.visoncube.cn`。
- 候选 Actions 全部成功：Windows run `36533958009`、Android run `36533961054`。Windows 安装包与 blockmap/latest.yml、Android 五种 ABI APK 均下载复核；Android universal 包为 `com.visoncube.music`、`versionName=2.13.9`、`versionCode=91`，v1/v2 签名与既有证书指纹匹配。
- 生产已发布非强制更新：Windows x64 安装包 SHA-256 `E31F414DFB0753BE8EBCED94AE8D6474CB4AEAE7443223BE505D603FC5C1220B`；Android universal APK SHA-256 `E88D3B27D16EA761954C3BEC98F959DF80D766C9C73A9A73BD1A1A0FF8C47277`。更新接口、COS 文件长度与 Range 206 已验证。

## 2026-09-16 普通用户歌单同步补齐

- 修复双端账号同步仅收集带平台来源标识歌单的问题；用户新建歌单和普通导入歌单现按稳定本地 ID 同步，来源歌单原有身份与刷新行为不变。
- 普通歌单远端恢复后仍保持普通歌单语义；本地文件歌曲不上传，远端删除含本地歌曲的歌单时只移除在线歌曲。
- 双端接线测试分别通过 Windows 10/10、Android 13/13，相关 TypeScript 文件通过 Node 语法检查；因正式源码目录按约定无 `node_modules`，本机完整 lint/build 未运行，尚需候选 CI 与双端实机跨账号/跨设备验收。

## 2026-09-11 Music 2.13.7 正式发布与生产切换

- 仅修复 Windows 动态更新 Feed、下载异常提示和关闭快捷键接线，双端协议解析，以及 Android 安装 Provider、未知来源授权、安装失败重试和单曲 URL 缓存清理入口；账号、同步、音源、播放、品牌、许可、依赖和目录结构未改。
- 2.13.7 候选 Actions 已通过：Windows run `34595946913`、Android run `34595950965`；正式 Actions 也已通过：Windows run `34596679085`、Android run `34596682213`。
- 双端 `v2.13.7` GitHub Release 已创建；Windows x64 安装包、`.blockmap`、`latest.yml`、SHA-256 清单以及 Android universal APK、SHA-256 清单已上传到既有 Music COS 目录，历史对象均保留。
- 服务器 `releases.json` 已先备份，再经 JSON 校验与同目录原子替换切换到 2.13.7；公网接口、文件长度、SHA-256、Windows Range 206 和 `latest.yml` 均验证通过。

## 2026-09-11 托管音源退出清理修复

- 账号订阅源的本地缓存是单份且绑定最近更新的账号；此前 A 删除、B 更新、再切回 A 时会因缓存账号不匹配而不可用。
- 双端现统一在手动删除和退出账号时清理该缓存、从音源列表卸载，并在它正被使用时切换到首个可用内置音源；普通本地/在线导入源、歌单、账号和同步数据不变。
- 新增 Android `features/musicSource/storage.ts`，仅负责托管源缓存路径与卸载，避免认证状态与下载模块形成循环依赖。Windows 5/5、Android 8/8 本地模型/接线测试通过；完整 lint、构建和真机测试仍由候选 Actions 验证，不创建正式 Release、不更新生产。

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

## 2026-09-10 Android 托管音源播放修复

- 真机反馈托管音源更新成功后播放仍提示换源失败；确认播放适配器仍只识别 `user_api*`，没有识别 Android 使用的 `managed_user_api`，因此必然落入空的内置音源表并抛出 `Api is not found`。
- Android 改用现有 `isUserApiSource` 统一判定并增加回归测试，提交 `4189817` 已普通推送至 `main`；Windows 托管源 ID 为 `user_api_managed`，现有路径正确，未修改。
- 候选 workflow run `34492760126` 成功：发布元数据、7 项测试、零警告 lint、JS bundle、签名构建、APK 元数据和证书指纹均通过；正式 Release 任务未执行。
- arm64-v8a 候选 APK 已下载到本机并与 CI 校验清单一致，包名 `com.visoncube.music`、版本 `2.13.5`、versionCode `86003`、ABI `arm64-v8a`，证书指纹匹配既有正式证书。
- 本轮未创建 Release、未更新 COS 或服务器清单；修复后的实际播放仍需实体 Android 设备验收。

## 2026-09-11 Music 2.13.6 正式发布与生产切换

- 双端 `v2.13.6` GitHub Release 已创建；Windows x64 安装包、`.blockmap`、`latest.yml` 与 SHA-256 清单，及 Android universal APK 与 SHA-256 清单已上传至既有 Music COS 目录，未上传源码、依赖或签名材料。
- 服务器 `/home/ubuntu/ServerCode/VisonCube/update/releases.json` 已先备份至带 UTC 时间戳的 `backups/release-music-2.13.6-*` 目录，再完成 JSON 校验与原子替换；仅更新 `music-windows`、`music-android` 两个条目并同步 `asset_path`。
- 公网验证通过：两个更新接口均返回 `2.13.6` 和对应 SHA-256；Windows 安装包 HTTP `200`、Range `206`、长度 `107274457`，Android universal APK HTTP `200`、长度 `29117428`；`latest.yml` 与两个公开 SHA-256 清单均指向 2.13.6。
