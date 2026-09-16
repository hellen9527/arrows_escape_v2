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

## 正式启用（待取得D1权限，不能略过）

1. 当前OAuth缺`d1:write`。仅在用户确认新增数据库权限后，用限于所需范围的Wrangler授权，保留现有Worker部署权限；不要默认申请所有Cloudflare权限。
2. 查询并复用或创建`arrows-escape-feedback`数据库，记录Cloudflare实际返回的ID。
3. 在生产`wrangler.jsonc`添加`d1_databases`，binding为`FEEDBACK_DB`；添加`FEEDBACK_RATE_LIMITER`限频绑定。不得用本机ID替代真实ID。
4. 对这个新增数据库应用`migrations/0001_feedback.sql`，确认表已建立。
5. 按GitHub/Cloudflare原部署链发布已验证提交，再从正式域名实际提交一条明确标注的验收反馈，并只查询这条验收记录核实。不要读取无关用户数据。
6. 用户可在Cloudflare D1控制台查看/导出自己的反馈数据。无需发布一个所有人都能访问的反馈列表。运营分析应将正式关、引导、特殊关、老配对和选关页分开，不把测试反馈当玩家数据。
