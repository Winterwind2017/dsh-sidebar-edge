# DSH 侧边栏 · Edge 加载项提审材料

> 本文件是**逐字可用**的提交材料。Partner Center 一共 6 步（上传包 → 可用性 → 属性 → 隐私 → 商店一览 → 提交），
> 每一步下面都对应一段。带 ⚠️ 的地方是**必须先读再决定**的风险点。
>
> 包文件：`../dist/dsh-sidebar-edge-1.0.0.zip`（由 `../tools/build-package.cmd` 生成）
> 截图：`../store/screenshot-1-panel.png`（1280×800）
> 徽标：`../store/logo-300x300.png`（300×300）
> 磁贴：`../store/promo-440x280.png`（440×280，可选）

---

## 0. 提交前必读

⚠️ **审核员无法运行 DSH**。扩展打开的是你本机的 `dsh web` 服务（`127.0.0.1`）。在微软的测试机上没有这个服务，
所以扩展的表现会是"服务离线 / 打开后 401"。按 Edge 开发者政策，这有被判**认证失败**的真实风险。
第 6 步的"认证测试说明"我已经写好，用来尽量降低这个风险，但不能保证通过。**被拒不影响你本地加载使用。**

⚠️ **商标**：扩展名用了中性的「DSH 侧边栏」，但描述里会提到 DeepSeek Harness / dsh web。这是**事实性指代**
（说明它配合什么软件使用），但 DeepSeek 商标不归你所有，微软的知识产权审查仍可能提出异议。

⚠️ **发布者名称**：你确认用 `Winterwind2017`。注意商店列表上的发布者名称在账户层面设定，若你的账户已定名，以账户为准。

⚠️ **账户资质**：新注册的 Edge 开发者账户可能需要完成身份/邮箱验证后才能提交（部分账户还会被要求企业验证）。
若提交流程要求验证，按提示完成即可，我无法代做。

---

## 1. 第 2–3 步：创建扩展并上传包

