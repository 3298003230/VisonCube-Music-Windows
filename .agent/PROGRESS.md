# 当前进度

## 2026-08-31 固定 GitHub 构建依赖

- Windows 5 个、Android 4 个本地 `file:` 定制包已改为固定 Release `deps-2026-07-30-aeadf24` 直链，双端锁文件同步更新；Android Gradle Wrapper 改为官方 8.8 分发地址并加入 `f8b4f4772d302c8ff580bc40d0f56e715de69b163546944f787c87abf209c961` 校验值。
- 依赖仓库 `main` 新增标准 `.github/workflows/publish-direct-npm-assets.yml`；GitHub Actions 运行 `33361880164` 成功创建 9 个 `.tgz`、`SHA256SUMS.txt` 和 `NPM-INTEGRITY.txt`，固定 Release 不是草稿或预发布。
- 云端核对 9 个包的名称和版本；发现 `react-native-background-timer` 与 `react-native-track-player` 在离线包中以相同版本重新打包，已将 Android 锁文件的两条 SHA-512 同步为当前权威包字节，其余 7 个包保持原完整性值。
- 回读验证：11 个 Release 资源集合正确，GitHub 资产 SHA-256 与 Release 清单一致，9 个 npm SHA-512 与双端锁文件一致；9 个公开 `.tgz` 和 Gradle 8.8 地址匿名 HEAD 均返回 HTTP 200；项目中已无 `D:\Code\VisonCube\依赖` 引用。
- 本机仍未运行 ESLint、Webpack/React Native 构建或 GUI/真机验收：双端没有 `node_modules`，系统和 Codex Node Runtime 均无 npm CLI。本轮未安装依赖、未生成安装包/APK。

## 2026-08-31 Music 双端扁平部署与关闭策略

- 已将 Windows、Android ZIP 安全解压到 `D:\Code\VisonCube\Music\Windows` 和 `D:\Code\VisonCube\Music\Android`，确认不存在多余 `VisonCube-Music-*-main` 外层目录；Windows `.agent` 已重新阅读，Android 无 `.agent`。
- Windows 已实现 `common.closeAction`、关闭确认弹窗、托盘/退出策略、设置页选项和三语文案；关闭按钮、Alt+F4、全局关闭快捷键共用流程。
- 关闭弹窗增加独立就绪握手，修复未登录页面尚未触发完整应用初始化时可能绕过首次询问的问题。
- 双端已移植版本关键词换源、KiB/MiB/GiB 容量单位、歌词毫秒修复、QQ 歌单总数与详情回退；Windows 列表追加/移动保留原始顺序；Android 增加单曲 URL 缓存清理菜单、MG/QQ 兼容修复。
- 补齐双端 MG 歌曲 ID 与 Windows MG 歌词的 `songmid` 查询及毫秒格式化，并修正旧配置迁移对扁平 `tray.enable` 的保留。
- GitHub 核对结果：两个 VisonCube 仓库最新正式版均为 2.13.3；上游 dev 有稳定修复，Electron 42 升级本轮跳过。
- 复核 2026-08-25 前的上游最新提交，补充移植繁中“更小”窗口尺寸文案；语言选项排序及 Linux/ARM 构建提交不适用于本轮。
- 验证：双端 `music-sync-model.test.ts` 使用 Codex 内置 Node 24.19.0 各 4/4 通过；14 个修改后的 JavaScript 文件通过 `node --check`；双端三语言 JSON 均可解析且键集合一致；ZIP 路径、SHA-256 与扁平目录结构复核通过。
- 项目脚本、ESLint、Webpack/React Native 构建及 GUI/真机验收仍未运行：当时项目依赖目录和 `node_modules` 缺失；本地 `.tgz` 阻塞已由后续固定 GitHub Release 直链解决。

## 2026-08-31 云端构建链路完成

- Windows、Android 源码已分别以普通非强制提交同步到 GitHub：Windows 功能提交 `54bf533e`，随后以文档验证提交 `586f5646` 收尾；Android 最终提交 `5e453035`；依赖仓库清单与发布工作流提交 `3f407c05`。
- Windows CI run `33370107565` 全量验证通过；随后将 lint 改为按提交定向检查，run `33370642949` 验证 npm ci、测试、定向 lint、完整 `npm run build` 全部通过。
- Android CI run `33369508808` 全部通过，Debug APK 已作为短期 Artifact 上传；`.nvmrc` 固定 Node 22，修复 Node 20 无法直接运行 TypeScript 测试的问题。
- 依赖仓库新增 `direct-packages.json`，发布工作流改为清单驱动并拒绝覆盖已有 `deps-*` Release；以后新增依赖集使用新标签，不改写旧标签。
- 已手动触发 Windows Beta 候选构建 `33373780718`：Windows x64/arm64 安装包与绿色包、Win7、Linux、Mac 产物全部成功并上传 Artifact（保留至 2026-11-29）。Android Debug Artifact `9749688825` 有效至 2026-09-07。
- 公网服务器只读审查：`/api/releases/music-windows` 与 `/api/releases/music-android` 均返回 2.13.3；Windows `latest.yml`、安装包和 Android APK 均 HTTP 200，安装包支持 Range 206。尚未切换生产版本。
- 修正 Windows COS 工具：凭据改由 `VISONCUBE_COS_*` 环境变量提供，上传前校验白名单产物，移除删除远端多余文件逻辑；Android Release workflow 增加签名 Secret 缺失的明确预检。两项修改尚未发布正式包。
- 本机未安装 `node_modules`、未下载 1.14 GB 依赖 bundle，也未生成安装包/APK；云端构建已验证源码和依赖直链可用。

