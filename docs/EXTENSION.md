# DSH 侧边栏（Microsoft Edge 扩展）

在 Microsoft Edge 的**侧边栏**里一键打开 DeepSeek Harness（`dsh web`）的界面，并随时查看它是否在线。

- 侧边栏：连接状态 + 启动/聚焦/关闭 + 端口自动检测
- 承载界面：一个常驻的窄窗口（看起来就像侧栏），由扩展打开与聚焦
- 不改 DSH 源码、不做中间人代理、不改写 DSH 的 cookie 或签名

---

## 1. 为什么要用「窗口」承载界面（而不是把界面嵌进侧边栏）

这不是偷懒，而是 `dsh web` 的会话机制决定的。

`dsh web` 的浏览器会话 cookie 是 `HttpOnly; SameSite=Strict; Path=/`，每个进程只打印一次
`http://127.0.0.1:<port>/?token=…`，token 只在 `GET /` 上兑换一次并换成该 cookie。扩展侧边栏页面运行在
`chrome-extension://` 源，它嵌入的 DSH 页面属于**跨站 iframe**。实测（复刻了 DSH 的 token→cookie 流程，在真实 Edge 中验证）：

| 场景 | token 兑换 | 普通 fetch 带 cookie | **WebSocket 握手带 cookie** |
| --- | --- | --- | --- |
| 扩展侧边栏内的跨站 iframe | ✅ | ✅ | ❌ 握手 `cookie=no` → 401 → 套接字 1006 |
| 同一页面作为顶层文档（窗口/标签页） | ✅ | ✅ | ✅ 握手 `cookie=YES` → 101 |

DSH 的所有 RPC 都走 WebSocket。也就是说，把界面嵌进侧边栏时它会**看起来加载成功，但功能全部失效**。
因此本扩展把界面放在顶层窗口（顶层文档与自身同站，Strict cookie 正常随握手发出），
侧边栏则作为启动器与状态面板——这也是 Chrome/Edge 上同类产品的通行做法。

> 若要让界面真正嵌进侧边栏，需要改动 DSH 宿主（放宽 cookie 的 `SameSite`、为扩展源单独授权，或自建反向代理）。
> 那属于修改 DSH 自身安全模型，本扩展刻意不做。

## 2. 安装（加载已解压的扩展）

1. Edge 地址栏打开 `edge://extensions/`
2. 打开左下角 **开发人员模式**
3. 点 **加载解压缩的扩展**，选择本仓库的 `extension` 目录（本机为
   `D:\bililive\DeepHarness\dsh-edge-extension\extension`）
4. 工具栏出现插件图标；点它（或按 `Ctrl+Shift+E` 打开侧边栏列表选择本插件）即打开侧边栏

## 3. 首次配置：拿到带 token 的链接

DSH 桌面端启动时会在控制台/日志里打印形如
`dsh web: http://127.0.0.1:19387/?token=<43 位随机串>` 的一行，并且通常会自动在浏览器打开它。
**在它被消费之前**把整条 URL 复制下来：

1. 打开侧边栏 → 「连接设置」
2. 把整条 URL（含 `?token=…`）粘到「启动 token」输入框——扩展会自动解析出地址与 token
3. 点 **保存**，再点 **在侧栏窗口打开 DSH**

token 是一次性的：兑换成功后扩展会把它从本地存储中清除，之后窗口靠会话 cookie 保持登录（默认 30 天）。
如果窗口里出现 `dsh web authentication required: reopen the URL printed by dsh web.`，
说明这次没有可用 token，按上面步骤重新粘一次即可。

> 提示：如果你的 Edge 里**已经**有一个登录好的 DSH 标签页，直接把它拖到窗口右侧当侧栏也可以，
> 不需要本扩展；本扩展的价值在于「一键打开 + 状态可见 + 记住地址」。

## 4. 使用

| 动作 | 说明 |
| --- | --- |
| 在侧栏窗口打开 DSH | 没有窗口时新建一个窄窗口；已有窗口且地址相同时只聚焦；地址不同时把该窗口导航到新地址 |
| 自动检测端口 | 依次探测 `19387`（桌面端默认）、`3080 / 3000 / 4096 / 5173 / 8080 / 8000 / 9000` |
| 关闭窗口 | 关闭承载界面的窗口 |
| 设置页 | 扩展详情 → 扩展选项：同一套设置 + 「浏览器启动时自动打开」 |

