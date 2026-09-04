# 上海交大守望先锋 · Cloudflare Pages

该版本复用轻量 Worker API 和现有 APAC D1 数据库，通过 Pages Functions 提供动态功能，生产地址为：

```text
https://sjtu-ow.pages.dev
```

本地运行：

```powershell
npm.cmd run dev
```

部署：

```powershell
npm.cmd run deploy
```

管理员账号需要在 Pages 项目的 Settings → Variables and Secrets 中设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。
