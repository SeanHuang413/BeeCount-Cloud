# BeeCount-Cloud 开发规则

## 项目摘要

BeeCount-Cloud 是一个单仓库全栈项目：

- 后端：Python 3.11+、FastAPI、SQLAlchemy、Alembic。
- 前端：React 18、TypeScript、Vite、pnpm workspace。
- 默认数据库：SQLite；可选 PostgreSQL。
- 核心数据模型：`sync_changes` 追加式同步事件流 + `read_*_projection` / `user_*_projection` 读投影。
- Web 写入与移动端 `/sync/push` 最终都必须保持同步事件和读投影的一致性。
- WebSocket 用于变更通知；客户端收到通知后通过 read API 或 `/sync/pull` 刷新数据。

## 关键目录

| 路径 | 职责 |
|---|---|
| `src/main.py` | FastAPI 应用装配、路由注册、生命周期任务、静态 Web 托管。 |
| `src/routers/` | 后端 API：认证、read、write、sync、管理、导入、AI、附件、共享账本等。 |
| `src/routers/write/` | Web 写入 API；每类实体分文件，公共写入引擎在 `_shared.py`。 |
| `src/routers/sync/` | 移动端增量 push、pull、full sync、账本同步接口。 |
| `src/routers/read/` | 面向 Web 的投影查询、工作区、统计和汇率读取接口。 |
| `src/models.py` | SQLAlchemy ORM 模型。 |
| `src/schemas.py` | Pydantic 请求/响应模型。 |
| `src/sync_applier.py` | 同步事件合并、LWW、projection 分发。 |
| `src/projection.py` | 读投影 upsert/delete、rename cascade、附件关联清理。 |
| `src/snapshot_builder.py` | 从投影按需构造临时 snapshot。 |
| `src/snapshot_mutator.py` | 账户、分类、标签、预算、交易的 snapshot 结构增删改逻辑。 |
| `src/services/` | AI、备份、导入、汇率、数据清理等领域服务。 |
| `src/mcp/` | MCP Streamable HTTP 服务、PAT 鉴权与工具。 |
| `alembic/versions/` | 数据库迁移；只新增，不改已发布迁移。 |
| `frontend/apps/web/` | Web 应用入口、路由、页面、上下文和应用级组件。 |
| `frontend/packages/api-client/` | 集中式类型化 HTTP API client。 |
| `frontend/packages/web-features/` | 可复用业务面板、领域组件与格式化工具。 |
| `frontend/packages/ui/` | 通用 UI、主题、国际化基础组件。 |
| `tests/` | 后端集成、接口、同步和回归测试。 |

## 关键入口

- 后端运行入口：`server.py` → `src.main:app`
- 后端应用装配：`src/main.py`
- 前端入口：`frontend/apps/web/src/main.tsx`
- Web 路由与登录态：`frontend/apps/web/src/App.tsx`
- API 基础层：`frontend/packages/api-client/src/http.ts`
- WebSocket / 增量拉取：`frontend/apps/web/src/context/SyncSocketContext.tsx`
- Docker 入口：`Dockerfile` 中 `alembic upgrade head && uvicorn server:app --host 0.0.0.0 --port 8080`

## 常用命令

```bash
# 后端环境与迁移
make setup-backend
make migrate

# 本地开发
make dev-api
make dev-web
make dev-up

# 可选 PostgreSQL
make dev-db

# 演示数据
make seed-demo

# 后端质量检查
make test
make lint
make typecheck

# 前端检查
pnpm -C frontend install
pnpm -C frontend/apps/web test:unit
pnpm -C frontend/apps/web exec tsc --noEmit --skipLibCheck
pnpm -C frontend/apps/web build
```

## 修改前必须检查

