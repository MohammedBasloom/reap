/* REAP — mobile compatibility notice.
   Injects a slim banner above the header; CSS shows it only on small
   screens. Dismissal is remembered for the session. Load inside <body>
   after assets/i18n.js. */
(function () {
  try { if (sessionStorage.getItem("reap_mobile_notice") === "off") return; } catch (e) {}
  var ar = (window.I18N && window.I18N.lang === "ar");
  var msg = ar
    ? "‏للحصول على أفضل تجربة، يُرجى استخدام المنصة عبر جهاز حاسوب أو شاشة أكبر — فواجهة الجوال غير مدعومة بالكامل حاليًا، وقد لا تظهر بعض الميزات بشكل صحيح."
    : "For the best experience, please use REAP on a desktop or larger screen — the mobile view is not yet fully supported and some features may not display correctly.";
  var bar = document.createElement("div");
  bar.id = "mobileNotice";
  bar.setAttribute("role", "note");
  var text = document.createElement("span");
  text.textContent = msg;
  var close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", ar ? "إغلاق التنبيه" : "Dismiss notice");
  close.onclick = function () {
    bar.remove();
    try { sessionStorage.setItem("reap_mobile_notice", "off"); } catch (e) {}
  };
  bar.appendChild(text);
  bar.appendChild(close);
  document.body.insertBefore(bar, document.body.firstChild);
})();
