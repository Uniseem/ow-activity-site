<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## 双远程推送 / Dual-push (GitHub + GitLab)

自 2026-10-16 起本仓库镜像到自建 GitLab。提交后请同时推送：

| Remote | URL |
|---|---|
| `origin` (GitHub) | `https://github.com/Uniseem/ow-activity-site.git` |
| `gitlab` | `https://gitlab.anylocate.cc/anylocate/ow-activity-site.git` |

```bash
git push origin HEAD && git push gitlab HEAD
```

Fleet / SSH / Mesh / Runner 规则见 **Uniseem/machine-management**（`anylocate/machine-management`）。CI：仅有 GitHub Actions、无现成可跑 `.gitlab-ci.yml` 时 GitLab 侧为代码镜像 only，勿发明会失败的流水线。清单：machine-management `GitLab/镜像清单.md`。