1. 运行 `git branch --show-current`，确认当前分支是 `develop`。
2. 运行 `git status --short --branch`，确认没有未知的用户改动；不要覆盖、删除或重置已有改动。
3. 修改同步、投影、Web 写入或移动端同步逻辑前，必须阅读：
   - `CLAUDE.md`
   - `docs/SYNC_ARCHITECTURE.md`
4. 修改 API 前，先检查对应 `src/routers/<group>/`、`src/schemas.py`、`frontend/packages/api-client/` 和 `tests/` 中的同类测试。
5. 修改数据库字段前，检查 `src/models.py`、相关 projection、schema、API client、前端类型，以及 `alembic/versions/` 当前迁移链。
6. 修改共享账本逻辑前，检查 owner/editor/viewer 权限、资源隔离、成员 fan-out 和删除清理。
7. 修改认证前，检查 JWT、refresh token、device、scope、TOTP 与 PAT 的隔离关系。

## 同步与数据一致性规则

- `sync_changes` 是追加式事件流：禁止更新历史事件，禁止手动修改 `change_id`。
- 新代码不得把 `ledger_snapshot` 当作持续写入的主数据源；它仅用于兼容和从 projection 按需构建临时状态。
- Web `/write/*` 与移动端 `/sync/push` 对同一业务字段必须保持等价语义。
- 交易、预算、账本是 ledger-scoped；账户、分类、标签是 user-global。不得混淆二者的 `ledger_id`、查询范围、权限或投影主键。
- 新增同步实体时，必须同步处理：
  1. Alembic migration；
  2. ORM model；
  3. Pydantic schema；
  4. `sync_applier.py` 的 merge/upsert/delete 分发；
  5. projection 写入与删除；
  6. read/write/sync API；
  7. 前端 api-client 类型和调用；
  8. 回归测试。
- 移动端可能发送部分字段更新；同步层必须保留已有字段，不能让缺失字段覆盖为默认值或 `None`。
- account/category/tag 改名时，必须验证交易投影中去规范化名称字段的 rename cascade。
- 修改交易金额或多币种字段时，必须同时检查 Web 写入路径与 `/sync/push` 合并路径。
- WebSocket 只是通知机制；不得把它作为唯一的数据一致性来源。页面应通过 read API 或 `/sync/pull` 重新取数。
- 批量导入、批量删除和写入必须保证 commit 后才广播，失败时必须 rollback，不能让客户端看到脏数据。

## API 与前端规则

- 新增普通 HTTP API 时，按现有领域放到对应 `src/routers/<group>/`，不要把业务逻辑堆进 `__init__.py` 或 `src/main.py`。
- Web 写入的公共逻辑放在 `src/routers/write/_shared.py`；单一资源 endpoint 放在对应实体文件。
- 前端页面不得自行复制鉴权、refresh 或 fetch 逻辑；通过 `frontend/packages/api-client/` 暴露新 API。
- 分类接口的 `tx_count` 保持“交易直接引用该分类 ID 的笔数”语义，供父级候选校验等逻辑使用；分类卡片展示时，子分类显示自身笔数，主分类显示自身笔数与所有直属子分类笔数之和。不得直接把后端字段改成父级汇总值。
- 新 API 必须有 TypeScript 类型、错误处理和至少一个后端测试。
- 保持 `api-client` → `web-features` → `apps/web` 的依赖方向；不要让基础 package 依赖应用层页面。
- 优先新增独立 feature、页面、router、service 或 adapter；避免持续膨胀高冲突文件，如：
  - `src/routers/write/_shared.py`
  - `src/sync_applier.py`
  - `src/projection.py`
  - `src/models.py`
  - `src/schemas.py`
  - `frontend/apps/web/src/pages/sections/TransactionsPage.tsx`
  - `frontend/packages/api-client/src/types.ts`

## 数据库与迁移规则

