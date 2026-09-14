const assert = require("node:assert/strict");

global.window = {};
require("../assets/support-quick-replies.js");

const quickReplies = global.window.KadochiSupportQuickReplies;

assert.equal(quickReplies.items.length, 11);
assert.deepEqual(quickReplies.items.map((reply) => reply.id), [
  "occasion",
  "budget",
  "delivery_date",
  "recipient_area",
  "product_recommendation",
  "tehran_delivery",
  "preparation_time",
  "same_day",
  "availability",
  "product_link",
  "general_help"
]);

const emptyComposer = quickReplies.insert("", quickReplies.items[0].message, 0);
assert.equal(emptyComposer.value, "برای چه مناسبتی دنبال هدیه هستید؟ 🎁");
assert.equal(emptyComposer.caret, emptyComposer.value.length);

const existingComposer = quickReplies.insert("قبلبعد", "متن آماده", 3);
assert.equal(existingComposer.value, "قبل\n\nمتن آماده\n\nبعد");
assert.equal(existingComposer.value.slice(0, 3), "قبل");
assert.equal(existingComposer.value.slice(-3), "بعد");

assert.ok(Object.isFrozen(quickReplies.items));
assert.ok(quickReplies.items.every(Object.isFrozen));

console.log("support quick replies: ok");
