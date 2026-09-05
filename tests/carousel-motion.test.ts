import test from "node:test";
import assert from "node:assert/strict";
import { carouselTarget, easeInOutCubic } from "../src/lib/carousel-motion";

test("玩家滚动落点涵盖末尾不满一屏的卡片，并限制在可滚动范围", () => {
  assert.equal(carouselTarget(0, [0, 400, 800], 550, 1), 400);
  assert.equal(carouselTarget(400, [0, 400, 800], 550, 1), 550);
  assert.equal(carouselTarget(550, [0, 400, 800], 550, -1), 400);
  assert.equal(carouselTarget(130, [0, 400, 800], 550, -1), 0);
  assert.equal(carouselTarget(0, [0], -300, 1), 0);
});

test("缓动在两端减速且单调，手动和自动滚动共用同一曲线", () => {
  assert.equal(easeInOutCubic(-1), 0);
  assert.equal(easeInOutCubic(2), 1);
  assert.ok(easeInOutCubic(0.2) < 0.2);
  assert.ok(easeInOutCubic(0.8) > 0.8);
  for (let i = 0; i < 100; i++)
    assert.ok(easeInOutCubic(i / 100) <= easeInOutCubic((i + 1) / 100));
});