- 只新增 Alembic migration；禁止修改、重排或删除已提交的迁移文件。
- 迁移必须兼容 SQLite 和 PostgreSQL。
- 修改表结构时必须检查数据回填、升级路径和降级可行性。
- SQLite 生产配置依赖 WAL、busy timeout 和外键开启；不要移除 `src/database.py` 中的相关配置。
- 任何涉及多表删除、附件、备份、恢复或账本删除的修改，都必须确认事务边界和级联清理行为。

## 修改后必须运行的检查

最低要求：

```bash
make lint
make typecheck
make test
pnpm -C frontend/apps/web test:unit
pnpm -C frontend/apps/web build
```

按改动范围追加：

- 改同步、projection、交易、账本、共享账本、多币种：
  - `pytest -q tests/test_projection_consistency.py`
  - `pytest -q tests/test_sync_concurrency.py`
  - 相关 `test_sync_*`、`test_shared_ledger_*`、`test_tx_*`、`test_user_global_sync.py`
- 改认证、权限、2FA、PAT：
  - 相关 `test_auth_*`、`test_security_scopes.py`、`test_two_factor_auth.py`、`test_pats_api.py`
- 改导入：
  - `pytest -q tests/test_import_csv.py`
- 改备份：
  - 相关 `test_backup_*`
- 改 MCP：
  - 相关 `test_mcp_*`
- 改 Alembic 或数据库兼容逻辑：
  - 至少在 SQLite 和 PostgreSQL 环境分别运行相关测试。

## Git 分支规则

- `upstream/main` 是官方源码。
- `main` 只用于同步 `upstream/main`。
- 禁止在 `main` 上进行二次开发。
- `develop` 是长期开发分支。
- 自定义功能只提交到 `develop`。
- 修改前必须确认当前分支是 `develop`。
- 禁止向 `upstream` push。
- 禁止 force push。
- 未经用户明确要求，不得自动 push。
- 未经用户明确要求，不得切换分支、创建分支、提交、合并、rebase 或 reset。

## 降低 upstream 合并冲突的原则

- 将自定义功能优先放入新文件、新 router、新 service、新 feature package 或独立页面。
- 不要为了局部需求重构官方核心模块；功能改动、格式化、重命名和依赖升级必须分开提交。
- 尽量通过新增扩展点或适配器实现 fork 功能，而非修改同步协议、核心 schema、projection 结构。
- 如必须修改同步核心，提交必须小且完整，说明协议变化，并包含 Web 写入和 mobile sync 两条路径的测试。
- 前端 fork 功能优先独立为 feature/component；不要直接堆入 `TransactionsPage`、`AccountsPanel`、`CategoriesPanel` 等大文件。
- 后端 fork 功能优先新增 router/service；避免无关修改 `main.py`、`models.py`、`schemas.py`、`write/_shared.py`。
- 每次同步 upstream 前后都运行完整后端与前端检查；解决冲突后优先验证 schema、同步、projection 和共享账本行为。
- 依赖限制属于兼容性契约。例如 `mcp` 当前固定 `<2`；未完成完整迁移和 MCP 测试前不得解除。

## 当前 upstream 功能边界

- `develop` 当前已合入官方 `1.6.3`。该版本的“智能记账支持多币种”仅扩展 AI 文本/图片记账的币种解析和草稿确认，不新增独立页面或普通交易多币种入口。
- 官方周年皮肤在 Web 端仅提供“个人资料 → 皮肤”的分组下拉、动效开关和偏好同步；Web 本身不渲染头部皮肤，实际皮肤效果由移动端 App 展示。
- Git tag、Git 分支和运行时版本号彼此独立。本地运行时版本由 `APP_VERSION` / `VITE_APP_VERSION` 注入，不能仅根据是否合入某个 tag 判断页面显示的版本号。

## Sean 自定义报表与云端扩展

### 已有自定义功能

