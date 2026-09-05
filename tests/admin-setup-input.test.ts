import test from "node:test";
import assert from "node:assert/strict";
import { initialAdminSchema } from "../src/lib/admin-setup-input";

const valid = {
  username: "owner",
  displayName: "站点管理员",
  password: "admin-test-password",
  confirmPassword: "admin-test-password",
};

test("首次管理员注册校验用户名、昵称和重复密码", () => {
  assert.equal(
    initialAdminSchema.parse({ ...valid, username: " owner " }).username,
    "owner",
  );
  for (const changes of [
    { username: "ab" },
    { username: "a-b" },
    { displayName: "我" },
    { confirmPassword: "different" },
  ]) {
    assert.equal(
      initialAdminSchema.safeParse({ ...valid, ...changes }).success,
      false,
    );
  }
});

test("管理员密码遵守 bcrypt 字节上限且不允许首尾空白", () => {
  for (const password of [
    "1234567",
    "密码".repeat(13),
    " padded-password",
    "padded-password ",
  ]) {
    assert.equal(
      initialAdminSchema.safeParse({
        ...valid,
        password,
        confirmPassword: password,
      }).success,
      false,
    );
  }
  const password = "密".repeat(24);
  assert.equal(
    initialAdminSchema.safeParse({
      ...valid,
      password,
      confirmPassword: password,
    }).success,
    true,
  );
});
