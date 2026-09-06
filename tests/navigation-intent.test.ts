import test from "node:test";
import assert from "node:assert/strict";
import { navigationIntent } from "../src/lib/navigation-intent";

const current = {
  origin: "https://ow.example.com",
  pathname: "/admin",
  search: "",
};

test("站内换页会记下新路径，查询变化不算换页", () => {
  assert.deepEqual(navigationIntent("/admin/users", current), {
    pathname: "/admin/users",
    search: "",
    pathChanged: true,
  });
  assert.deepEqual(navigationIntent("/admin?saved=1", current), {
    pathname: "/admin",
    search: "?saved=1",
    pathChanged: false,
  });
  assert.equal(navigationIntent("/admin", current), null);
  assert.equal(navigationIntent("https://evil.example/admin", current), null);
  assert.equal(navigationIntent("#review", current), null);
});