- `sean_spend-insights`：省钱洞察，路由 `/app/spend-insights`，默认本月。可按本月、上个月、近 3/6/12 个月或全部数据分析支出和收入；分类、订阅及高频消费可在弹窗中查看对应交易。
- `sean_report-center`：我的报表，路由 `/app/sean-reports`，默认本月。提供分类消费结构、收入来源、标签项目结算、高频消费、大额支出复核、周现金流和转账流向；资产概览已迁移到独立资产中心，不得在我的报表重复展示或重复请求账户数据。分类消费结构在页面内按一级/二级分类、金额、占比和笔数展示，不应改成分类点击弹窗。
- `sean_monthly-comparison`：近 12 个月收支对比，路由 `/app/sean-monthly-comparison`。最新月份置顶，忽略收支均为零的月份，展示收入、支出、结余及环比曲线；点击月份在当前页面弹窗展示主要支出分类和当月全部收支明细。
- `sean_asset-trends`：净资产长期趋势，路由 `/app/sean-asset-trends`。只读使用现有净资产历史接口，支持近 3/6/12 个月切换，展示净资产、资产和负债曲线、净资产增长率及阶段最高点/最低点；不要在此页重复账户列表。
- `sean_actual-spend`：实际支出，路由 `/app/sean-actual-spend`，默认本月且独立于“我的报表”。按已启用的分类预算显示预算、支出、报销、实际承担和剩余；实际承担为支出减去报销，最低为 0。月份选择统一使用 `sean_time/MonthSwitcher`，允许左右箭头切换且不得选择未来月份。
- `sean_assets`：资产中心，路由 `/app/sean-assets`。只读使用现有账户、汇率和净资产历史数据，展示净资产、总资产、总负债、环比、资产负债率、资产构成、账户分组及信用卡额度使用情况；不得修改官方账户、交易、同步或资产计算逻辑。
- `sean_tag-settlement`：标签结算扩展。标签列表以黄色圆点标示并显示结余；详情沿用官方标签详情框并补充累计结余。
- 官方预算页为 `/app/budgets`，不是 Sean 自定义功能；它支持总预算、分类预算和当前周期已用金额。不要复制或重写预算业务逻辑。

### 目录与边界

- 自定义页面放在 `frontend/apps/web/src/pages/sections/sean_*.tsx`。
- 自定义 feature 放在 `frontend/packages/web-features/src/features/sean_*/`，不要把业务实现塞进官方大组件。
- Sean 报表不进入主导航；入口在头像下拉菜单的“自定义功能”分组。预算保留在同一头像菜单的官方“工具”分组，避免重复入口。
- 头像下拉菜单必须在导航、打开弹窗或退出后主动关闭；菜单高度超过可视窗口时应在菜单内部纵向滚动，并避免带动后方页面滚动。
- 允许为接入功能做最小修改的文件仅限路由、导航、导出和文案：
  - `frontend/apps/web/src/App.tsx`
  - `frontend/apps/web/src/state/router.ts`
  - `frontend/packages/web-features/src/nav.ts`
  - `frontend/packages/web-features/src/index.ts`
  - `frontend/apps/web/src/i18n/*.ts`
- 报表默认只读现有 read API 和交易数据；不要为报表修改移动端同步协议、`sync_changes`、projection、核心 schema 或数据库。只有确实无法由现有数据计算时，才先提出独立 API 方案并获得确认。
- `sean_actual-spend` 是云端只读对冲视图，绝不修改官方预算的已用金额、App 交易、分类或同步数据。仅将“同名预算分类下、名称含 `报销` / `reimburs` 的收入二级分类”计入报销；普通收入和未归类报销不得自动对冲。
- “幸福报销 / 家庭报销”是明确的特殊映射：父级 `幸福报销` 下的子级 `家庭报销`，按当月支出占比分摊对冲支付分类 `买菜` 和 `幸福聚餐`；不得扩大到其他普通收入或分类。
- 点击报表项目优先在当前页面打开明细弹窗；除非用户明确要求，否则不跳转到官方交易页面，也不改变原有交易写入行为。
- 转账是账户之间的资金调拨，必须独立于收入、支出、净结余和预算统计；转账报表可展示总额、笔数、最大单笔、账户流向及明细。
- 分类消费结构依赖分类的 `level` 与 `parent_name`。只有云端分类数据已同步父子关系时才显示二级分类；不得从交易备注或分类名称猜测层级。
- BeeCount CSV 导入必须识别 `分类`、`二级分类`（也兼容 `子分类` / `子分類`）列：一级分类为 parent，二级分类为交易 leaf，并按父级在前的顺序创建分类。修改导入映射时必须覆盖这条路径。

