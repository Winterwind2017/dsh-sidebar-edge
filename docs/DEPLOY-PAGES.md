# 隐私政策页面 · 部署到 GitHub Pages

商店需要一个**公开可访问**的隐私政策 URL。步骤分两段：需要你登录 GitHub 的那一步，我做不到；登录之后我可以全部接手。

## 1. 需要你做（约 2 分钟）

在任意终端运行：

```powershell
gh auth login
```

选择 `GitHub.com` → `HTTPS` → 用浏览器登录（或粘贴 token）。完成后告诉我一句"登录好了"。

## 2. 我接手（你登录后）

1. 创建公开仓库 `dsh-sidebar-edge`
2. 提交 `site/index.html`（中英文隐私政策，已在本地写好）与 `extension/`、`tools/`、`store/`、`docs/`
3. 开启 GitHub Pages（源：默认分支根目录，或把 `site/` 设为发布目录）
4. 等 Pages 构建完成后，取出最终 URL 并**回填到 `STORE.md` 的第 4.5 节**
5. 用 `web_fetch` 实测该 URL 可匿名访问、内容完整

预计最终地址形如：

```
https://<你的GitHub用户名>.github.io/dsh-sidebar-edge/
```

> 如果你不想把整套源码公开，也可以只建一个更小的仓库（仅 `site/index.html` + `README.md`），
> 隐私政策不要求与源码同仓。

## 3. 如果你没有 GitHub 账号 / 不想用 Pages

替代方案（任选其一，URL 同样要能匿名访问）：

| 方案 | 说明 |
| --- | --- |
| Cloudflare Pages / Vercel | 直接部署 `site/` 目录，免费且无需 GitHub |
| 已有个人网站 | 把 `site/index.html` 内容挂到任意静态路径 |
| GitHub Gist | 可以用于 `raw` 链接，但不够正式，审核观感较差 |

无论哪种，都把最终 URL 填进 Partner Center 的 **隐私 → 隐私政策 URL**，
并同步更新 `STORE.md` 第 4.5 节。
