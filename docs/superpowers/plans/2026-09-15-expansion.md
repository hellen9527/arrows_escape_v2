# Mainline Expansion Implementation Plan

**Goal:** 审查原300关，追加500张具有明确结构差异的固定关卡，保留全部既有成果，发布到原域名并启用自愿反馈。
**Architecture:** 新扩展数据与配方独立文件，旧300数据字节保持不变；challenge-levels组合两库。沿用游戏引擎、存档版本与主题。离线生成/审计，运行时只解码选中关卡。
**Tech Stack:** TypeScript, React, Vinext, Cloudflare Worker/D1, Node tests.

- [x] 审查代码、复核原始资料，运行原300关引擎审计。
- [ ] tests/expansion.test.ts先验证总量、旧关摘要、300存档连续、新关唯一且可解、预算和结构；先看新增缺失的失败。
- [ ] 新建scripts/authoring/expansion-profile.mjs、expansion-goals.mjs及生成/组装脚本，引用原weave生成器，所有新参数可复现。先验301/310/331/500/800代表样本，再批量生成。
- [ ] 产物lib/game/expansion-data.ts、expansion-briefs.ts；challenge-levels组合库；docs/level-design-expansion存逐关审计，自动化不得写“已证明好玩”。
- [ ] UI章节名称/数量动态化、末章不足30关过滤、反馈服务器关号上限同步；旧300存档、教程、奇遇与配对保持不变。
- [ ] 增加真实通关摘要，区别独立/提示与目标/全清；不弹出反馈邀请。
- [ ] npm test、旧关审计与新关审计、typecheck/lint/build；浏览器以实际UI/WebMCP验证旧关恢复、新关开局到通关、末章、手机与反馈。
- [ ] 独立审查并修复实质问题；提交并推送，按既有main/Cloudflare链发布，验证线上资源与交互、反馈真实落库。
