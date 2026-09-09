# 微信订阅消息部署与验收

## 已配置模板

- 量表任务未完成通知：`wbFkmIdPNgpDfLPEGjudl3QMJXuWtxSZd9mzkZVPKZ0`
- 测评报告生成通知：`VlSHDV8Vz0fiR4oV0plxOJlSwjAgLcueTP3pIV4F5AE`

`AppSecret` 继续使用项目现有配置，本次不修改。整个方案只使用 uniCloud 和微信小程序订阅消息接口。

## 部署顺序

1. 在 HBuilderX 中打开 `zhimiao-xcx`，选择正确的阿里云 uniCloud 服务空间。
2. 上传数据库 Schema 和索引：
   - `wtdb-business-assess-record`
   - `wtdb-wechat-sub-grants`
   - `wtdb-wechat-message-outbox`
3. 上传并部署下列云函数（选择“云端安装依赖”）：
   - `wtdb-wechat-subscription`
   - `wtdb-wechat-reminder-cron`
   - `wt-upload-assess-record`
   - `wtdb-upload-assess-history`
   - `wt-business-report-gen-v2`
   - `wt-report-task-orchestrator`
   - `wt-task-save-pending-report`
4. 确认 `wtdb-wechat-reminder-cron` 的定时触发器已经生效。Cron 为 `0 1 0 * * * *`，即每天北京时间 `00:01` 运行一次。
5. 重新发布微信小程序。

## 业务规则

- 每个 `recordId` 代表一次独立评估，同一学生再次使用同一量表也会产生新批次。
- 新建评估时申请一次“未完成提醒”订阅；继续原评估时不重复申请。
- 用户同意后，授权记录的 `next_check_time` 保存这次评估的动态到期时间。
- 每次保存进度，`nextReminderAt` 和 `next_check_time` 都更新为“本次保存 + 24 小时”。
- 每天的任务只通过复合索引查询 `next_check_time <= 当前时间` 的已接受授权，不扫描全部评估记录。
- 评估完成或重新开始时立即取消提醒；真正发送前还会再次读取评估状态，防止误发。
- 由于一天只检查一次，提醒会在连续 24 小时无进度后的下一个 `00:01` 发送，最多可能晚约一天，但不会提前。
- 报告任务进入成功或失败终态时立即按需发送，不等待每天的定时任务。
- 推送不包含儿童姓名，点击消息后再在已登录的小程序中查看对应记录。

## 验收步骤

1. 使用真机微信登录，为一个学生新建评估，选择“开启提醒”并允许订阅。
2. 在 `wtdb-wechat-sub-grants` 中确认存在 `assessment_reminder / accepted` 记录，并且 `next_check_time` 有值。
3. 快速测试时，仅将测试评估的 `nextReminderAt` 和对应授权的 `next_check_time` 改为当前时间之前，然后在控制台手动运行一次 `wtdb-wechat-reminder-cron`。
4. 确认微信收到未完成提醒，发件箱状态为 `sent`，授权状态为 `consumed`。
5. 新建另一次评估，完成后提交报告并允许“报告结果”订阅。
6. 报告进入终态后应立即收到成功或失败通知，无需运行每日定时任务。

> 订阅消息只能在微信真机环境中完整验收；用户拒绝授权时，不发送相应消息，也不影响评估和报告主流程。
