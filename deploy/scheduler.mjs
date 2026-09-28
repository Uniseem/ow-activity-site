// Every minute, reconcile activity dates using the application's Shanghai timezone rules.
const interval = 60_000;
let stopped = false;
let timer;

async function sync() {
  try {
    const response = await fetch("http://app:3000/api/cron/events", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      console.error(`活动日期同步失败：HTTP ${response.status}`);
    }
  } catch {
    console.error("活动日期同步暂时失败，下分钟重试。");
  }
  if (!stopped) timer = setTimeout(sync, interval);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopped = true;
    clearTimeout(timer);
    process.exit(0);
  });
}

if (!process.env.CRON_SECRET) {
  console.error("缺少 CRON_SECRET，无法启动活动日期同步。");
  process.exit(1);
}
await sync();
