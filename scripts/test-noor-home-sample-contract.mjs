import test from "node:test";
import assert from "node:assert/strict";
import { isNoorHomeSampleDirectPreview } from "./noor-home-sample-contract.mjs";

test("Noor home sample links directly to the worksheet without subscribe", () => {
  assert.equal(isNoorHomeSampleDirectPreview("https://fursay.com/product-samples/noor-worksheet?utm_source=home&utm_medium=site&utm_campaign=noor_story_funnel&utm_content=home_noor_sample_link"), true);
  for (const value of [undefined, "", "/arabic?subscribe=noor", "/product-samples/noor-worksheet?subscribe=", "/product-samples/noor-worksheet?subscribe=noor", "/product-samples/noor-worksheet-extra", "https://example.com/product-samples/noor-worksheet", "http://["]) {
    assert.equal(isNoorHomeSampleDirectPreview(value), false, String(value));
  }
});
