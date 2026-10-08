# 隐私政策页 · GitHub Pages 部署（已完成）

**现状：已上线。** 填到商店的隐私政策 URL 是：

```
https://winterwind2017.github.io/dsh-sidebar-edge/
```

## 部署方式

- 仓库：<https://github.com/Winterwind2017/dsh-sidebar-edge>（公开）
- 页面源文件：仓库根目录的 `site/index.html`（中英双语隐私政策）
- 发布工作流：[`.github/workflows/pages.yml`](../.github/workflows/pages.yml)
  — `actions/upload-pages-artifact` 上传 `site/`，`actions/deploy-pages` 部署
- Pages 源：已设为 **GitHub Actions**（`build_type: workflow`）

改动 `site/` 并推送到 `main` 后会自动重新发布；也可在 Actions 页手动 `workflow_dispatch`。

## 核查命令

```powershell
# 最近的工作流运行
gh run list --repo Winterwind2017/dsh-sidebar-edge --limit 5

# 某次运行的日志
gh run view <run-id> --repo Winterwind2017/dsh-sidebar-edge --log

# Pages 配置
gh api repos/Winterwind2017/dsh-sidebar-edge/pages
```

## 备注：本机 gh / git 的配置坑（已全部解决）

这台机器上有三个叠加的问题，当时的排查结论与最终处理：

1. **代理**：浏览器走系统代理（WinINET，`127.0.0.1:7897`），但 `gh`/`git` 不读这个设置，直连 github.com 会超时。
   → 已写入**用户级** git 配置：`git config --global http.proxy/https.proxy = http://127.0.0.1:7897`。
   实测裸 `git ls-remote` / `git push` 均正常。
2. **凭据存储**：`gh` 默认把 token 存进 Windows 凭据管理器，写入被拒会让整次登录作废。
   → 登录时用 `gh auth login --web --insecure-storage`，token 以明文落在配置目录。
3. **维护 agent 的文件沙箱**：它不能写 `C:\Users\<你>`（含 `%APPDATA%`），所以它无法自行完成上述两步。
   → 已由 [`../tools/gh-auth.cmd`](../tools/gh-auth.cmd) 在未受限的终端里完成后复制到 gh 默认目录；
   现在**裸 `gh` / 裸 `git` 都能用**，`tools/gh.cmd` 与 `tools/git.cmd` 只是可选的免代理/免环境变量包装器。

复核命令：

```powershell
git config --global --get http.proxy      # http://127.0.0.1:7897
git config --global --get credential.helper
gh auth status                            # 从 %APPDATA%\GitHub CLI 读取
git ls-remote --heads https://github.com/Winterwind2017/dsh-sidebar-edge.git
```

若哪天不用代理了，撤销命令：

```powershell
git config --global --unset http.proxy
git config --global --unset https.proxy
```

## 替代方案（如需换地址）

| 方案 | 说明 |
| --- | --- |
| Cloudflare Pages / Vercel | 直接部署 `site/` 目录，免费且无需 GitHub |
| 已有个人网站 | 把 `site/index.html` 内容挂到任意静态路径 |
| GitHub Gist | 可用于 `raw` 链接，但不够正式，审核观感较差 |

更换后请同步更新 [STORE.md](STORE.md) 第 4.5 节与仓库 README 中的链接。
