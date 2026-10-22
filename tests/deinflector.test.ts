import test from "node:test";
import assert from "node:assert";
import { getBaseForms } from "../src/lib/japanese/deinflector.ts";

test("Deinflector: Basic Godan conjugations", () => {
  const wrote = getBaseForms("書いた").map((r) => r.word);
  assert.ok(wrote.includes("書く"), "書いた should resolve to 書く");

  const drank = getBaseForms("飲んで").map((r) => r.word);
  assert.ok(drank.includes("飲む"), "飲んで should resolve to 飲む");

  const waited = getBaseForms("待った").map((r) => r.word);
  assert.ok(waited.includes("待つ"), "待った should resolve to 待つ");

  const spoken = getBaseForms("話した").map((r) => r.word);
  assert.ok(spoken.includes("話す"), "話した should resolve to 話す");
});

test("Deinflector: Basic Ichidan conjugations", () => {
  const ate = getBaseForms("食べた").map((r) => r.word);
  assert.ok(ate.includes("食べる"), "食べた should resolve to 食べる");

  const eating = getBaseForms("食べて").map((r) => r.word);
  assert.ok(eating.includes("食べる"), "食べて should resolve to 食べる");

  const notEating = getBaseForms("食べない").map((r) => r.word);
  assert.ok(notEating.includes("食べる"), "食べない should resolve to 食べる");

  const canEat = getBaseForms("食べられる").map((r) => r.word);
  assert.ok(canEat.includes("食べる"), "食べられる should resolve to 食べる");
});

test("Deinflector: Multi-pass compound conjugations", () => {
  const didNotEat = getBaseForms("食べなかった").map((r) => r.word);
  assert.ok(didNotEat.includes("食べる"), "食べなかった should resolve to 食べる");

  const wentAccidentally = getBaseForms("行っちゃった").map((r) => r.word);
  assert.ok(wentAccidentally.includes("行く"), "行っちゃった should resolve to 行く");

  const notTastyPast = getBaseForms("美味しくなかった").map((r) => r.word);
  assert.ok(notTastyPast.includes("美味しい"), "美味しくなかった should resolve to 美味しい");

  const madeToRead = getBaseForms("読ませられた").map((r) => r.word);
  assert.ok(madeToRead.includes("読ませる"), "読ませられた should resolve to 読ませる");
});

test("Deinflector: Irregular verbs (suru, kuru, iku)", () => {
  const did = getBaseForms("した").map((r) => r.word);
  assert.ok(did.includes("する"), "した should resolve to する");

  const came = getBaseForms("きた").map((r) => r.word);
  assert.ok(came.includes("来る"), "きた should resolve to 来る");

  const went = getBaseForms("行った").map((r) => r.word);
  assert.ok(went.includes("行く"), "行った should resolve to 行く");

  const goodPast = getBaseForms("よかった").map((r) => r.word);
  assert.ok(goodPast.includes("いい") || goodPast.includes("良い"), "よかった should resolve to いい/良い");
});
