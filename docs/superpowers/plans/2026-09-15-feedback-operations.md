# 反馈存储、验证和启用

## 当前边界

反馈完全自愿，仅玩家主动点击“反馈”入口后打开。进入游戏、通关、失败、切关、计时和恢复草稿都不得主动弹出，不影响继续闯关，不用奖励诱导填写。玩家可不填文字或关闭表单。

实现 POST /api/feedback，仅接收选择的感受、600字以内文字、本关上下文、客户端生成的随机提交ID。数据库不保存IP、联系方式或账号。服务未绑定数据库/保存失败返回503，界面保留草稿，不假报成功。

重复提交ID由数据库主键去重。打开过的未提交/失败草稿保持原关卡上下文；修改文字或感受会生成新的提交ID。请求最多4096字节，流式读取到上限立即取消。跨站Origin拒绝，Cloudflare限频绑定准备为每网络来源每分钟5次；不是身份验证，也不保证阻挡所有垃圾反馈。

## 本机完整验证

在本工作树执行 `npm run build`，然后 `npm run preview:feedback`。脚本只创建本机D1状态，使用 `.wrangler/feedback-local-state`，运行 http://localhost:3103/ 。仅供本机测试，不能分享给其他设备作为公网链接。生成的 `.wrangler/feedback-local.json` 路由为空，含明确的local-only数据库ID，**禁止拿它部署**。

本机查看：

```sh
node_modules/.bin/wrangler d1 execute FEEDBACK_DB --local --config .wrangler/feedback-local.json --persist-to .wrangler/feedback-local-state --command 'SELECT id, feeling, message, context_json, created_at FROM feedback ORDER BY created_at DESC LIMIT 20'
```

## 正式启用

2026-09-15：用户已批准新增D1授权，Wrangler授权成功；已创建数据库 `arrows-escape-feedback`（`69fc20d0-9a50-4791-b83e-fe151e47675d`），已成功应用0001迁移。生产配置已加入两个绑定。以下是完整流程，发布和线上验收仍须最后完成。

1. 已取得用户确认并完成D1授权；未申请其他新权限。
2. 已创建上方记录的真实数据库。
3. 已在生产配置添加`FEEDBACK_DB`与`FEEDBACK_RATE_LIMITER`；本机预览仍使用独立本地配置。
4. 远程0001迁移成功，反馈表已建立。
5. 按GitHub/Cloudflare原部署链发布已验证提交，再从正式域名实际提交一条明确标注的验收反馈，并只查询这条验收记录核实。不要读取无关用户数据。
6. 用户可在Cloudflare D1控制台查看/导出自己的反馈数据。无需发布一个所有人都能访问的反馈列表。运营分析应将正式关、引导、特殊关、老配对和选关页分开，不把测试反馈当玩家数据。
