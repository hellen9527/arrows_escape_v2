# 箭头出逃 300 关设计包

本包包含 **300 个正式关卡设计卡 + 8 个可跳过的引导关**，4.0 已制作固定棋盘并接入游戏。规则与关系校验通过，不代表已证明真人难度合适或有趣。发布记录见 `docs/deployment`。

- [总方案与新人/熟手入口](</Users/leerainli/programs/games/docs/superpowers/specs/2026-09-10-arrow-300-design.md>)
- [C001–C300 逐关内容](</Users/leerainli/programs/games/docs/level-design-300/catalog.md>)
- [T01–T08 教学与熟手差异卡](</Users/leerainli/programs/games/docs/level-design-300/onboarding.md>)
- [代表关的关键关系图](</Users/leerainli/programs/games/docs/level-design-300/representative-cores.md>)
- [结构化设计卡 JSON](</Users/leerainli/programs/games/docs/level-design-300/design-briefs.json>)，供筛选、后续制作与审阅使用；不是游戏路径配置。

新人：T01–T06 → C001；第一次遇到钥匙/双钥匙时提供 T07/T08。熟手：可关闭的本作规则说明 → 推荐 C031，也能自主选择其他阶段入口。两组共用题库，跳过不冒充已通关。

直接同类参考为 Lessmore GmbH 的 [Arrows – Puzzle Escape 官方页面](https://play.google.com/store/apps/details?id=com.ecffri.arrows&hl=en)。具体逐关设计与参数均为本项目方案，未取得该产品内部题库和分流实验数据。

## 完整性核对

2026-09-10 对实际交付文件执行检查：

| 项目 | 结果 |
| --- | --- |
| 正式 ID | C001–C300，连续、无重复、无缺号 |
| 引导 ID | T01–T08，连续，单独计数 |
| 分组 | 10 段，每段 30 个正式设计卡 |
| 模式 | 295 个救援设计、5 个前期清场设计 |
| 设计意图 | 标准 134、挑战 103、综合验证 21、舒缓 42 |
| 内容字段 | 每行都有名称、模式、意图、布局组织、核心关系、验证点 |
| 教学依赖 | 前 90 关无钥匙，91–120 一组，121 起两组；151 起均为三目标 |
| 舒缓内容 | 舒缓行的目标数、钥匙组数均不低于紧前一关；仍须验核心关系与体验 |
| 文本去重 | 标题与核心关系文本没有完全重复；不等于已验证图结构不重复 |
| 文件一致性 | JSON 可解析，正式条目数与 Markdown 相同，本地链接可用 |

上表是设计卡阶段的检查。4.0 的实际布局绑定见 `production-bindings.json`，引擎独立重算结果见 `production-audit.json`，制作解释与验证边界见 `implementation-notes.md`。已验证全部棋盘的坐标、完整求解、目标步数、钥匙和阻挡关系；结构指纹仅筛查疑似重复，不证明图不同构或体验不重复。真人难度、成就感与留存仍需上线后试玩校准。