1. 打开 [Partner Center 开发者仪表板](https://partner.microsoft.com/dashboard/microsoftedge/public/login?ref=dd)（你已登录）
2. 工作区 → **Edge** 卡片 → **创建新扩展**
3. 把 `../dist/dsh-sidebar-edge-1.0.0.zip` 拖到"拖到此处 (.zip)"，等待校验通过
4. 左侧点 **扩展概述** 查看细节 → 左侧点 **包** → **继续**

> 包内含 `manifest.json`（`name`/`description` 使用 `__MSG_*__` 占位符）与 `_locales/en`、`_locales/zh_CN`。
> Partner Center 靠 `_locales` 识别可支持的语言，因此商店一览里应能同时出现 `en-US` 与 `zh-CN` 两个区域设置。

---

## 2. 第 4 步：可用性

| 字段 | 填什么 |
| --- | --- |
| 可见性 | 首次建议先选 **隐藏**：用列表 URL 安装验证一切正常，再改回 **公开**（可从公开改隐藏，也可反向） |
| 市场 | 默认**所有市场**即可 |

填完点右上角 **保存并继续**。

---

## 3. 第 5 步：属性

| 字段 | 填什么 |
| --- | --- |
| 类别 | **生产力**（Productivity） |
| 网站 | 留空，或填你的仓库地址：`https://github.com/<你的用户名>/dsh-sidebar-edge` |
| 支持联系人详细信息 | 你的仓库 Issues 地址，或 `yuchengjin1988@gmail.com`（你本机 git 身份，可自行更换） |
| 成人内容 | 不勾选 |

点 **保存并继续**。

---

## 4. 第 6 步：隐私

### 4.1 单一用途说明（Single purpose）

```
本扩展只有一个用途：在 Microsoft Edge 侧边栏中打开并聚焦用户本机运行的 DeepSeek Harness（dsh web）网页界面，并显示该本机服务是否在线。扩展不代理、不修改、不拦截该界面的任何数据。
```

English（若界面为英文）：

```
This extension has a single purpose: to open and focus a locally running DeepSeek Harness (dsh web) web UI from the Microsoft Edge side panel, and to show whether that local service is online. It does not proxy, modify or intercept any of that UI's data.
```

### 4.2 权限理由（Permission justification）

逐条粘贴：

**`sidePanel`**
```
提供扩展的侧边栏界面：显示本机 DSH 服务的连接状态，并提供"打开/聚焦窗口"按钮。这是扩展唯一面向用户的界面。
```

**`storage`**
```
在用户本机保存三项设置：DSH 服务地址、一次性启动 token（兑换成功后立即清除）、承载窗口的 id 与尺寸。
数据只写入 chrome.storage.local，不做云同步，不外发。
```

**`windows`**
```
打开、聚焦、调整承载 DSH 界面的窗口。因为 DSH 的会话 cookie 是 SameSite=Strict，界面必须在顶层窗口而非跨站 iframe 中运行，扩展需要创建与管理该窗口。
```

**`tabs`**
```
当用户把配置的 DSH 地址改成另一个端口时，把已经打开的承载窗口导航到新地址（复用同一个窗口，而不是再开一个）。不读取页面内容。
```

**主机权限 `http://127.0.0.1/*`、`http://localhost/*`**
```
仅用于探测用户本机的 DSH 服务是否在运行（依据 HTTP 状态码判断，401 也视为在线）。不向任何外部服务器发起请求，扩展没有自己的服务器。
```

### 4.3 你是否使用远程代码？

选 **否，我没有使用远程代码**。所有逻辑都打包在扩展内，无 CDN、无 eval。

### 4.4 数据使用量

- 「你计划现在或将来从用户收集哪些用户数据？」→ **全部不勾选**
- 「我证明以下披露是真实的」→ **勾选**

理由：扩展不收集任何用户数据；地址/token/窗口尺寸只存在本机 `chrome.storage.local`。

### 4.5 隐私政策 URL

填入你确认后的公开地址（见 `DEPLOY-PAGES.md` 的部署步骤），例如：

```
https://<你的GitHub用户名>.github.io/dsh-sidebar-edge/
```

> 若审阅人认为"不收集数据"因此无需隐私政策，也可在该页选"否"；但**提供可访问的政策 URL 更稳妥**，
> 我们已把中英文政策写好（`../site/index.html`）。

---

## 5. 第 7 步：Microsoft Store 一览（每种语言）

先确认列表中同时有 **中文（简体）** 与 **英语（美国）** 两行；若只有一行，见文末"排错"。

### 5.1 中文（简体）

- **扩展名称**：`DSH 侧边栏`（来自 manifest，只读）
- **简短说明**（≤132 字符，来自 manifest，只读）：
  `在 Edge 侧边栏一键打开本机运行的 DeepSeek Harness（dsh web）界面，并随时查看连接状态。`
- **说明**（≥250 字符，逐字粘贴）：

```
DSH 侧边栏让你在 Microsoft Edge 的侧边栏里一键打开本机运行的 DeepSeek Harness（dsh web）界面，并随时看到它是否在线。

【它做什么】
· 侧边栏面板显示本机 DSH 服务状态（在线 / 离线），并提供"打开 / 聚焦 / 关闭"按钮。
· 记住你的 DSH 地址；可自动探测常见端口（19387、3080、3000、4096、5173、8080、8000、9000）。
· 承载界面的窗口会记住位置与尺寸，把它拖到屏幕右侧即可当常驻侧栏使用。
· 支持中文与英文界面，跟随浏览器语言。

【使用前提】
需要你本机已经运行 DeepSeek Harness（即 dsh web 服务）。首次使用时，把 DSH 启动时打印的带一次性 token 的链接（形如 http://127.0.0.1:19387/?token=…）粘贴到侧边栏的"启动 token"里保存即可；token 兑换成功后会自动从本地存储中清除，此后依赖 DSH 自己的会话 cookie 保持登录。

【为什么界面在窗口里而不是嵌在侧边栏里】
dsh web 的会话 cookie 是 HttpOnly; SameSite=Strict。在扩展侧边栏中它属于跨站 iframe：换取登录态与普通请求都能带上 cookie，但 WebSocket 握手带不上，而 DSH 的所有 RPC 都走 WebSocket，于是界面会"看起来加载成功、功能全部失效"。作为顶层窗口打开时 cookie 正常随握手发出，因此界面运行在窗口中。

【隐私】
不收集、不存储、不传输任何个人信息；不含分析、广告或追踪代码；不加载远程代码。扩展只访问你自己电脑上的回环地址（127.0.0.1 / localhost），没有开发者服务器。
```

- **扩展徽标**：上传 `../store/logo-300x300.png`
- **小型促销磁贴**（可选）：上传 `../store/promo-440x280.png`
- **屏幕截图**（可选，最多 6 张）：上传 `../store/screenshot-1-panel.png`
- **搜索词**（可选，≤7 个、合计 ≤21 字）：

```
DSH, DeepSeek Harness, 侧边栏, 本地助手, dsh web
```

### 5.2 英语（美国）

- **扩展名称**：`DSH Sidebar`
- **简短说明**：`Open a running DeepSeek Harness (dsh web) UI from the Edge side panel and keep it one click away.`
- **说明**（≥250 字符）：

```
DSH Sidebar opens a locally running DeepSeek Harness (dsh web) UI from the Microsoft Edge side panel and keeps its connection state visible.

What it does
· The side panel shows whether your local DSH service is online and offers Open / Focus / Close controls.
· It remembers your DSH address and can probe the common ports (19387, 3080, 3000, 4096, 5173, 8080, 8000, 9000).
· The window that hosts the UI remembers its position and size, so you can dock it to the right edge and keep it as a permanent side panel.
· The interface is localized in English and Simplified Chinese, following your browser language.

Requirements
A running DeepSeek Harness instance on the same machine (the dsh web service). On first use, paste the one-time token link that dsh prints (e.g. http://127.0.0.1:19387/?token=…) into the panel's Launch token field and save. The token is cleared from local storage as soon as it is exchanged; the session is then kept by DSH's own cookie.

Why the UI runs in a window rather than inside the panel
The dsh web session cookie is HttpOnly; SameSite=Strict. Inside an extension side panel it belongs to a cross-site iframe: the token exchange and ordinary requests carry the cookie, but the WebSocket handshake does not — and every DSH RPC travels over WebSocket, so the UI would appear to load while every feature failed. As a top-level window the cookie is sent normally, so the UI runs in a window.

Privacy
No personal data is collected, stored or transmitted; no analytics, ads or tracking; no remote code. The extension only contacts loopback addresses on your own machine (127.0.0.1 / localhost) and has no developer server.
```

- **其余字段**同中文，可点字段下方的 **复制** 把徽标/磁贴/截图复制到所有语言。

---

## 6. 第 8 步：认证测试说明（逐字粘贴）

这是**最影响成败**的一段。填在"提交扩展"页的 **认证说明** 文本框：

```
【本扩展的前置条件】本扩展配合"本机运行的 DeepSeek Harness（dsh web）"使用。它打开的是用户自己电脑上的回环地址（http://127.0.0.1:<port>/），不含任何远程后端。因此在不运行该服务的测试机上，扩展会显示"无法连接"，打开窗口后会显示 401 认证提示——这是预期行为，不是崩溃或功能缺失。

【如何在 5 分钟内完整验证】
1) 本扩展不依赖任何第三方账号。安装后点工具栏图标即可打开侧边栏面板。
2) 面板会显示"服务离线"，这是正常状态（本机没有 DSH）。
3) 若需要验证"在线"与"打开界面"路径，请在本机运行任意一个在 127.0.0.1 上监听的 HTTP 服务即可让状态变为在线；运行 DeepSeek Harness（dsh web）时可完整验证打开界面。若无法运行，请以如下方式确认功能完整：
   - 打开扩展的选项页（扩展详情 → 扩展选项），确认地址栏、保存、自动检测端口、"浏览器启动时自动打开"开关均可用；
   - 修改"DSH 地址"为任意端口并保存，确认提示"已保存"；
   - 点"自动检测端口"，确认给出探测结果（未启动时应提示未检测到）；
   - 点"打开 DSH 窗口"，确认创建出一个标题为 http://127.0.0.1:<port> 的独立窗口（内容为 401 认证提示属预期）；
   - 再次点击"在侧栏窗口打开 DSH"，确认按钮变为"重新加载侧栏窗口"，且点击后复用同一窗口而不是新建。
4) 扩展申请主机权限 127.0.0.1 / localhost 仅用于探测本机服务是否在运行（HTTP 401 也计为在线），不会向任何外部服务器发送请求。
5) 若测试机为无界面环境，请以扩展的侧边栏/选项页静态界面与上述按钮行为作为功能证据。

【已知限制，请勿据此判定失败】
- 侧边栏内不直接嵌入界面：dsh web 的会话 cookie 为 HttpOnly; SameSite=Strict，跨站 iframe 中 WebSocket 握手不带该 cookie，而 DSH 的所有 RPC 均走 WebSocket，会导致界面"加载成功但功能失效"。因此界面在顶层窗口中运行，侧边栏负责启动与状态显示。
- 首次使用需要用户粘贴一次 dsh 打印的一次性 token；扩展在兑换成功后立即将其从本地存储清除。
```

---

## 7. 提交与之后

1. 回到 **Microsoft Store 一览**，确认每行语言状态为 **完成** → 点右上 **发布**
2. 在"提交扩展"页粘贴上面的认证说明 → 再点 **发布**
3. 认证最长约 **7 个工作日**；通过后状态变为 **在 Microsoft Store 中**
4. 通过后建议先把可见性从 **隐藏** 改为 **公开**

---

## 8. 排错

| 现象 | 处理 |
| --- | --- |
| 上传 zip 报校验错误 | 确认 zip 的**根目录**直接是 `manifest.json`（不要多一层文件夹）；重新运行 `../tools/build-package.cmd` |
| 商店一览只出现一个区域设置 | manifest 必须用 `__MSG_*__` 且存在 `_locales`（本包已满足）。若仍只有一行，删掉该语言行后重新添加，或重新上传包触发重新解析 |
| 说明字段报长度不足 | 中文/英文说明均已 ≥250 字符；若被截断，确认没有把开头的中括号标题删掉 |
| 隐私页权限列表缺少某项 | 说明包不是最新版：重新上传 `../dist/dsh-sidebar-edge-1.0.0.zip` |
| 提交时报 correlationId: undefined | 清缓存/Cookie，用 InPrivate 窗口重试 |
| 被标记为恶意软件/PUA | 检查是否误加了 `cookies`/`webRequest` 等未使用权限；本包权限已最小化 |

---

## 9. 版本更新时

改完 `../extension/` 后：

1. 提升 `../extension/manifest.json` 的 `version`
2. 跑 `../tools/build-package.cmd` 重新打包
3. 在 Partner Center 的 **包** 页上传新 zip，提交新版本即可（商店一览与隐私信息会保留）
