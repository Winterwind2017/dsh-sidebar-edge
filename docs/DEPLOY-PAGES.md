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

## 备注：gh 在本机的两个坑（已解决）

1. `gh` 默认把配置写到 `%APPDATA%\GitHub CLI`，在本项目的沙箱里不可写 →
   已用 `GH_CONFIG_DIR` 指向仓库内的 `.gh-config/`（已 git-ignore），登录由
   [`../tools/gh-auth.cmd`](../tools/gh-auth.cmd) 完成。
2. 默认把 token 存进 Windows 凭据管理器，写入失败会导致整次登录作废 →
   已改为 `--insecure-storage`，token 落在 `.gh-config/hosts.yml`。

## 替代方案（如需换地址）

| 方案 | 说明 |
| --- | --- |
| Cloudflare Pages / Vercel | 直接部署 `site/` 目录，免费且无需 GitHub |
| 已有个人网站 | 把 `site/index.html` 内容挂到任意静态路径 |
| GitHub Gist | 可用于 `raw` 链接，但不够正式，审核观感较差 |

更换后请同步更新 [STORE.md](STORE.md) 第 4.5 节与仓库 README 中的链接。
