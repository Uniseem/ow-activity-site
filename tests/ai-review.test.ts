import test from "node:test";
import assert from "node:assert/strict";
import {
  openaiCompatibleRoot,
  parseAiBaseUrl,
  presetBaseUrl,
} from "../src/lib/ai/presets";
import {
  buildReviewPrompt,
  parseReviewResponse,
} from "../src/lib/ai/review-text";

test("OpenAI 兼容地址会补上 /v1，已带版本号的不再重复", () => {
  assert.equal(
    openaiCompatibleRoot("https://api.openai.com/v1"),
    "https://api.openai.com/v1",
  );
  assert.equal(
    openaiCompatibleRoot("https://openai.example.com"),
    "https://openai.example.com/v1",
  );
  assert.equal(
    parseAiBaseUrl("https://openrouter.ai/api/v1/"),
    "https://openrouter.ai/api/v1",
  );
  assert.equal(presetBaseUrl("deepseek"), "https://api.deepseek.com/v1");
  assert.throws(() => parseAiBaseUrl("javascript:alert(1)"));
});

test("审核模型只接受通过、拒绝或交回人工", () => {
  assert.deepEqual(
    parseReviewResponse('{"decision":"APPROVED","note":"资料正常"}'),
    { decision: "APPROVED", note: "资料正常" },
  );
  assert.equal(
    parseReviewResponse('好的，如下：\n{"decision":"REJECTED","note":"广告引流"}').decision,
    "REJECTED",
  );
  assert.equal(parseReviewResponse("我再看看").decision, "PENDING");
  assert.equal(
    parseReviewResponse('{"decision":"MAYBE","note":"不确定"}').decision,
    "PENDING",
  );
  assert.match(buildReviewPrompt({ displayName: "晨星", slogan: "先保队友" }), /PENDING/);
});
