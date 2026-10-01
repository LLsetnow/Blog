# 项目 Topics 独立同步方案

状态：**PR #67 已于 2026-10-01 合并。项目更新 service 于 2026-10-01 22:40 CST 返回成功；9 个线上项目的 Topics 与当前 GitHub Topics 一致。项目 timer 仍启用，每周日 11:30 CST 运行。全量 README/图片刷新发出警告，现有内容和资源已保留，等待下次重试。**

## 现状与已验证范围

项目页的 9 个仓库已设置 GitHub About Topics，现有 36/36 个手动标签的语义均被覆盖。GitHub 仓库信息与 Topics 接口、本地及线上 `projects.json` 的标签逐项一致；页面卡片、标签筛选和控制台检查通过。当前链路为 GitHub `info.topics` → 显示名称映射 → JSON 的 `tech` → 项目列表与详情页，前端不直接请求 GitHub。

自动更新仍有阻碍：AstrBot 的 `blog-projects-update.timer` 已启用，每周日北京时间 11:30 触发，下一次为 2026-10-04。日志显示 8 月 24 日成功，8 月 30 日 Git 同步失败，9 月 6、13、20、27 日均在项目抓取阶段失败；线上项目 JSON 的修改时间仍为 8 月 24 日。

Node、npm、sharp 和当前 Git 远端读取正常，GitHub API 请求成功；部分 raw 请求出现 `ECONNRESET`，另一次真实 README 图片请求成功。历史日志隐藏了抓取命令的具体异常，因此不能把每次失败都归因于 raw 图片。代码已确认图片下载的网络异常会终止整个抓取，阻止 JSON 发布。

## 推荐方案

在现有更新流程中，**先独立同步 Topics 并发布 JSON，再继续现有 README/图片更新**，沿用当前 timer 与凭证配置，不改前端。

1. 抓取器增加 `--topics-only` 模式，以线上现有 JSON 为输入，仅请求配置中 9 个仓库的信息接口，复用 `formatTopic` 更新 `tech`。保留其他项目及名称、描述、README、链接、图片引用，不下载或改写图片。
2. 所有目标仓库查询成功后，校验项目 ID、字段结构及变更范围，只允许目标项目的 `tech` 变化。将候选 JSON 写入线上同目录临时文件，再原子替换正式文件。
3. Topics 发布完成后继续现有全量抓取。成功时采用本轮已验证的 Topics 发布完整数据；失败时保留刚发布的 Topics 和线上 README/图片缓存，记录独立警告，避免撤销标签更新。

## 失败与空值语义

- GitHub 成功返回 `topics: []`：发布 `tech: []`，尊重用户清空标签的操作，不恢复 `fallbackTech`。
- 任一仓库 API 失败，或 Topics 字段缺失、类型异常：Topics 阶段整体失败，线上零写入，service 返回失败；不发布部分结果，不用手动标签覆盖现有数据。
- Topics 同步成功、全量抓取失败：service 报告 Topics 成功并输出 README/图片更新警告；保留已验证的线上 JSON 和缓存。全量抓取不得用 fallback 标签覆盖本轮 Topics。
- API 请求应有明确超时；诊断只记录仓库、阶段和安全错误类别，不输出 token、cookie 或 `.env` 内容。

## 涉及文件

- `tools/fetch-projects.mjs`：Topics 独立模式、现有格式映射复用，以及全量发布的标签一致性。
- `ops/astrbot/update-blog-projects.py`：Topics 优先、候选校验、原子替换与全量失败处理。
- `ops/astrbot/README.md`：运维命令、更新结果与失败语义说明。
- 聚焦上述行为的测试文件，具体位置由实现子 Agent 按项目结构确定。

timer 时间、部署排除项和项目页面不需要修改。

## 验证与上线

必要验证包括：新增 Topic 能出现、清空 Topics 能变空、单仓库 API 失败时线上文件不变、图片请求抛错后 Topics 仍更新、全量成功时标签保持一致。Topics 模式前后比较其他 JSON 字段和图片文件哈希，确认缓存不变；并完成项目类型检查及页面筛选检查。

用户确认后委托实现、测试和代码审查，按项目要求分次提交，走分支 → PR → required `typecheck` → merge。随后更新服务器 updater，备份现有线上 JSON，手动执行一次既有 service，核对 Topics、JSON 更新时间、service 结果和页面；保留每周日 11:30 自动计划。实施前不得执行这些上线动作。