窗口尺寸会被记住，重新打开时保持一致，方便固定在屏幕右侧当侧栏用。

## 5. 权限说明

| 权限 | 用途 |
| --- | --- |
| `sidePanel` | 提供侧边栏界面 |
| `storage` | 保存地址、一次性 token、窗口 id 与尺寸 |
| `windows` / `tabs` | 打开/聚焦承载窗口，地址变化时导航该窗口 |
| `host_permissions: http://127.0.0.1/*, http://localhost/*` | 仅用于探测服务是否在线 |

扩展不做任何数据外发；除本机回环地址外不访问任何域。

## 6. 目录结构

```
extension/            可直接加载的扩展，也是提交包的根目录
  manifest.json       MV3 清单（name/description 走 __MSG_*__ 以支持多语言）
  background.js       service worker：设置、端口探测、窗口生命周期
  i18n.js             极小的多语言层（chrome.i18n + data-i18n 扫描）
  sidepanel.html/.css/.js   侧边栏界面
  options.html/.js    设置页
  icons/              图标（由 ../tools/make_icons.py 生成，无第三方依赖）
  _locales/en, _locales/zh_CN   中英文文案（Partner Center 靠它识别语言）
tools/
  make_icons.py       生成图标：python ../tools/make_icons.py [尺寸 输出路径]
  make_store_assets.py  生成商店促销磁贴（440×280）
  build-package.cmd   打包成 dist/dsh-sidebar-edge-<版本>.zip
  verify-package.mjs  校验提交包（结构、引用文件、双语键一致性）
  run-isolated-dsh.cmd  起一台隔离的 dsh web，供手动验证用
  store-screenshot.mjs, store-screenshot-gui.mjs  抓 1280×800 商店截图
store/                商店素材：徽标、促销磁贴、截图
site/                 隐私政策页（中英双语）与 Pages 部署说明
dist/                 打包产物（提交给 Partner Center 的 zip）
STORE.md              提审材料：每个字段逐字可粘贴的文案 + 认证测试说明
_probe/               判定架构用的实验脚手架（复刻 DSH 鉴权、CDP 驱动），可整目录删除
```

## 7. 发布到 Edge 加载项商店

见 [STORE.md](STORE.md)：其中每一节对应 Partner Center 的一个步骤，所有字段（说明、权限理由、
单一用途、数据披露、**认证测试说明**）都是逐字可粘贴的，并标注了风险点。

打包与自检：

```powershell
..\tools\build-package.cmd                  # 产出 ..\dist\dsh-sidebar-edge-1.0.0.zip
# 解压后跑结构校验（沙箱下 Node 不能自己起子进程，所以分两步）
```

> ⚠️ 提交前请读 `STORE.md` 第 0 节：扩展依赖本机 `dsh web`，审核员无法运行它，
> 存在被判定"无法验证"的真实风险。

## 8. 排错

| 现象 | 原因与处理 |
| --- | --- |
| 窗口显示 `authentication required` | 没有有效 token：按第 3 节重新粘一次带 token 的 URL |
| 侧边栏显示「无法连接」 | DSH 未运行，或端口不同：点「自动检测端口」或手动填写 |
| 点图标没有反应 | 打开 `edge://extensions/` 确认扩展已启用；再点一次图标 |
| 换了 DSH 端口 | 在设置里改地址并保存；下次打开会导航到新地址 |
| 想把界面固定在屏幕侧边 | 把窗口拖到屏幕右侧；Windows 可用 `Win + →` 之类的方式贴边 |

## 9. 开发与验证

- 无构建步骤：改完 `extension/` 里的文件，在 `edge://extensions/` 点一次 **重新加载** 即可
- 改了 `manifest.json` 的 `version` 后重新打包：`..\tools\build-package.cmd`
- 多语言：新增界面文案要同时加到 `_locales/en/messages.json` 与 `_locales/zh_CN/messages.json`
  （两边键必须一致，`..\tools\verify-package.mjs` 会校验）
- `_probe/` 内含架构判定的完整实验：`mock-auth-server.mjs`（复刻 DSH 的 token→cookie→WebSocket 门禁）
  与若干 CDP 驱动脚本，可用来回归验证「iframe 不带 cookie、顶层带 cookie」这一结论