## 2026-08-04 来源歌单云同步与 2.13.2 发布

- Windows 已接入 `/api/music/playlists`，仅同步带来源标识的歌单，支持旧 ID 迁移、本地歌曲保留、删除墓碑、CAS 冲突和账号页冲突选择。
- 4 项同步模型测试、定向/全量 lint、主进程和渲染进程生产构建、x64 NSIS 打包通过；本轮修复了两处可选 `sourceListId` 的 TypeScript 收窄错误。
- 后端和 SQLite 表已部署，Windows `2.13.2` 安装包、`.blockmap`、`latest.yml` 与生产发布清单已发布；安装包 SHA-256 为 `4561D5C16EEC4C935AFD4EAD1AE615D7CB3F883BD75D283421E8F4457B4435B6`，公网完整下载哈希与 Range 响应已核验。源码已于 2026-08-05 发布到 GitHub `main` 提交 `dcb854d8`。
- 同账号 Android/Windows 来源歌单完整运行联调仍待完成。

## 2026-08-03 Windows 更新状态修复与 2.13.1 线上发布

- 修复自动下载设置只显示“下载中”而未实际发送下载 IPC 的问题。
- 修复更新器不可用时静默返回的问题，并在下载错误或完成时立即同步界面状态。
- 源码版本已提升至 `2.13.1`，并构建 x64 NSIS 安装包、`.blockmap` 与 `latest.yml`。
- `latest.yml` 指向 `VisonCube-Music-v2.13.1-x64-Setup.exe`，其 SHA-512 已与安装包核对一致；安装包 SHA-256 为 `F33BE5B16263A2886FF518534C468DC5B1F1AA4ECE46877D44017366E8CE3E6C`。
- `2.13.0` 安装包已硬链接备份到 `D:\Code\VisonCube\exports\VisonCube-Music-v2.13.0-x64-Setup.exe`。
- 定向 lint 与 `npm.cmd run pack:win:setup:x64` 通过。
- 已将 `2.13.1` 安装包、`.blockmap` 与 `latest.yml` 发布到 COS 的 `VisonCube/Music/Windows/`；公网清单、HTTP Range 和完整安装包 SHA-256 均已核验。
- 生产服务器已原子更新 `music-windows` 条目，备份为 `/home/ubuntu/ServerCode/VisonCube/update/releases.json.bak-20260803T160421+0800`；线上发布 API 已返回 `2.13.1` 与正确的下载、更新源地址。

## 下一步

- 在真实 Windows 与 Android 设备验证首次合并、删除、本地歌曲保留、重试和并发冲突选择。
- 在真实旧版本客户端上完成发现、下载、重启安装，并确认升级到 `2.13.2` 后不再重复提示更新。

## 2026-08-31 下一步验收与发布准备

- Windows `main` 提交 `5fefbf8f` 的 CI run `33375209886` 成功：来源歌单测试、改动文件定向 ESLint、完整源码构建均通过。
- Android `main` 提交 `9d1837af` 的 CI run `33375405837` 成功：来源歌单测试、Lint、JS bundle、Gradle Debug APK 均通过；Artifact `9751779113`（`visoncube-music-android-debug-9d1837af012cca328f10fbe2824854f0b6f8b342`）有效至 2026-09-07。
- Windows Beta 候选 run `33373780718` 的 x64/arm64 安装包和绿色包等 Artifact 仍有效至 2026-11-29；CI 本身不上传生产对象。
- GitHub Actions API 只读检查显示 Windows、Android 仓库当前均无 repository secrets；Android Release 所需 5 个签名 Secret、Windows `BT_TOKEN`/COS 凭据均未配置，正式发布条件未满足。
- 本轮没有真实 Windows 桌面或 Android 实体设备可供操作，设备验收项目保持“待执行”；未创建正式 Release、未切换线上更新清单、未写入 COS/服务器。
- 发布工作流已改为显式双阶段：默认候选构建只上传 Artifact，`publish_release=true` 才会运行原有正式发布（Android 标签/GitHub Release、Windows `publish:*`）路径；避免误触发手动工作流造成生产发布。
