import test from "node:test";
import assert from "node:assert/strict";
import { nextHeaderScroll, visibleHeaderAt } from "../src/lib/header-scroll";

const options = { maximum: 1000, topBoundary: 100, locked: false };

test("顶栏累计向下滚动后收起，微小反向滚动不会闪现", () => {
  let state = visibleHeaderAt(150);
  for (const y of [155, 161, 168]) {
    state = nextHeaderScroll(state, y, options);
    assert.equal(state.hidden, false);
  }
  state = nextHeaderScroll(state, 171, options);
  assert.equal(state.hidden, true);
  state = nextHeaderScroll(state, 168, options);
  assert.equal(state.hidden, true);
  state = nextHeaderScroll(state, 161, options);
  assert.equal(state.hidden, false);
});

test("回到顶部、菜单或键盘焦点锁定会显示导航并清除方向计数", () => {
  const hidden = nextHeaderScroll(visibleHeaderAt(150), 300, options);
  assert.equal(hidden.hidden, true);
  assert.deepEqual(nextHeaderScroll(hidden, 80, options), visibleHeaderAt(80));
  const locked = nextHeaderScroll(hidden, 400, { ...options, locked: true });
  assert.deepEqual(locked, visibleHeaderAt(400));
  assert.equal(nextHeaderScroll(locked, 407, options).hidden, false);
});

test("顶部和底部的弹性越界不导致导航意外闪现", () => {
  const hidden = nextHeaderScroll(visibleHeaderAt(950), 1000, options);
  assert.equal(hidden.hidden, true);
  const bounce = nextHeaderScroll(hidden, 1060, options);
  assert.equal(bounce.y, 1000);
  assert.equal(bounce.hidden, true);
  assert.equal(nextHeaderScroll(bounce, 1000, options).hidden, true);
  assert.deepEqual(nextHeaderScroll(hidden, -30, options), visibleHeaderAt(0));
});
