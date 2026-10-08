# DSH Sidebar — Microsoft Edge 扩展

在 Microsoft Edge 的**侧边栏**里一键打开本机运行的 **DeepSeek Harness（`dsh web`）** 界面，并随时看到它是否在线。

> 非官方扩展，与 DeepSeek 无隶属关系；仅以事实性方式说明它配合哪个软件使用。

## 为什么界面在窗口里，而不是嵌在侧边栏里

`dsh web` 的会话 cookie 是 `HttpOnly; SameSite=Strict`。在扩展侧边栏中它属于**跨站 iframe**：
token 兑换与普通请求都能带上 cookie，但 **WebSocket 握手带不上**——而 DSH 的所有 RPC 都走 WebSocket。
实测结果（复刻 DSH 的 token→cookie 流程，在真实 Edge 中验证）：

| 承载位置 | token 兑换 | 普通请求带 cookie | **WebSocket 握手带 cookie** |
| --- | --- | --- | --- |
| 侧边栏内的跨站 iframe | ✅ | ✅ | ❌ `cookie=no` → 401 → 1006 |
| 同一页面作为顶层文档（窗口） | ✅ | ✅ | ✅ `cookie=YES` → 101 |

所以本扩展让侧边栏做**启动器 + 状态面板**，界面在顶层窗口里运行（把它贴到屏幕右侧即是常驻侧栏）。
扩展不代理、不改写 DSH 的 cookie 或签名、不修改 DSH 源码。

## 功能

- 侧边栏：服务在线状态、打开 / 聚焦 / 关闭窗口、端口自动检测（19387、3080、3000、4096、5173、8080、8000、9000）
- 记住 DSH 地址与窗口尺寸位置；改地址时会导航已有窗口而不是再开一个
- 中英文界面（跟随浏览器语言）
- 不收集任何数据；只访问 `127.0.0.1` / `localhost`

## 安装（加载已解压的扩展）

1. Edge 打开 `edge://extensions/`，开启左下角 **开发人员模式**
2. 点 **加载解压缩的扩展**，选择本仓库的 `extension/` 目录
3. 点工具栏图标（或 `Ctrl+Shift+E`）打开侧边栏

首次使用需要把 `dsh` 启动时打印的带 token 链接（`http://127.0.0.1:<port>/?token=…`）
粘贴到侧边栏的「启动 token」中保存；token 兑换成功后会自动从本地存储清除。

## 仓库结构

```
extension/   可直接加载、也是提交给商店的包根目录（仅扩展本体）
tools/       图标/素材生成、打包、包校验、隔离 DSH 启动、CDP 截图与诊断脚本
store/       商店素材：徽标 300×300、促销磁贴 440×280、截图 1280×800
site/        隐私政策页（中英双语，供 GitHub Pages 发布）
docs/        文档：扩展说明、提审材料、Pages 部署说明
dist/        打包产物 dsh-sidebar-edge-<版本>.zip
_probe/      架构判定实验脚手架（复刻 DSH 鉴权 + CDP 驱动），可整目录删除
```

## 文档

| 文档 | 内容 |
| --- | --- |
| [docs/EXTENSION.md](docs/EXTENSION.md) | 扩展原理、安装、使用、权限说明、排错、开发 |
| [docs/STORE.md](docs/STORE.md) | Edge 加载项提审材料：Partner Center 每一步逐字可粘贴的文案 + 认证测试说明 |
| [docs/DEPLOY-PAGES.md](docs/DEPLOY-PAGES.md) | 隐私政策页的 GitHub Pages 部署说明 |

## 打包与自检

```powershell
tools\build-package.cmd        # 产出 dist\dsh-sidebar-edge-1.0.0.zip
```

提交包结构校验（双语键一致性、引用文件、PNG 头等）：

```powershell
# 1) 解压（Node 在受限沙箱下不能自起子进程，所以解压与校验分两步）
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD\dist\dsh-sidebar-edge-1.0.0.zip","$PWD\_probe\zipcheck")
# 2) 校验
node tools\verify-package.mjs _probe\zipcheck
```

## 隐私

不收集、不存储、不传输任何个人信息；不含分析、广告或追踪代码；不加载远程代码。
完整政策见 [site/index.html](site/index.html)。

## 许可

MIT（见 [LICENSE](LICENSE)）。
