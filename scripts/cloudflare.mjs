import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const action = process.argv[2] || "build";
if (!["build", "preview", "deploy"].includes(action))
  throw new Error("命令仅支持 build、preview 或 deploy。");
const executable = fileURLToPath(
  new URL(
    "../node_modules/@opennextjs/cloudflare/dist/cli/index.js",
    import.meta.url,
  ),
);
const env = {
  ...process.env,
  DATABASE_PROVIDER: "d1",
  DATABASE_URL: "",
  DATABASE_URL_UNPOOLED: "",
};
function run(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [executable, command], {
      stdio: "inherit",
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Cloudflare ${command} 失败（${code}）。`)),
    );
  });
}
await run("build");
// OpenNext normally copies .env files into its server bundle. Deployments use
// Worker bindings/secrets instead, so local Vercel credentials never travel.
await writeFile(
  new URL("../.open-next/cloudflare/next-env.mjs", import.meta.url),
  "export const production = {};\nexport const development = {};\nexport const test = {};\n",
);
if (action !== "build") await run(action);
