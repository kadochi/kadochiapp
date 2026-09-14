(function () {
  "use strict";

  /**
   * @typedef {Object} QuickReply
   * @property {string} id
   * @property {string} label
   * @property {string} message
   */

  /** @type {ReadonlyArray<Readonly<QuickReply>>} */
  var items = Object.freeze([
    { id: "occasion", label: "مناسبت", message: "برای چه مناسبتی دنبال هدیه هستید؟ 🎁" },
    { id: "budget", label: "بودجه", message: "حدود بودجه‌ای که در نظر دارید چقدره؟" },
    { id: "delivery_date", label: "تاریخ تحویل", message: "چه تاریخی باید سفارش تحویل بشه؟" },
    { id: "recipient_area", label: "محدوده گیرنده", message: "گیرنده در کدوم محدوده تهران هست؟" },
    { id: "product_recommendation", label: "پیشنهاد محصول", message: "اگر بودجه و مناسبت رو بگید، می‌تونیم چند گزینه مناسب پیشنهاد بدیم." },
    { id: "tehran_delivery", label: "محدوده ارسال", message: "ارسال در حال حاضر فقط در تهران انجام می‌شود." },
    { id: "preparation_time", label: "زمان آماده‌سازی", message: "زمان دقیق آماده‌سازی و ارسال بر اساس محصول بررسی می‌شود." },
    { id: "same_day", label: "ارسال امروز", message: "برای ارسال امروز باید موجودی و امکان آماده‌سازی محصول بررسی بشه. اگر محصول مدنظرتون رو بفرستید بررسی می‌کنیم." },
    { id: "availability", label: "موجودی محصول", message: "اجازه بدید موجودی و امکان آماده‌سازی این محصول رو بررسی کنیم." },
    { id: "product_link", label: "لینک محصول", message: "اگر محصول خاصی مدنظرتونه، لینک یا اسمش رو بفرستید تا بررسی کنیم." },
    { id: "general_help", label: "راهنمایی خرید", message: "سلام 👋 برای انتخاب محصول، ثبت سفارش یا هر سوالی که دارید در خدمتیم." }
  ].map(function (reply) { return Object.freeze(reply); }));

  /**
   * Insert without replacing any existing composer text.
   *
   * @param {string} value
   * @param {string} message
   * @param {number} cursor
   * @returns {{value: string, caret: number}}
   */
  function insert(value, message, cursor) {
    var safeValue = typeof value === "string" ? value : "";
    var safeCursor = Math.max(0, Math.min(Number.isFinite(cursor) ? cursor : safeValue.length, safeValue.length));
    var before = safeValue.slice(0, safeCursor);
    var after = safeValue.slice(safeCursor);
    var prefix = before && !/\s$/.test(before) ? "\n\n" : "";
    var suffix = after && !/^\s/.test(after) ? "\n\n" : "";
    var inserted = prefix + message;

    return {
      value: before + inserted + suffix + after,
      caret: before.length + inserted.length
    };
  }

  window.KadochiSupportQuickReplies = Object.freeze({ items: items, insert: insert });
}());
