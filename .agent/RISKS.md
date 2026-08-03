# 当前风险

- 用户当前运行的旧应用内部版本为 `2.12.4`、显示版本为 `1.0.1`；在发布修复版前，该旧包的手动下载流程仍可能卡住，可用现有 `2.13.0` 安装器手动升级。
- 全量 `npm.cmd run lint` 在本机约两分钟后仍未结束并被终止；本次仅确认了改动文件的定向 lint 与完整 x64 安装包构建。
- 后端 `tests/test_release_catalog.py` 不能在本机运行：Python 3.10 缺少 `pydantic`，默认 Python 3.4 缺少 `pytest`；发布清单 JSON 与 Windows 条目已通过独立断言校验。
- 当前 SSH 账户没有 `systemctl restart visoncube-auth.service` 的权限；服务保持 `active`，且发布接口每次请求都会重新读取清单，已在线验证 `2.13.1` 生效。以后若修改依赖进程重启的服务配置，需要具备服务管理权限的账户。