### 资产中心口径

- 资产中心当前只支持本位币种总览；多币种缺少汇率时必须明确提示，原币种账户和小计不得直接混加。
- 账户优先使用官方 `account_type`；官方类型缺失时，允许在资产中心展示层按账户名和银行名识别储蓄卡、信用卡、投资、支付宝、微信、现金、房产、车辆、保险、社会保障和贷款，但不得回写或修改官方账户类型。
- 资产账户大类至少区分：储蓄卡、电子现金、现金、投资账户、房产、车辆及其他资产。四大行（工商银行、农业银行、中国银行、建设银行）在储蓄卡和信用卡分组中优先排列。
- 信用卡和贷款属于负债；信用卡余额按当前欠款展示。信用卡读取官方 `credit_limit`、`billing_day`、`payment_due_day`，展示账单日、还款日和额度使用率进度条；未设置额度时不得显示或猜测使用率。
- `社会保障` 是独立大分组，包含公积金、社保、社会保险、医保和医疗保险；`保险` 也是独立大分组。二者排列在负债账户区块下方，仅展示账户名称、余额、账户数和小计，不提供明细点击，因为官方当前不支持这些账户录入流水。
- 每个分组顶部展示账户数、分币种总金额及其占总资产或总负债比例；每个账户展示其占本组金额比例。信用卡的“占本组金额”和“额度使用率”是两个不同指标，不得合并。
- 资产构成只统计正余额资产，负债单独列示。图例展示分类名称、金额和占比；分类颜色必须由稳定的类型到颜色映射决定，不得按数组序号循环导致颜色重复或刷新后变化。
- 下方账户图标必须复用资产构成的稳定分组颜色；信用卡和贷款使用独立负债色。图标颜色只表达分组，账户余额仍使用系统收入/支出主题色。
- 账户列表在窄屏保持紧凑的“图标 + 账户信息 + 余额”主结构，不重复显示“当前余额 / 查看明细”等冗余文案；必要的账户占比、银行卡信息和信用卡额度信息仍需保留。
- 净资产顶部保留净资产、总资产、总负债、较上月金额与比例以及资产负债率；不要再增加重复的流动资产、账户完整性等统计卡。

### 视觉、依赖与验证

- 收入和支出颜色必须跟随系统主题：使用 `text-income`、`text-expense` 或 `rgb(var(--income-rgb))`、`rgb(var(--expense-rgb))`；不要硬编码红绿等收支颜色。黄色只可用于标签结算提示，不代表收支。
- 分类自定义图片保留高分辨率源文件并按使用场景显示：普通分类卡片约 `42px`、紧凑卡片约 `34px`、分类详情约 `40px`，使用 `object-fit: contain` 避免裁切；Material 图标保持原有较小尺寸，不得全局统一放大到源图片像素尺寸。
- 图表统一使用 `recharts`，并保持为 `frontend/packages/web-features/package.json` 的直接依赖；依赖变更后必须同步更新 `frontend/pnpm-lock.yaml`，确保 Docker 的 frozen lockfile 安装可用。
- 修改任一 `sean_*` 功能后，至少运行对应单元测试、`pnpm -C frontend/apps/web exec tsc --noEmit --skipLibCheck` 和 `pnpm -C frontend/apps/web build`；涉及数据计算时补充或更新该 feature 的分析函数测试。
