/* =============================================================
   REAP — i18n engine. Arabic (default) / English.
   - Sets document dir/lang immediately (load in <head>).
   - t(s): dictionary lookup, falls back to the English source.
   - patchReact(): wraps React.createElement so every string child
     and every text-bearing prop is translated — no per-component
     rewrites needed. Call it right after React loads.
   - applyDom(): landing-page helper — swaps textContent/attributes
     of elements carrying data-ar / data-ar-<attr> attributes.
   ============================================================= */
(function () {
  const KEY = "reap_lang";
  let lang;
  try { lang = localStorage.getItem(KEY) || "en"; } catch (e) { lang = "en"; }
  if (lang !== "en" && lang !== "ar") lang = "en";

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  /* ---------- Dictionary (EN → AR) ---------- */
  const D = {
    /* Brand & chrome */
    "Real Estate Assessment Platform": "منصة تقييم العقارات",
    "Financial Modeling": "النمذجة المالية",
    "Valuation": "التقييم العقاري",
    "Developed by": "تطوير",
    "Back to home": "العودة للرئيسية",
    "Feasibility Study Report": "تقرير دراسة الجدوى",
    "Real Estate Valuation Report": "تقرير التقييم العقاري",

    /* Tabs */
    "Summary": "الملخص", "Cost": "التكاليف", "Program & Revenue": "البرنامج والإيرادات",
    "Capital": "رأس المال", "Cash flow": "التدفقات النقدية", "Returns": "العوائد",
    "Sensitivity": "الحساسية", "Scenarios": "السيناريوهات", "Monte Carlo": "مونت كارلو",
    "Risk": "المخاطر", "Fund": "الصندوق",

    /* Header stats */
    "Equity IRR": "IRR الملكية", "NPV": "القيمة الحالية NPV", "Profit": "الربح",
    "Total cost": "إجمالي التكلفة", "Equity req.": "حقوق الملكية المطلوبة",
    "Total capital called": "إجمالي رأس المال المستدعى",
    "Awaiting program selection": "بانتظار اختيار البرنامج",
    "Market value": "القيمة السوقية", "Range": "النطاق",

    /* Empty state */
    "Awaiting program": "بانتظار البرنامج",
    "Getting started": "لنبدأ",
    "Now choose your program components.": "الآن اختر مكوّنات برنامجك العقاري.",
    "Start by setting your land, then build the program.": "ابدأ بتحديد الأرض، ثم ابنِ البرنامج.",
    "Work down the sidebar in order — the checklist below follows the same sequence. Every dashboard (cashflow, cost stack, returns, sensitivity, Monte Carlo and risk) fills in automatically as you go.":
      "اتبع القائمة الجانبية بالترتيب — والقائمة أدناه تسير بالتسلسل نفسه. وتمتلئ جميع اللوحات (التدفقات النقدية والتكاليف والعوائد والحساسية ومونت كارلو والمخاطر) تلقائيًا كلما تقدّمت.",
    "How to build your model": "كيف تبني نموذجك",
    "Set the land": "حدّد الأرض",
    "Area, price per m², transfer fees — and whether the site is serviced or raw.":
      "المساحة، وسعر المتر، ورسوم النقل — وهل الأرض مخدومة أم خام.",
    "Choose your program": "اختر برنامجك",
    "Pick component tiles — villas, townhouses, apartments, retail, office, hotel.":
      "اختر بطاقات المكوّنات — فلل، تاون هاوس، شقق، تجزئة، مكاتب، فندق.",
    "Allocate the land": "وزّع الأرض",
    "An allocation panel appears under the tiles as soon as you pick a component — give each one its share (%) of the site.":
      "تظهر لوحة التوزيع أسفل البطاقات فور اختيارك أي مكوّن — امنح كل مكوّن حصته (٪) من الأرض.",
    "Tune each component": "اضبط كل مكوّن",
    "Massing, build cost and efficiency, then sale price or rent and how long it sells or operates.":
      "أسلوب البناء وتكلفته والكفاءة، ثم سعر البيع أو الإيجار ومدة البيع أو التشغيل.",
    "Set timing & general costs": "حدّد الجدول الزمني والتكاليف العامة",
    "Pre-design, construction and pre-sales start — then soft costs, contingency, marketing and fees.":
      "ما قبل التصميم والإنشاء وبدء البيع على الخارطة — ثم التكاليف غير المباشرة والاحتياطي والتسويق والرسوم.",
    "Set financing & targets": "حدّد التمويل والمستهدفات",
    "Loan-to-cost and interest rate, the hurdle rate for NPV, and optionally an LP / GP fund structure.":
      "نسبة التمويل إلى التكلفة ومعدل الفائدة، ومعدل العائد المستهدف لصافي القيمة الحالية، واختياريًا هيكل صندوق بين الشريك المحدود والشريك العام.",
    "Select your program components to model the deal.": "اختر مكوّنات برنامجك العقاري لبدء نمذجة الصفقة.",
    "Land is set. Now pick from the program tiles in the sidebar — villas, apartments, retail, hotel —\n        and the cashflow, cost stack, sensitivity and risk views will populate from your selection.":
      "الأرض جاهزة. اختر الآن من بطاقات البرنامج في القائمة الجانبية — فلل، شقق، تجزئة، فندق — وستمتلئ لوحات التدفقات النقدية والتكاليف والحساسية والمخاطر تلقائيًا.",
    "Land area": "مساحة الأرض", "Land price": "سعر الأرض", "Land cost": "تكلفة الأرض",
    "Land in (w/ fees)": "الأرض شاملة الرسوم",
    "Land is set. Now pick from the program tiles in the sidebar — villas, apartments, retail, hotel — and the cashflow, cost stack, sensitivity and risk views will populate from your selection.":
      "الأرض جاهزة. اختر الآن من بطاقات البرنامج في القائمة الجانبية — فلل، شقق، تجزئة، فندق — وستمتلئ لوحات التدفقات النقدية والتكاليف والحساسية والمخاطر تلقائيًا.",
    "Set land share, FAR, pricing. Rename anything generic (e.g. ‘Villa’ → ‘Beachfront Villas’).":
      "حدّد حصة الأرض ومعامل البناء والأسعار، وأعد تسمية أي مكوّن عام (مثل «فيلا» → «فلل الواجهة البحرية»).",
    "Sale": "بيع", "Lease": "تأجير", "Add": "إضافة",
    "Saleable": "للبيع", "Leasable": "للتأجير",
    "Sales revenue": "إيرادات البيع", "Annual NOI": "صافي الدخل السنوي",
    "Retail (Strata)": "تجزئة (للبيع)", "Retail sold per m²": "تجزئة تُباع بالمتر",
    "Mohammed Basloom": "محمد باسلوم",
    "What happens next": "ما الخطوة التالية",
    "Pick components": "اختر المكوّنات",
    "From the sidebar tiles. Each adds an instance to your program.": "من بطاقات القائمة الجانبية؛ كل بطاقة تضيف مكوّنًا لبرنامجك.",
    "Tune & allocate": "اضبط ووزّع",
    "Read the dashboard": "اقرأ لوحة النتائج",
    "Cashflow, cost stack, sensitivity, Monte Carlo, scenarios, and risk register populate live.": "التدفقات النقدية والتكاليف والحساسية ومونت كارلو والسيناريوهات وسجل المخاطر تتحدّث مباشرة.",

    /* Sidebar — project & land */
    "Project": "المشروع", "Location": "الموقع", "Project type": "نوع المشروع",
    "e.g. Mixed-use, Residential…": "مثال: متعدد الاستخدامات، سكني…",
    "Land": "الأرض",
    "Total land cost": "إجمالي تكلفة الأرض", "Transfer / gov fees": "رسوم التصرّف / الحكومية",
    "On land cost": "من تكلفة الأرض",
    "Land condition": "حالة الأرض",
    "Net / serviced": "صافية / مخدومة", "Ready to build": "جاهزة للبناء",
    "Raw / unserviced": "خام / غير مخدومة", "Incl. roads & utilities": "تشمل الطرق والمرافق",
    "Infrastructure cost": "تكلفة البنية التحتية", "Total infrastructure": "إجمالي البنية التحتية",
    "Optional — on gross land": "اختياري — على إجمالي الأرض",
    "Developable share": "النسبة القابلة للتطوير", "Net developable": "الصافي القابل للتطوير",
    "Total land in (cost + fees)": "إجمالي الأرض (التكلفة + الرسوم)",

    /* Sidebar — components */
    "Program — Components": "البرنامج — المكوّنات",
    "Choose program components": "اختر مكوّنات البرنامج",
    "Add another component": "أضف مكوّنًا آخر",
    "No components yet": "لا توجد مكوّنات بعد",
    "Pick from the tiles above to build your program.": "اختر من البطاقات أعلاه لبناء برنامجك.",
    "Villa": "فيلا", "Townhouse": "تاون هاوس", "Apartment": "شقة", "Build-to-Rent": "سكني للتأجير",
    "Retail": "تجزئة", "Office": "مكاتب", "Hotel": "فندق", "Serviced Apartment": "شقق فندقية",
    "Custom": "مخصص",
    "Detached homes for sale": "مساكن مستقلة للبيع", "Attached homes for sale": "مساكن متلاصقة للبيع",
    "Strata residences": "وحدات سكنية للبيع", "Residential rental": "سكني إيجاري",
    "Leasable retail GLA": "مساحات تجزئة تأجيرية", "Leasable office NLA": "مساحات مكتبية تأجيرية",
    "Keyed hospitality": "ضيافة فندقية", "Long-stay keyed": "إقامة طويلة",
    "Blank — define your own": "فارغ — عرّفه بنفسك",
    "+ ADD": "+ إضافة", "+ Add": "+ إضافة", "on": "مفعّل",
    "Land & massing": "الأرض والكتلة العمرانية",
    "Allocation of land": "حصة الأرض", "% of total land": "% من إجمالي الأرض",
    "Allocation of serviced land": "حصة الأرض المخدومة",
    "% of net developable area": "٪ من صافي المساحة القابلة للتطوير",
    "Allocate the land": "وزّع الأرض",
    "Give each component its share (%) of the net developable area": "امنح كل مكوّن حصته (٪) من صافي المساحة القابلة للتطوير",
    "Each component lands with sensible defaults — names, sizing and pricing are all editable.":
      "يأتي كل مكوّن بقيم افتراضية منطقية — والأسماء والمساحات والأسعار كلها قابلة للتعديل.",
    /* Rendered as a separate JSX child after the number, so it is translated
       on its own rather than as "<n> m² to allocate". */
    "m² to allocate": "م² للتوزيع",
    "Efficiency": "الكفاءة", "NSA / GFA": "الصافي / الإجمالي",
    "FAR": "معامل البناء FAR", "Land coverage": "نسبة تغطية الأرض", "Max floors": "عدد الأدوار",
    "Upper-floor coverage": "تغطية الأدوار العليا", "Last floor": "الدور الأخير",
    "Built-up cost": "تكلفة البناء", "Site work (incl. setbacks)": "أعمال الموقع (مع الارتدادات)",
    "Basement coverage": "تغطية القبو", "Basement cost": "تكلفة القبو",
    /* Component editor — labels, suffixes and hints */
    "Build-up area methodology": "أسلوب احتساب المسطحات",
    /* Coverage massing — labels renamed for clarity (maths unchanged) */
    "Ground floor coverage": "تغطية الدور الأرضي",
    "Ground floor area ÷ land area": "مساحة الدور الأرضي ÷ مساحة الأرض",
    "incl. last": "شاملًا الأخير",
    "Upper floors coverage": "تغطية الأدوار العليا",
    "Floors above the ground floor, excluding the last floor. Each floor ÷ land area":
      "الأدوار التي تعلو الدور الأرضي، ولا تشمل الدور الأخير. كل دور ÷ مساحة الأرض",
    "Last floor (penthouse)": "الدور الأخير (الملحق)",
    "Last floor as % of the floor below": "الدور الأخير كنسبة من الدور الذي تحته",
    /* Floor-by-floor breakdown */
    "Floor-by-floor build-up": "توزيع المسطحات دورًا بدور",
    "Ground": "أرضي", "Upper": "علوي", "Last": "الأخير",
    "Enter a land allocation and max floors to see the floor-by-floor breakdown.":
      "أدخل حصة الأرض وعدد الأدوار لعرض توزيع المسطحات دورًا بدور.",
    "Coverage": "التغطية", "ratio": "نسبة",
    "GFA = Land × FAR": "الإجمالي = الأرض × معامل البناء",
    "SAR/m² GFA": "ر.س/م² إجمالي",
    "Above-ground construction rate": "معدل البناء فوق الأرض",
    "% of construction cost": "٪ من تكلفة الإنشاء",
    "Basement": "قبو", "None": "بدون", "Included": "مشمول",
    "Footprint": "البصمة", "Remaining": "المتبقي", "Built + site": "البناء + الموقع",
    "Ground floor": "الدور الأرضي",
    "Revenue basis": "أساس الإيراد",
    "per m²": "لكل م²", "per unit": "لكل وحدة", "per key": "لكل مفتاح",
    "SAR/unit": "ر.س/وحدة", "SAR/key": "ر.س/مفتاح", "SAR/m² NSA": "ر.س/م² صافي",
    "SAR/unit·yr": "ر.س/وحدة·سنة", "SAR/m²·yr": "ر.س/م²·سنة", "SAR/night": "ر.س/ليلة",
    "Lease-up ramp": "منحنى التأجير", "over": "خلال",
    "Day-1 at delivery": "عند التسليم مباشرة",
    "Lease-up period": "فترة التأجير",
    "Long-term run-rate": "المعدل المستقر طويل الأجل",
    "% of gross income": "٪ من الدخل الإجمالي",
    "Terminal cap": "معدل الرسملة النهائي",
    "months → exit": "أشهر → التخارج", "Hold until exit": "الاحتفاظ حتى التخارج",
    /* Allocation alarm + program header */
    "Land fully allocated": "الأرض موزّعة بالكامل",
    "Land partially allocated": "الأرض موزّعة جزئيًا",
    "⚠ Land overallocated": "⚠ تجاوز في توزيع الأرض",
    "m² allocated": "م² موزّعة", "of": "من", "net developable": "صافي قابل للتطوير",
    "Your program ·": "برنامجك ·", "component": "مكوّن", "components": "مكوّنات",
    /* Project timing / general costs / financing hints */
    "Concept → DD → tender": "تصور → تصميم تفصيلي → طرح",
    "month": "شهر", "From kickoff": "من بداية المشروع",
    "Operating period & exit cap rate are set per-component above. Horizon is auto-sized from your timing & hold assumptions.":
      "تُضبط فترة التشغيل ومعدل الرسملة عند التخارج لكل مكوّن أعلاه. ويُحتسب الأفق الزمني تلقائيًا من افتراضات الجدول الزمني ومدة الاحتفاظ.",
    "Of construction + site": "من الإنشاء + الموقع",
    "Of construction + soft": "من الإنشاء + التكاليف غير المباشرة",
    "Of sales revenue": "من إيراد المبيعات", "On sales revenue": "على إيراد المبيعات",
    "Loan to cost": "التمويل إلى التكلفة", "Annual": "سنوي",
    /* Fund structure toggle */
    "Use fund structure": "تفعيل هيكل الصندوق",
    "Splits equity across LP (cash investors), Developer and GP (fund manager), adds fees + a promote waterfall, and opens the":
      "يقسّم حقوق الملكية بين الشريك المحدود (المستثمرين النقديين) والمطوّر والشريك العام (مدير الصندوق)، ويضيف الرسوم وشلال حوافز الأداء، ويفتح تبويب",
    "tab.": ".",
    "On": "مفعّل", "Off": "معطّل",
    /* Fund structure — splits, fees, waterfall */
    "Hotel keys": "مفاتيح الفندق", "NOI / yr": "صافي دخل تشغيلي / سنة",
    "Tornado · Equity IRR sensitivity (±10%)": "تورنادو · حساسية IRR للملكية (±10%)",
    "Tornado · Profit sensitivity (±10%)": "تورنادو · حساسية الربح (±10%)",
    "Base profit": "الربح الأساس",
    "No equity was called.": "لم تُستدعَ أي مساهمة من الملكية.",
    "Project income and the debt facility cover every funding need, so no investor cash is required and there is no equity IRR to measure — which is why shifting any driver leaves it unchanged. Use the profit sensitivity below to compare what moves the return.":
      "إذ تغطي إيرادات المشروع والتسهيلات الائتمانية كامل احتياجات التمويل، فلا يُطلب نقد من المستثمرين ولا يوجد عائد ملكية IRR لقياس حساسيته — ولهذا لا يتغيّر عند تحريك أي عامل. استخدم حساسية الربح أدناه لمقارنة أثر العوامل على العائد.",
    "Equity contribution split": "توزيع مساهمات الملكية",
    "Cash investors": "مستثمرون نقديون", "Co-invest": "مساهمة مشتركة", "Fund manager": "مدير الصندوق",
    "Dev": "المطوّر", "Fees": "الرسوم",
    "To GP · % of total cost · at close": "للشريك العام · ٪ من إجمالي التكلفة · عند الإقفال",
    "Subscription fee": "رسوم الاكتتاب",
    "To GP · % of each equity call": "للشريك العام · ٪ من كل استدعاء رأس مال",
    "Of each equity call, at the time it is drawn": "من كل استدعاء لرأس المال عند سحبه",
    "To GP · % of equity, once at establishment": "للشريك العام · ٪ من رأس المال، مرة واحدة عند التأسيس",
    "Equity collected at establishment · charged once": "رأس المال المُحصَّل عند التأسيس · تُحتسب مرة واحدة",
    "GP share of profit above pref · paid once at exit": "حصة الشريك العام من الربح الزائد عن العائد الممتاز · تُدفع مرة واحدة عند التخارج",
    "Asset management fee": "رسوم إدارة الأصول",
    "Paid-in capital · accrued monthly, every year": "رأس المال المدفوع · تُحتسب شهريًا وعلى مدار كل سنة",
    "Subscription + asset mgmt + dev": "الاكتتاب + إدارة الأصول + التطوير",
    /* Fund tab — section headers */
    "Returns by party": "العوائد حسب الطرف",
    "What each party puts in, takes out, and earns over the fund's life.":
      "ما يضخّه كل طرف وما يستلمه وما يحققه من أرباح على مدى عمر الصندوق.",
    "Fund-level sources & uses": "مصادر واستخدامات الصندوق",
    "Who funded the spend (equity by party, debt, and revenue the project retained) → where it went, including the fund fees the project ledger omits.":
      "من موّل الإنفاق (الملكية حسب الطرف، والدين، والإيراد المحتجز في المشروع) ← وأين صُرف، شاملًا رسوم الصندوق التي لا يتضمنها سجل المشروع.",
    "Capital & distribution waterfall": "رأس المال وشلال التوزيعات",
    "Equity contributed by each party, and how every distributed riyal is split across the three tiers.":
      "مساهمة كل طرف في رأس المال، وكيف يُقسّم كل ريال موزَّع على المراتب الثلاث.",
    "Distribution buckets": "مراتب التوزيع",
    "Fees — rates & totals": "الرسوم — النسب والإجماليات",
    "What each fee is charged on, and how much it comes to over the fund's life.":
      "على أي أساس تُحتسب كل رسوم، وكم تبلغ على مدى عمر الصندوق.",
    "Fee timeline — when each fee accrues": "الجدول الزمني للرسوم — متى تُستحق كل رسوم",
    "Year by year, so you can see exactly when the subscription, asset management, development and performance fees are charged.":
      "سنة بسنة، لترى بدقة متى تُحتسب رسوم الاكتتاب وإدارة الأصول والتطوير والأداء.",
    "Every call and distribution for LP, Developer and GP, year by year.":
      "كل استدعاء وتوزيع للشريك المحدود والمطوّر والشريك العام، سنة بسنة.",
    "New tab unlocked": "تبويب جديد متاح",
    "Fund tab is now available": "تبويب الصندوق أصبح متاحًا",
    "Fund structuring is on, so tab 11 · Fund has been added — capital calls, the distribution waterfall, fees and returns for each party.":
      "تمّ تفعيل هيكلة الصندوق، فأُضيف التبويب 11 · الصندوق — استدعاءات رأس المال وشلال التوزيعات والرسوم وعوائد كل طرف.",
    "Open the Fund tab": "افتح تبويب الصندوق",
    "Dismiss": "إغلاق",
    "Asset management": "إدارة الأصول",
    "Development fee": "رسوم التطوير",
    "Performance fee": "رسوم الأداء",
    "Total fees": "إجمالي الرسوم",
    "To GP · annual · on unreturned equity": "للشريك العام · سنويًا · على الملكية غير المستردة",
    "To Developer · % of constr. + site": "للمطوّر · ٪ من الإنشاء + الموقع",
    "Distribution waterfall": "شلال التوزيعات",
    "Compounded · pro-rata to all equity": "مركّب · بالتناسب على كامل الملكية",
    "GP share after pref / catch-up": "حصة الشريك العام بعد العائد الممتاز واللحاق",
    "GP share of profit above the preferred return": "حصة الشريك العام من الربح الزائد عن العائد الممتاز",
    "Of distributions after return of capital + preferred return": "من التوزيعات بعد استرداد رأس المال والعائد الممتاز",
    "(1) return of capital pro-rata to whoever contributed cash, (2) compounded preferred return pro-rata, (3) performance fee —":
      "(1) استرداد رأس المال بالتناسب لمن ساهم نقدًا، (2) العائد الممتاز المركّب بالتناسب، (3) رسوم الأداء —",
    "GP catch-up": "لحاق الشريك العام",
    "100% = full catch-up · 50% = 50/50": "100% = لحاق كامل · 50% = مناصفة",
    "European waterfall:": "الشلال الأوروبي:",
    "return of capital": "استرداد رأس المال",
    "pro-rata to whoever contributed cash, (2)": "بالتناسب لمن ساهم نقدًا، (2)",
    "compounded preferred return": "عائد ممتاز مركّب",
    "pro-rata, (3)": "بالتناسب، (3)",
    "GP catch-up at the chosen % until promote share is reached,": "لحاق الشريك العام بالنسبة المحددة حتى بلوغ حصة الحوافز،",
    "performance fee": "رسوم الأداء",
    "to GP,": "للشريك العام،",
    "pro-rata to investors (LP + Dev only — GP is rewarded via promote).":
      "بالتناسب للمستثمرين (الشريك المحدود والمطوّر فقط — إذ يُكافأ الشريك العام عبر حوافز الأداء).",
    "% of land — over 100% adds floors (200% ≈ 2 levels)": "٪ من مساحة الأرض — أكثر من 100% يعني طوابق إضافية (200% ≈ طابقان)",
    "Basement coverage is measured as % of the land area. If the basement spans more than one floor, enter more than 100% — e.g. two full basement floors ≈ 200%.": "تُحسب تغطية القبو كنسبة من مساحة الأرض. إذا كان القبو أكثر من طابق واحد، أدخل نسبة أعلى من 100% — مثلًا: طابقان كاملان ≈ 200%.",
    "Sale price": "سعر البيع", "Avg unit size": "متوسط مساحة الوحدة", "Unit price": "سعر الوحدة",
    "Units (derived)": "عدد الوحدات (محسوب)", "Keys": "المفاتيح", "Key price": "سعر المفتاح",
    "Rent": "الإيجار", "Units": "الوحدات", "ADR": "متوسط سعر الليلة ADR",
    "Initial occupancy": "الإشغال الابتدائي", "Years to stabilization": "سنوات الاستقرار",
    "Stabilized occupancy": "الإشغال المستقر", "OpEx": "مصاريف التشغيل", "Exit cap rate": "معدل الرسملة عند التخارج",
    "Sales period": "فترة البيع", "Operating period": "فترة التشغيل",

    /* Sidebar — timing / costs / financing */
    "Project Timing": "الجدول الزمني", "Pre-design": "ما قبل التصميم", "Construction": "الإنشاء",
    "Pre-sales start": "بدء البيع على الخارطة", "Horizon": "الأفق الزمني", "Auto": "تلقائي",
    "Predesign + construction + hold / sell-down + tail": "التصميم + الإنشاء + التشغيل / البيع + هامش",
    "General Costs": "التكاليف العامة", "Soft costs": "التكاليف غير المباشرة", "Contingency": "الاحتياطي",
    "Marketing": "التسويق", "Sales commission": "عمولة البيع", "Gov / sales fees": "رسوم حكومية / بيع",
    "Financing": "التمويل", "LTC": "نسبة التمويل LTC", "Interest": "الفائدة",
    "Hurdle / discount rate": "معدل الخصم / العائد المستهدف",
    "Fund structure": "هيكل الصندوق",
    "LP": "المستثمرون LP", "Developer": "المطوّر", "GP": "مدير الصندوق GP",
    "Acquisition fee": "رسوم الاستحواذ", "Asset mgmt (yr)": "إدارة الأصول (سنويًا)",
    "Development fee": "رسوم التطوير", "Preferred return": "العائد الممتاز",
    "Performance fee": "رسوم الأداء", "Catch-up %": "نسبة التعويض",
    "Reset": "إعادة تعيين", "Export": "تصدير", "Print": "طباعة", "Export PDF": "تصدير PDF",
    "Click to rename": "انقر لتغيير الاسم",
    "Name this opportunity…": "سمِّ هذه الفرصة…",
    "Used for NPV and the IRR hurdle check": "يُستخدم لحساب NPV ولمقارنة IRR بالعائد المستهدف",
    "The hurdle is the cost-of-equity benchmark. Equity IRR above this line clears the gate; NPV is discounted at this rate. Component-level exit cap rates live with each program component above.": "العائد المستهدف هو مرجع تكلفة حقوق الملكية: إذا تجاوزه IRR الملكية فالمشروع يجتاز البوابة، ويُخصم NPV بهذا المعدل. أما معدلات رسملة التخارج فتُضبط داخل كل مكوّن أعلاه.",
    "Reset all inputs and clear program components?": "إعادة تعيين جميع المدخلات ومسح مكوّنات البرنامج؟",

    /* Results — panels & KPIs */
    "Investment Committee · Summary": "لجنة الاستثمار · الملخص",
    "Equity NPV": "NPV الملكية", "Equity Multiple": "مضاعف الملكية", "Payback (equity)": "فترة الاسترداد (الملكية)",
    "Profit (levered)": "الربح (بعد التمويل)", "Project IRR": "IRR المشروع",
    "Annual rent (stab.)": "الإيجار السنوي (مستقر)", "Annual NOI (stab.)": "صافي الدخل التشغيلي (مستقر)",
    "Peak debt": "ذروة الدين", "Min DSCR": "أدنى تغطية لخدمة الدين",
    "Cumulative Net Cashflow (Levered)": "صافي التدفق النقدي التراكمي (بعد التمويل)",
    "Massing": "الكتلة العمرانية", "Scenario Range": "نطاق السيناريوهات",
    "Cashflow · S-Curve & Annual Table": "التدفقات النقدية · منحنى S والجدول السنوي",
    "Sources & uses over time": "المصادر والاستخدامات عبر الزمن",
    "Cashflow · annual & cumulative": "التدفقات النقدية · سنوي وتراكمي",
    "Project & equity cashflow over time": "تدفقات المشروع والملكية عبر الزمن",
    "Monthly cashflow — stacked": "التدفق النقدي الشهري — تراكمي",
    "① Project cashflow (unlevered)": "① تدفق المشروع (قبل التمويل)",
    "② Equity cashflow (levered)": "② تدفق الملكية (بعد التمويل)",
    "③ Capital deployed — debt draws & equity contributions": "③ رأس المال الموظّف — سحوبات الدين ومساهمات الملكية",
    "Cost build-up": "بناء التكلفة", "Where the money goes": "أين تذهب الأموال",
    "Cost stack": "هيكل التكاليف", "Composition": "التركيبة",
    "Unit mix · sales velocity · NOI": "مزيج الوحدات · سرعة البيع · صافي الدخل",
    "Program & revenue": "البرنامج والإيرادات", "Component table": "جدول المكوّنات",
    "Sales velocity (cumulative)": "سرعة المبيعات (تراكمي)",
    "Rent / lease income (monthly)": "دخل الإيجار (شهري)",
    "Sales — annual": "المبيعات — سنوي",
    "Rent / lease income — annual": "دخل الإيجار — سنوي",
    "Annual rent income build-up by component": "الدخل الإيجاري السنوي حسب المكوّن",
    "What moves the needle": "ما الذي يحرّك النتيجة",
    "Tornado · Equity IRR sensitivity (±15%)": "تورنادو · حساسية IRR الملكية (±15%)",
    "Two-way: Price (rows) × Construction cost (cols)": "ثنائي: السعر (صفوف) × تكلفة الإنشاء (أعمدة)",
    "Probabilistic outcomes": "النتائج الاحتمالية",
    "P50 IRR": "IRR الوسيط P50", "P10 → P90": "P10 → P90",
    "Prob ≥ Hurdle": "احتمال ≥ المستهدف", "Prob loss": "احتمال الخسارة",
    "Equity IRR distribution": "توزيع IRR الملكية", "Equity NPV distribution": "توزيع NPV الملكية",
    "Levered profit distribution": "توزيع الربح بعد التمويل",
    "Capital structure": "هيكل رأس المال", "Debt & equity waterfall": "شلال الدين والملكية",
    "Debt drawn": "الدين المسحوب", "Equity contributed": "الملكية المساهمة",
    "Peak debt outstanding": "ذروة رصيد الدين", "Total interest paid": "إجمالي الفوائد المدفوعة",
    "Sources cover uses · over time": "المصادر تغطي الاستخدامات · عبر الزمن",
    "Uses incurred · over time": "الاستخدامات المتكبدة · عبر الزمن",
    "Debt schedule · balance, draws & repayments": "جدول الدين · الرصيد والسحوبات والسداد",
    "Returns split — base case": "توزيع العوائد — الحالة الأساسية",
    "Annual debt schedule": "جدول الدين السنوي",
    "Cash applied to debt service — positive cashflow swept against the loan": "النقد الموجّه لخدمة الدين — الفائض يسدَّد للقرض",
    "Sources": "المصادر", "Uses": "الاستخدامات",
    "Diligence": "الفحص النافي", "Risk register & red flags": "سجل المخاطر والتنبيهات",
    "Red flags": "تنبيهات حرجة", "Watch items": "نقاط للمتابعة", "OK signals": "مؤشرات سليمة",
    "Quick diagnostics": "تشخيص سريع",
    "Red flag": "تنبيه حرج", "Red Flag": "تنبيه حرج", "RED FLAG": "تنبيه حرج", "Watch": "للمتابعة", "WATCH": "للمتابعة", "OK": "سليم",
    /* Risk register — titles */
    "Land allocation exceeds 100%": "توزيع الأرض يتجاوز 100%",
    "No components allocated to land": "لا توجد مكوّنات موزعة على الأرض",
    "Add at least one component.": "أضف مكوّنًا واحدًا على الأقل.",
    "Land allocation balanced": "توزيع الأرض متوازن",
    "IRR could not be computed": "تعذّر حساب معدل العائد الداخلي IRR",
    "Cashflow does not change sign — revenue may not cover costs.": "التدفق النقدي لا يغيّر إشارته — قد لا تغطي الإيرادات التكاليف.",
    "Equity IRR well below hurdle": "IRR الملكية أدنى بكثير من المستهدف",
    "Equity IRR below hurdle": "IRR الملكية أدنى من المستهدف",
    "Equity IRR clears hurdle": "IRR الملكية يتجاوز المستهدف",
    "Project shows a loss": "المشروع يُظهر خسارة",
    "Leverage above 70% LTC": "الرافعة التمويلية تتجاوز 70%",
    "High debt exposure — sensitivity to rate moves will be material.": "انكشاف مرتفع على الدين — الحساسية لتحركات الفائدة ستكون جوهرية.",
    "Contingency below 5%": "الاحتياطي أقل من 5%",
    "Limited buffer for construction overruns.": "هامش محدود لتجاوزات تكاليف الإنشاء.",
    "Soft costs look low": "التكاليف غير المباشرة تبدو منخفضة",
    "Typical design + consultants + PM is 10–15% of construction.": "المعتاد للتصميم والاستشاريين وإدارة المشروع 10–15% من تكلفة الإنشاء.",
    "Aggressive construction timeline": "جدول إنشاء متفائل جدًا",
    "Long construction window": "فترة إنشاء طويلة",
    "Carry costs and market risk grow significantly past 5 years.": "تكاليف التمويل ومخاطر السوق تتعاظم بعد 5 سنوات.",
    "Peak debt at facility limit": "ذروة الدين عند حد التسهيلات",
    "Little headroom — consider larger facility or staged equity.": "هامش ضئيل — فكّر في تسهيلات أكبر أو ضخ ملكية على مراحل.",
    "Unallocated land may represent public realm or future-phase reserve — confirm intent.": "الأرض غير الموزعة قد تمثل مرافق عامة أو احتياطي مراحل مستقبلية — تأكد من القصد.",
    /* Summary tab */
    "Project clears the hurdle": "المشروع يتجاوز العائد المستهدف",
    "Project below hurdle — review assumptions": "المشروع دون العائد المستهدف — راجع الفرضيات",
    "Unlevered": "قبل التمويل", "Levered": "بعد التمويل",
    "Gross, at stabilization": "إجمالي، عند الاستقرار",
    "Costs (incl. OpEx)": "التكاليف (شاملة التشغيل)",
    "Sales + Rent + Exit": "بيع + إيجار + تخارج",
    "Debt draw / repay": "سحب / سداد الدين",
    "Cumulative": "التراكمي",
    "Land allocated": "الأرض الموزعة",
    "Total GFA": "إجمالي مسطحات البناء GFA", "Total NSA": "إجمالي المساحة الصافية NSA",
    "Total units": "إجمالي الوحدات", "Total keys": "إجمالي المفاتيح", "Components": "المكوّنات",
    "No equity called": "لا استدعاء لرأس مال",
    /* Cost tab */
    "Transfer fees": "رسوم التصرّف", "Site work": "أعمال الموقع", "Soft": "غير مباشرة",
    "Selling": "تكاليف البيع", "Total cost · all-in": "إجمالي التكلفة · شامل",
    /* Program tab */
    "Component": "المكوّن", "Land %": "حصة الأرض %",
    "sale": "بيع", "lease": "تأجير",
    "Total sales:": "إجمالي المبيعات:", "Avg velocity:": "متوسط سرعة البيع:",
    "Net sales (after commission):": "صافي المبيعات (بعد العمولة):",
    "OpEx (deducted)": "مصاريف التشغيل (مخصومة)",
    "NOI (after OpEx)": "صافي الدخل التشغيلي NOI",
    "Leasing — whole-period totals": "التأجير — إجمالي فترة التشغيل",
    "All leasable components, over the full operating period": "جميع المكوّنات التأجيرية على كامل فترة التشغيل",
    "Operating income (collected)": "الدخل التشغيلي (المحصّل)",
    "Operating expenses": "المصاريف التشغيلية",
    "Total NOI (whole period)": "إجمالي صافي الدخل التشغيلي (كامل الفترة)",
    "Sales — total proceeds": "المبيعات — إجمالي المتحصلات",
    "All sold components": "جميع المكوّنات المباعة",
    "Gross sales": "إجمالي المبيعات",
    "Net sales proceeds": "صافي متحصلات البيع",
    "Net exit proceeds": "صافي متحصلات التخارج",
    "Total (NOI + exit proceeds)": "الإجمالي (صافي الدخل التشغيلي + التخارج)",
    "Uses & Sources": "الاستخدامات والمصادر",
    "Chart": "رسم بياني", "Table": "جدول",
    "Project cashflow": "تدفق المشروع",
    "Full bar = gross income": "طول الشريط الكامل = الدخل الإجمالي",
    "Stab. gross:": "الدخل الإجمالي المستقر:", "Stab. NOI:": "صافي الدخل المستقر:",
    "Operating starts:": "بدء التشغيل:",
    /* Cashflow tab */
    "Selling costs": "تكاليف البيع", "Sales": "المبيعات", "Rent / Lease income": "دخل الإيجار",
    "All project uses and revenues — before any debt activity.": "جميع استخدامات المشروع وإيراداته — قبل أي نشاط تمويلي.",
    "Project cashflow + debt draws + debt repayments (incl. interest) = equity cashflow.": "تدفق المشروع + سحوبات الدين − سداد الدين (شامل الفوائد) = تدفق الملكية.",
    "Year": "السنة", "Constr.": "الإنشاء", "Cont.": "الاحتياطي", "Sell costs": "تكاليف البيع",
    "Exit": "التخارج", "Project CF": "تدفق المشروع", "Cum.": "التراكمي",
    "+ Debt draw": "+ سحب الدين", "− Debt repay": "− سداد الدين",
    "of which: interest": "منها: الفوائد", "= Equity CF": "= تدفق الملكية", "Cum. equity": "تراكمي الملكية",
    "unlevered": "قبل التمويل", "levered": "بعد التمويل",
    /* Capital tab */
    "Max balance at any month": "أقصى رصيد في أي شهر",
    "Cumulative funding stack vs cumulative project spend": "مصادر التمويل التراكمية مقابل الإنفاق التراكمي",
    "Equity injected": "الملكية المضخوخة",
    "Debt drawn (incl. capitalised interest)": "الدين المسحوب (شامل الفوائد المرسملة)",
    "Revenue applied": "الإيراد المطبَّق على التكاليف",
    "Uses incurred (cumulative)": "الاستخدامات المتكبدة (تراكمي)",
    "Cumulative spend broken down by category": "الإنفاق التراكمي حسب الفئة",
    "Land + fees": "الأرض + الرسوم",
    /* Returns tab */
    "Levered vs unlevered, multiples, payback and profit decomposition": "قبل التمويل وبعده: المضاعفات وفترة الاسترداد وتفكيك الربح",
    "Clears hurdle": "يتجاوز المستهدف", "Below hurdle": "دون المستهدف",
    "Property fundamentals": "أساسيات العقار",
    "No debt assumption": "بافتراض عدم وجود دين",
    "Cum. equity ≥ 0": "تراكمي الملكية ≥ 0", "Cum. project ≥ 0": "تراكمي المشروع ≥ 0",
    "Leverage benefit on IRR": "أثر الرافعة على IRR",
    "Equity IRR − Project IRR": "‏IRR الملكية − IRR المشروع",
    "Interest paid": "الفوائد المدفوعة", "Cost of leverage": "تكلفة الرافعة",
    "Profit boost from debt": "أثر الدين على الربح",
    "Levered − unlevered profit": "الربح بعد التمويل − قبله",
    "Equity (levered)": "الملكية (بعد التمويل)", "Project (unlevered)": "المشروع (قبل التمويل)",
    "Payback (equity)": "استرداد الملكية",
    "Revenue": "الإيراد", "−Land": "−الأرض", "−Constr.": "−الإنشاء", "−Infra": "−البنية التحتية",
    "−Site": "−الموقع", "−Soft": "−غير مباشرة", "−Cont.": "−الاحتياطي", "−Selling": "−البيع", "−Interest": "−الفوائد",
    /* Sensitivity tab */
    "Land price / m²": "سعر الأرض / م²", "Interest rate": "معدل الفائدة",
    "Soft costs %": "التكاليف غير المباشرة %", "Contingency %": "الاحتياطي %", "Marketing %": "التسويق %",
    "Construction duration": "مدة الإنشاء",
    /* Scenarios tab */
    "Metric": "المؤشر", "Δ Range": "نطاق التغير Δ",
    "Equity ROI": "عائد الملكية ROI", "Profit (unlevered)": "الربح (قبل التمويل)",
    "Peak equity": "ذروة الملكية", "Total interest": "إجمالي الفوائد",
    "Equity payback (mo)": "استرداد الملكية (شهر)",
    "Scenario assumptions: Downside shifts pricing −10%, construction +10%, and adds 3-month delay. Upside shifts pricing +10%, construction −5%, removes 2 months. Base = your inputs.":
      "فرضيات السيناريوهات: المتحفّظ يخفّض الأسعار 10% ويرفع الإنشاء 10% ويضيف تأخيرًا 3 أشهر. المتفائل يرفع الأسعار 10% ويخفّض الإنشاء 5% ويختصر شهرين. الأساسي = مدخلاتك.",
    /* Monte Carlo tab */
    "Trials": "عدد المحاولات", "↻ Re-run": "↻ إعادة التشغيل",
    "Shocks: ±7% pricing · ±8% cost · ±2mo delay · ±5% occupancy": "الصدمات: ±7% الأسعار · ±8% التكلفة · ±2 شهر تأخير · ±5% الإشغال",
    /* Fund tab */
    "Fund life": "عمر الصندوق",
    "· from first call to final exit": "· من أول استدعاء حتى التخارج النهائي",
    "Across all three parties": "عبر الأطراف الثلاثة",
    "Acq + asset mgmt + dev": "استحواذ + إدارة أصول + تطوير",
    "Multiple on invested": "مضاعف رأس المال المستثمر",
    "Contributed": "المساهمة", "Distributed": "التوزيعات", "(of which fees)": "(منها رسوم)",
    "Net profit": "صافي الربح",
    "Pref + pro-rata of residuals after promote": "العائد الممتاز + الحصة النسبية من المتبقي بعد الحافز",
    "/mo": "/شهر", "/yr": "/سنة", "and": "و",
    /* Cashflow — capital deployed table */
    "Where the funding came from each year — debt drawn from the facility vs. equity contributed by investors. Together they fund the project deficit.": "مصدر التمويل كل سنة — الدين المسحوب من التسهيلات مقابل الملكية المساهم بها من المستثمرين، ومعًا يغطيان عجز المشروع.",
    "Debt draw": "سحب الدين", "Equity contribution": "مساهمة الملكية", "Total deployed": "إجمالي الموظّف",
    "Debt repay": "سداد الدين", "Cum. debt drawn": "تراكمي السحب", "Cum. equity contrib.": "تراكمي المساهمة",
    "Total": "الإجمالي", "Funds the uses = capital tab Sources": "يموّل الاستخدامات = مصادر تبويب رأس المال",
    /* Capital tab — debt schedule */
    "Selling / mktg": "البيع / التسويق",
    "Outstanding balance (top) · monthly draws and repayments (bottom)": "الرصيد القائم (أعلى) · السحوبات والسداد الشهري (أسفل)",
    "Outstanding balance": "الرصيد القائم", "Monthly flows": "التدفقات الشهرية",
    "Horizon auto-sized to": "الأفق محسوب تلقائيًا:", "months": "شهرًا",
    "yrs) — predesign + construction + sell-down / hold + tail.": "سنة) — التصميم + الإنشاء + البيع/التشغيل + هامش.",
    /* Scenarios paragraph (split around <strong>) */
    "Scenario assumptions:": "فرضيات السيناريوهات:",
    "Downside shifts pricing −10%, construction +10%, and adds 3-month delay. Upside shifts pricing +10%, construction −5%, removes 2 months. Base = your inputs.": "المتحفّظ: أسعار −10%، إنشاء +10%، وتأخير 3 أشهر. المتفائل: أسعار +10%، إنشاء −5%، واختصار شهرين. الأساسي = مدخلاتك.",
    /* Fund tab — sources & uses, fees, buckets */
    "Who funded the spend (equity by party, debt, and revenue the project retained) → where it went (project costs": "من موّل الإنفاق (ملكية حسب الطرف، ودين، وإيراد احتفظ به المشروع) → وأين ذهب (تكاليف المشروع",
    "fund fees). Cash basis — the Capital tab shows the project-level accounting ledger, which excludes fund fees.": "رسوم الصندوق). أساس نقدي — تبويب رأس المال يعرض دفتر المشروع المحاسبي دون رسوم الصندوق.",
    "Sources · capital raised": "المصادر · رأس المال المجموع",
    "Uses · where the capital went": "الاستخدامات · أين ذهب رأس المال",
    "Party": "الطرف", "Amount": "المبلغ", "% of total": "% من الإجمالي",
    "LP commitment": "التزام المستثمرين LP", "Cash investors (limited partners)": "مستثمرون نقديون (شركاء محدودون)",
    "Developer commitment": "التزام المطوّر", "Co-invest from the developer": "مشاركة استثمارية من المطوّر",
    "GP co-invest": "مشاركة مدير الصندوق GP", "Fund manager's own capital": "رأس مال مدير الصندوق الخاص",
    "Debt facility drawn": "التسهيلات المسحوبة",
    "Revenue applied to costs": "إيراد مطبَّق على التكاليف",
    "Pre-sales & operating cash retained by the project": "بيع مسبق ونقد تشغيلي احتفظ به المشروع",
    "Subtotal · equity": "إجمالي فرعي · الملكية", "Total sources": "إجمالي المصادر",
    "Item": "البند", "Recipient": "المستفيد", "Contractors": "مقاولون",
    "Subtotal · project": "إجمالي فرعي · المشروع",
    "Fund fees · the GP & Developer take": "رسوم الصندوق · نصيب المدير والمطوّر",
    "No fund fees configured.": "لا توجد رسوم صندوق مفعّلة.",
    "Subtotal · fees": "إجمالي فرعي · الرسوم", "Total uses": "إجمالي الاستخدامات",
    "Balanced · Σ sources = Σ uses": "متوازن · مجموع المصادر = مجموع الاستخدامات",
    "Out of balance": "غير متوازن",
    "Fee": "الرسم", "Rate": "المعدل", "Basis": "الأساس", "% of fees": "% من الرسوم",
    "Asset mgmt fee": "رسوم إدارة الأصول", "Asset management fee": "رسوم إدارة الأصول",
    "Catch-up": "التعويض", "Performance fee (promote)": "رسوم الأداء (الحافز)",
    "Total to GP + Developer": "الإجمالي للمدير + المطوّر",
    "Total project cost · one-time": "إجمالي تكلفة المشروع · مرة واحدة",
    "Unreturned equity balance · monthly": "رصيد الملكية غير المستردة · شهري",
    "Construction + site cost · S-curve": "الإنشاء + الموقع · منحنى S",
    "Of distributions after pref + catch-up": "من التوزيعات بعد العائد الممتاز والتعويض",
    "Of each $ distributed until promote share is reached": "من كل ريال موزّع حتى بلوغ حصة الحافز",
    "1 · Return of capital": "1 · استرداد رأس المال",
    "Pro-rata to whoever contributed cash (LP + Dev + GP co-invest)": "بالحصة النسبية لكل من ساهم نقدًا (المستثمرون + المطوّر + المدير)",
    "Pro-rata to all equity on unreturned capital balances": "بالحصة النسبية لكامل الملكية على الأرصدة غير المستردة",
    "GP receives its catch-up share until cumulative promote matches the performance fee target": "يتلقى المدير حصة التعويض حتى يبلغ الحافز التراكمي مستهدف رسوم الأداء",
    "Remaining distribution pro-rata to LP + Developer (cash contributors only). GP is rewarded via promote.": "المتبقي يوزَّع بالحصة النسبية على المستثمرين والمطوّر (المساهمون نقدًا فقط)، ويكافأ المدير عبر الحافز.",
    "Profit above ROC → GP take-home": "الربح فوق رأس المال المسترد → نصيب المدير",
    "LP cum.": "تراكمي LP", "Dev cum.": "تراكمي المطوّر", "GP cum.": "تراكمي GP",
    "Land + transfer fees": "الأرض + رسوم التصرّف", "Marketing + selling": "التسويق + البيع",
    "Financing interest": "فوائد التمويل", "Land infrastructure": "البنية التحتية للأرض",
    "Peak": "الذروة", "Draws (monthly)": "السحوبات (شهري)",
    "Principal repayment": "سداد أصل الدين", "Interest accrued": "الفوائد المستحقة",
    "Opening balance": "الرصيد الافتتاحي", "Drawn": "المسحوب",
    "Repaid (principal + int.)": "المسدَّد (أصل + فوائد)", "Closing balance": "الرصيد الختامي",
    "Funding order · Debt-first draw + cash sweep": "ترتيب التمويل · الدين أولًا + المسح النقدي",
    "The facility funds": "تموّل التسهيلات",
    "100% of each month's development outflows": "100% من التدفقات التطويرية الشهرية",
    "(land, construction, site, soft, contingency) — and accrued interest capitalises into the balance, consuming headroom — until the facility cap of": "(الأرض، الإنشاء، الموقع، غير المباشرة، الاحتياطي) — وتُرسمل الفوائد المستحقة في الرصيد مستهلكةً السقف — حتى بلوغ سقف التسهيلات",
    "LTC) is reached. Only then is equity called for the remainder. Interest accrues monthly at": "LTC). عندها فقط تُستدعى الملكية للمتبقي. تُستحق الفوائد شهريًا بمعدل",
    "on the outstanding balance.": "على الرصيد القائم.",
    "Every SAR of positive operating cashflow": "كل ريال من التدفق التشغيلي الموجب",
    "Funding order · Revenue → Debt → Equity": "ترتيب التمويل · الإيراد ثم الدين ثم الملكية",
    "Each month's project income covers that month's costs first": "دخل المشروع في كل شهر يغطي تكاليف الشهر نفسه أولًا",
    "(off-plan sales, rent and exit proceeds fund land, construction, site, soft and contingency directly). Any shortfall is drawn from the facility — interest capitalises into the balance only when no project cash is available to pay it — up to the facility cap of": "(فمبيعات ما قبل الإنشاء والإيجار وعوائد التخارج تموّل الأرض والإنشاء وأعمال الموقع والتكاليف غير المباشرة والاحتياطي مباشرة). وأي عجز يُسحب من التسهيلات — ولا تُرسمل الفوائد في الرصيد إلا عند عدم توفر نقد لسدادها — حتى سقف التسهيلات البالغ",
    "LTC) is reached. Equity is called only for what neither revenue nor debt could cover. Interest accrues monthly at": "LTC). ولا تُستدعى الملكية إلا لما عجز الإيراد والدين عن تغطيته. تُستحق الفوائد شهريًا بمعدل",
    "Surplus income": "فائض الدخل",
    "— whatever remains after covering the month's own costs — pays interest in cash, then sweeps the principal immediately (repaid amounts re-open the facility for later draws), and is distributed to equity only once no further contributions are needed. Any residual balance at the project's natural exit month is force-cleared from exit proceeds.": "— ما يتبقى بعد تغطية تكاليف الشهر نفسه — يسدِّد الفوائد نقدًا ثم أصل الدين فورًا (والمبالغ المسدَّدة تعيد فتح التسهيلات لسحوبات لاحقة)، ولا يُوزَّع على الملكية إلا بعد انتفاء الحاجة لمساهمات إضافية. وأي رصيد متبقٍ عند شهر التخارج الطبيعي يُسدَّد من عوائد التخارج.",
    "Funding order:": "ترتيب التمويل:",
    "Retained cash (end)": "النقد المحتجز (نهاية السنة)",
    "Equity calls out, distributions in. Surplus cash is retained to fund later periods — it distributes only once no further contributions are needed.": "مساهمات الملكية خارجة والتوزيعات داخلة. يُحتجز فائض النقد لتمويل الفترات اللاحقة — ولا يُوزَّع إلا بعد انتفاء الحاجة لمساهمات إضافية.",
    "each month's income (e.g. off-plan sales) covers that month's costs first; any shortfall is drawn from the facility (interest capitalises only when no cash can pay it), and equity covers the remainder. Surplus cash pays interest and sweeps the loan at any time — repaid amounts can be redrawn — and equity takes distributions only when no further contributions are needed.": "دخل كل شهر (مثل مبيعات ما قبل الإنشاء) يغطي تكاليف الشهر نفسه أولًا؛ وأي عجز يُسحب من التسهيلات (ولا تُرسمل الفوائد إلا عند عدم توفر نقد لسدادها)، وتغطي الملكية المتبقي. وفائض النقد يسدِّد الفوائد وأصل الدين في أي وقت — والمبالغ المسدَّدة يمكن إعادة سحبها — ولا تتلقى الملكية توزيعات إلا بعد انتفاء الحاجة لمساهمات إضافية.",
    "— sales receipts, NOI, and exit proceeds — sweeps against accrued interest first, then principal, until the loan is fully closed. Any residual balance at the project's natural exit month is force-cleared from exit proceeds.": "— متحصلات البيع وصافي الدخل وعوائد التخارج — يُمسح أولًا مقابل الفوائد المستحقة ثم أصل الدين حتى إغلاق القرض بالكامل، وأي رصيد متبقٍ عند شهر التخارج الطبيعي يُسدَّد من عوائد التخارج.",
    "Each row shows the year's positive operating cashflow (sales + NOI + exit) and how much was swept against interest then principal. The remainder is what flowed through to equity that year.": "كل صف يعرض التدفق التشغيلي الموجب للسنة (بيع + صافي دخل + تخارج) وكم مُسح مقابل الفوائد ثم أصل الدين، والمتبقي هو ما وصل إلى الملكية تلك السنة.",
    "Each row shows the year's positive operating cashflow (sales + NOI + exit) and where it went: funding that year's own costs first, then interest, then the principal sweep — with distributions to equity only once no further contributions are needed.": "كل صف يعرض التدفق التشغيلي الموجب للسنة (بيع + صافي دخل + تخارج) وأين ذهب: تمويل تكاليف السنة نفسها أولًا، ثم الفوائد، ثم سداد أصل الدين — ولا تُوزَّع مبالغ على الملكية إلا بعد انتفاء الحاجة لمساهمات إضافية.",
    "→ Applied to costs": "→ مطبَّق على التكاليف",
    "Distributed to equity": "الموزَّع للملكية",
    "Positive cashflow": "التدفق الموجب", "→ Interest paid": "→ فوائد مدفوعة",
    "→ Principal repaid": "→ أصل مسدَّد", "Net to equity": "الصافي للملكية",
    "Government fees": "رسوم حكومية", "Debt repaid + interest": "الدين المسدَّد + الفوائد",
    "Equity returned": "الملكية المستردة", "Equity multiple": "مضاعف الملكية",
    "equity at risk": "الملكية المعرّضة",
    "Peak equity at risk": "ذروة الملكية المعرّضة",
    "Balanced — Σ sources = Σ uses": "متوازن — مجموع المصادر = مجموع الاستخدامات",
    "Base IRR": "‏IRR الأساس",
    "Project horizon pinned to": "أفق المشروع مثبّت عند",
    "yrs — fund closes at exit; no fees accrue past Y": "سنة — يُغلق الصندوق عند التخارج ولا تُستحق رسوم بعد السنة ",
    "vs": "مقابل", "pref": "عائد ممتاز",
    /* Quick diagnostics labels */
    "Land as % of dev cost": "الأرض كنسبة من تكلفة التطوير",
    "Construction as % of dev cost": "الإنشاء كنسبة من تكلفة التطوير",
    "Profit margin (on revenue)": "هامش الربح (على الإيراد)",
    "ROI on cost": "العائد على التكلفة",
    "Interest / dev cost": "الفوائد / تكلفة التطوير",
    "Selling cost / revenue": "تكاليف البيع / الإيراد",
    /* Diagnostics — categories, new metrics and their explanations */
    "Cost structure": "تركيبة التكاليف",
    "Profitability": "الربحية",
    "Financing & liquidity": "التمويل والسيولة",
    "Soft costs & contingency": "التكاليف غير المباشرة والاحتياطي",
    "Build cost per m² GFA": "تكلفة البناء لكل م² إجمالي",
    "Revenue per m² sellable / leasable": "الإيراد لكل م² قابل للبيع أو التأجير",
    "Peak debt vs facility": "ذروة الدين مقابل سقف التسهيلات",
    "Equity share of funding": "حصة الملكية من التمويل",
    "Land's share of development cost. Much above 30% and the deal is land-heavy, which squeezes the margin.":
      "حصة الأرض من تكلفة التطوير. وتجاوزها 30% كثيرًا يعني ثقل تكلفة الأرض مما يضغط على الهامش.",
    "Hard construction as a share of development cost — normally the largest single line.":
      "تكلفة الإنشاء المباشرة كنسبة من تكلفة التطوير — وهي عادةً أكبر بند منفرد.",
    "Design, permits, management and the risk buffer, as a share of development cost.":
      "التصميم والتراخيص والإدارة واحتياطي المخاطر، كنسبة من تكلفة التطوير.",
    "All-in construction and site work per m² of built area — compare it against local benchmarks.":
      "إجمالي تكلفة الإنشاء وأعمال الموقع لكل م² مبني — قارنها بالمعدلات السائدة في السوق.",
    "Profit after financing as a share of total revenue. Under ~12% leaves little room for error.":
      "الربح بعد التمويل كنسبة من إجمالي الإيراد. وأقل من نحو 12% يترك هامش خطأ ضيقًا.",
    "Profit after financing over all-in cost including interest — the return on every riyal spent.":
      "الربح بعد التمويل مقسومًا على إجمالي التكلفة شاملة الفوائد — أي العائد على كل ريال منفق.",
    "Total revenue per m² of saleable or leasable area — a quick sanity check against market pricing.":
      "إجمالي الإيراد لكل م² قابل للبيع أو التأجير — فحص سريع لمنطقية الأسعار مقابل السوق.",
    "Financing cost as a share of development cost. High values point to heavy leverage or a long build.":
      "تكلفة التمويل كنسبة من تكلفة التطوير. وارتفاعها يشير إلى رفع مالي كبير أو فترة إنشاء طويلة.",
    "\"Development cost\" here = land + transfer fees + construction + site work and infrastructure + soft costs + contingency. It EXCLUDES financing interest and selling costs (marketing, sales commission, government fees). It is also the base for the debt facility (LTC × development cost).":
      "المقصود بـ«تكلفة التطوير» هنا: الأرض + رسوم النقل + الإنشاء + أعمال الموقع والبنية التحتية + التكاليف غير المباشرة + الاحتياطي. ولا تشمل فوائد التمويل ولا تكاليف البيع (التسويق وعمولة البيع والرسوم الحكومية). وهي أيضًا الأساس الذي يُحتسب عليه سقف التمويل (نسبة التمويل إلى التكلفة × تكلفة التطوير).",
    "Total financing interest as a share of development cost (land, construction, site work, soft costs and contingency — interest itself is not in that base). High values point to heavy leverage or a long build.":
      "إجمالي فوائد التمويل كنسبة من تكلفة التطوير (الأرض والإنشاء وأعمال الموقع والتكاليف غير المباشرة والاحتياطي — والفوائد نفسها ليست ضمن هذا الأساس). وارتفاعها يشير إلى رفع مالي كبير أو فترة إنشاء طويلة.",
    "Highest loan balance against the facility cap. At 100% the facility is fully used, with no headroom left.":
      "أعلى رصيد للقرض مقابل سقف التسهيلات. وعند 100% تكون التسهيلات مستنفدة بالكامل دون أي متسع.",
    "Share of project spending funded by investor cash, rather than by debt or by sales and rental income.":
      "نسبة الإنفاق على المشروع المموّلة من نقد المستثمرين، بدلًا من الدين أو من إيرادات البيع والإيجار.",
    "Lowest ratio of operating cash to debt service in any month. Lenders usually want at least 1.2×.":
      "أدنى نسبة بين النقد التشغيلي وخدمة الدين في أي شهر. ويطلب المموّلون عادةً 1.2× على الأقل.",
    "Equity · Levered": "الملكية · بعد التمويل", "Project · Unlevered": "المشروع · قبل التمويل",
    "IRR": "IRR", "Multiple": "المضاعف", "Payback": "فترة الاسترداد",
    "Cumulative cashflow — equity vs project": "التدفق التراكمي — الملكية مقابل المشروع",
    "Profit decomposition": "تفكيك الربح", "Revenue → Profit waterfall": "شلال الإيراد → الربح",
    "Profit decomposition (after financing)": "تفكيك الربح (بعد التمويل)",
    "Total revenue": "إجمالي الإيرادات", "Project costs": "تكاليف المشروع",
    "Finance interest": "فوائد التمويل", "Net profit": "صافي الربح",
    "Margin on revenue": "الهامش على الإيراد", "Margin on cost": "الهامش على التكلفة",
    "Scenario comparison": "مقارنة السيناريوهات", "Down · Base · Up": "متحفّظ · أساسي · متفائل",
    "Side-by-side": "جنبًا إلى جنب",

    /* Fund tab (main strings) */
    "Fund Waterfall · LP · Developer · GP": "شلال الصندوق · المستثمرون · المطوّر · المدير",
    "How the cash splits between cash investors, the developer and the fund manager": "كيف يتوزّع النقد بين المستثمرين والمطوّر ومدير الصندوق",
    "Total equity": "إجمالي الملكية", "Total distributed": "إجمالي التوزيعات",
    "GP promote earned": "حافز المدير المكتسب", "Total fees": "إجمالي الرسوم",
    "LP · Cash investors": "المستثمرون النقديون LP", "GP · Fund manager": "مدير الصندوق GP",
    "Fund-level Sources & Uses": "المصادر والاستخدامات على مستوى الصندوق",
    "Equity contributions": "مساهمات الملكية",
    "Distribution waterfall — buckets": "شلال التوزيعات — الشرائح",
    "Fees collected": "الرسوم المحصلة", "Annual cashflow by party": "التدفق السنوي حسب الطرف",

    /* Valuation app */
    "Property": "العقار",
    "Tell us what you're valuing. Everything else pre-fills with realistic market defaults you can refine later.": "أخبرنا ما الذي تقيّمه، وسنملأ بقية الحقول بقيم سوقية واقعية يمكنك تعديلها لاحقًا.",
    "A residential unit in a building": "وحدة سكنية داخل مبنى",
    "A detached private home": "مسكن خاص مستقل",
    "An attached home in a row": "مسكن متلاصق ضمن صف",
    "Office space or a commercial building": "مساحة مكتبية أو مبنى تجاري",
    "A shop, showroom or retail strip": "محل أو معرض أو واجهة تجارية",
    "Storage or light-industrial space": "مستودع أو مساحة صناعية خفيفة",
    "A vacant plot": "قطعة أرض فضاء",
    "Warehouse": "مستودع",
    "City": "المدينة", "District": "الحي",
    "e.g. Riyadh": "مثال: الرياض", "e.g. Al Malqa": "مثال: الملقا",
    "Built-up area": "مساحة البناء",
    "Total covered floor area of the building (GFA).": "إجمالي المسطحات المبنية المغطاة (GFA).",
    "Plot size (villas / commercial). Apartments: leave 0.": "مساحة قطعة الأرض (فلل / تجاري). للشقق: اتركها 0.",
    "Plot size being valued.": "مساحة الأرض محل التقييم.",
    "Building age": "عمر المبنى", "years": "سنة", "Condition": "الحالة",
    "Affects how much value the building has lost with age.": "تحدّد مقدار ما فقده المبنى من قيمته مع العمر.",
    "Excellent — like new / recently renovated": "ممتازة — جديد أو مجدَّد حديثًا",
    "Good — well maintained": "جيدة — بصيانة منتظمة",
    "Fair — visible wear, some repairs needed": "مقبولة — استهلاك ظاهر ويحتاج إصلاحات",
    "Poor — major repairs required": "ضعيفة — يحتاج إصلاحات جوهرية",
    "Comparable sales": "المبيعات المقارنة",
    "The market approach — what did similar properties actually sell for?": "أسلوب السوق — بكم بيعت العقارات المماثلة فعليًا؟",
    "Comparable": "عقار مقارن",
    "Area": "المساحة", "Sold": "تاريخ البيع", "months ago": "قبل (شهر)",
    "Location adj.": "تسوية الموقع", "Condition adj.": "تسوية الحالة", "Other adj.": "تسويات أخرى",
    "Comp in a better spot? use −5. Worse? +5.": "المقارن في موقع أفضل؟ استخدم −5. أسوأ؟ +5.",
    "Size, view, street width…": "المساحة، الإطلالة، عرض الشارع…",
    "+ Add comparable": "+ أضف عقارًا مقارنًا",
    "Market trend": "اتجاه السوق",
    "% / yr": "% / سنة",
    "How fast prices are rising in this area. Older sales get uplifted by this rate.": "سرعة ارتفاع الأسعار في المنطقة؛ تُرفع قيم المبيعات الأقدم بهذا المعدل.",
    "Rental income": "الدخل الإيجاري",
    "The income approach — what is the property worth as an investment?": "أسلوب الدخل — كم يساوي العقار كاستثمار؟",
    "Rent basis": "أساس الإيجار",
    "SAR per m² per year": "ريال / م² سنويًا", "Total SAR per year": "إجمالي ريال سنويًا",
    "Market rent": "الإيجار السوقي", "Annual rent": "الإيجار السنوي",
    "Vacancy": "الشواغر", "Share of time the property sits empty.": "نسبة المدة التي يبقى فيها العقار شاغرًا.",
    "Operating costs": "مصاريف التشغيل",
    "Maintenance, management, utilities — as % of collected rent.": "صيانة وإدارة ومرافق — كنسبة من الإيجار المحصّل.",
    "Cap rate": "معدل الرسملة",
    "The yield investors demand. Higher risk → higher rate → lower value.": "العائد الذي يطلبه المستثمرون؛ مخاطر أعلى → معدل أعلى → قيمة أقل.",
    "Rebuild cost": "تكلفة إعادة البناء",
    "The cost approach — land plus what it would cost to rebuild, minus wear.": "أسلوب التكلفة — الأرض + تكلفة إعادة البناء، ناقص الإهلاك.",
    "What similar empty plots sell for in this district.": "سعر بيع الأراضي الفضاء المماثلة في الحي.",
    "Set the land area in step 01 — land value = plot size × this price.": "أدخل مساحة الأرض في الخطوة 01 — قيمة الأرض = مساحة القطعة × هذا السعر.",
    "Land share": "حصة الأرض",
    "Apartments don't own a plot — a land share (~15% of building value) is included automatically.": "الشقق لا تملك قطعة أرض — تُضاف حصة أرض (~15% من قيمة المبنى) تلقائيًا.",
    "Land area missing": "مساحة الأرض غير مدخلة",
    "The cost approach needs the plot size. Enter the land area (m²) in step 01, or the land value stays 0.": "أسلوب التكلفة يحتاج مساحة القطعة — أدخل مساحة الأرض (م²) في الخطوة 01 وإلا بقيت قيمة الأرض صفرًا.",
    "Build cost": "تكلفة البناء",
    "Economic life": "العمر الاقتصادي",
    "How long this type of building stays useful (usually 45–60).": "المدة التي يبقى فيها المبنى صالحًا للاستخدام (عادة 45–60 سنة).",
    "Obsolescence": "التقادم",
    "Extra value loss from outdated design or a declining area. Usually 0.": "فقد إضافي بسبب تصميم قديم أو منطقة متراجعة. عادة 0.",
    "Final weighting": "الترجيح النهائي",
    "How much each approach counts toward the final value.": "وزن كل أسلوب في القيمة النهائية.",
    "Sales comp.": "المقارنات", "Income": "الدخل",
    "Save to my account": "احفظ في حسابي", "New": "جديد",
    "Start a fresh valuation?": "بدء تقييم جديد؟",
    "My saved valuations": "تقييماتي المحفوظة",
    "Could not save — please try again.": "تعذّر الحفظ — حاول مرة أخرى.",
    "You're exploring as a guest — nothing is saved.": "أنت تتصفح كضيف — لن يُحفظ شيء.",
    "Create a free account": "أنشئ حسابًا مجانيًا",
    "to save valuations.": "لحفظ تقييماتك.",
    "Print report": "طباعة التقرير",
    "Valuation summary": "ملخص التقييم",
    "Valuation summary ·": "ملخص التقييم ·",
    "Find 3–5 recent sales of similar properties (ask agents, or check Ministry of Justice / Aqar transaction records). Then adjust each one:": "اجمع ٣–٥ صفقات بيع حديثة لعقارات مماثلة (اسأل الوسطاء أو راجع مؤشرات وزارة العدل / عقار). ثم سوِّ كل واحدة:",
    "“compared to my property, was that one better or worse?”": "«مقارنةً بعقاري، هل ذلك العقار أفضل أم أسوأ؟»",
    "Better comp → negative %, worse comp → positive %.": "المقارن الأفضل → نسبة سالبة، والأسوأ → نسبة موجبة.",
    "Even if you won't rent it out, this shows what an investor would pay. Defaults are typical for": "حتى لو لم تكن ستؤجّره، يوضح هذا ما سيدفعه مستثمر. القيم الافتراضية معتادة لـ",
    "— adjust to your market knowledge.": "— عدّلها وفق معرفتك بالسوق.",
    "We pre-weight by property type following professional practice": "نرجّح مسبقًا حسب نوع العقار وفق الممارسة المهنية",
    "Adjust if you trust one approach more.": "عدّل إن كنت تثق بأسلوب أكثر من غيره.",
    "Indicated market value": "القيمة السوقية الاستدلالية",
    "Add your first comparable sale to see a value.": "أضف أول عقار مقارن لعرض القيمة.",
    "Final market value": "القيمة السوقية النهائية",
    "Waiting for inputs": "بانتظار المدخلات",
    "Approaches used": "الأساليب المستخدمة",
    "divergence": "تباين",
    "The three approaches": "الأساليب الثلاثة",
    "Professional valuations triangulate from independent angles — then weight them into one number.": "التقييم المهني يستند إلى زوايا مستقلة ثم يرجّحها في رقم واحد.",
    "Approach": "الأسلوب", "In plain words": "بعبارة مبسطة",
    "Indicated value": "القيمة الاستدلالية", "Weight": "الوزن", "Contribution": "المساهمة",
    "Sales comparison": "المقارنات السوقية",
    "What similar properties sold for, adjusted to match yours": "أسعار بيع العقارات المماثلة بعد تسويتها لتطابق عقارك",
    "Income capitalisation": "رسملة الدخل",
    "What an investor would pay for the rent it can earn": "ما يدفعه مستثمر مقابل الدخل الإيجاري الممكن",
    "Cost approach": "أسلوب التكلفة",
    "Land value + rebuild cost, minus age & wear": "قيمة الأرض + تكلفة إعادة البناء، ناقص العمر والإهلاك",
    "Comparable sales — adjusted": "المبيعات المقارنة — بعد التسوية",
    "Each comp's price per m², corrected for time, location and condition differences.": "سعر المتر لكل مقارن بعد تصحيح فروق الزمن والموقع والحالة.",
    "No comparables entered yet — add them in the sidebar (step 02).": "لم تُدخل مقارنات بعد — أضفها من القائمة الجانبية (الخطوة 02).",
    "Time adj.": "تسوية الزمن", "Total adj.": "إجمالي التسوية", "Adjusted SAR/m²": "ر.س/م² بعد التسوية",
    "Income build-up": "بناء الدخل",
    "Potential gross rent": "الإيجار الإجمالي الممكن",
    "Net operating income": "صافي الدخل التشغيلي",
    "Cost build-up ": "بناء التكلفة",
    "Land value": "قيمة الأرض", "Replacement cost (new)": "تكلفة الإحلال (جديد)",
    "Depreciated building value": "قيمة المبنى بعد الإهلاك", "Land + building": "الأرض + المبنى",
    "What moves the value": "ما الذي يحرّك القيمة",
    "Final value if each key input turns out 10% better or worse.": "القيمة النهائية إذا تغيّر كل مدخل رئيسي ‏10% صعودًا أو نزولًا.",
    "Driver": "المحرّك", "Downside": "الأسوأ", "Base": "الأساس", "Upside": "الأفضل",
    "Quality checks": "فحوصات الجودة",
    "Automatic review of your inputs against professional practice.": "مراجعة آلية لمدخلاتك وفق الممارسات المهنية.",
    "Value per m² (built)": "القيمة لكل م² (بناء)", "Value per m² (land)": "القيمة لكل م² (أرض)",
    "m² basis": "م² أساس القياس",
    "Likely range": "النطاق المرجّح",
    "This tool follows the three internationally recognised valuation approaches (IVS), but is an indicative\n          estimate — not a substitute for an accredited valuer (Taqeem) report where one is legally required.":
      "تتبع هذه الأداة أساليب التقييم الثلاثة المعتمدة دوليًا (IVS)، لكنها تقدير استرشادي — ولا تغني عن تقرير مقيّم معتمد (تقييم) حيث يُشترط نظامًا.",

    /* Quality check titles (static ones) */
    "No usable comparables": "لا توجد مقارنات صالحة",
    "Add at least 3 recent sales of similar properties — the market approach is the backbone of most valuations.": "أضف ٣ صفقات بيع حديثة على الأقل لعقارات مماثلة — أسلوب السوق هو أساس معظم التقييمات.",
    "Comparables disagree widely": "تباين كبير بين المقارنات",
    "Unusual capitalisation rate": "معدل رسملة غير معتاد",
    "Negative operating income": "دخل تشغيلي سالب",
    "Operating costs exceed rental income — the income approach is not meaningful with these inputs.": "مصاريف التشغيل تتجاوز الدخل الإيجاري — أسلوب الدخل غير ذي دلالة بهذه المدخلات.",
    "Building nearly fully depreciated": "المبنى مستهلك بالكامل تقريبًا",
    "At this effective age the structure contributes little value — the valuation is essentially the land.": "عند هذا العمر الفعلي لا يضيف المبنى قيمة تُذكر — التقييم عمليًا هو قيمة الأرض.",
    "Approaches disagree by more than 30%": "الأساليب تتباين بأكثر من 30%",
    "A large gap between approaches usually means one set of inputs is off. Compare the per-m² results and revisit the weakest one.": "الفجوة الكبيرة بين الأساليب تعني عادة خللًا في أحد المدخلات. قارن نتائج المتر المربع وراجع الأضعف.",
    "Built-up area missing": "مساحة البناء غير مدخلة",
    "Enter the built-up area (m²) — every approach needs it.": "أدخل مساحة البناء (م²) — جميع الأساليب تحتاجها.",
    "Inputs look consistent": "المدخلات متسقة",
    "Comparables, income and cost inputs are within normal professional ranges.": "المقارنات ومدخلات الدخل والتكلفة ضمن النطاقات المهنية المعتادة.",

    /* User menu */
    "Signed in as": "مسجّل الدخول باسم",
    "Full name": "الاسم الكامل", "Save": "حفظ",
    "Save current model": "احفظ النموذج الحالي", "Save current valuation": "احفظ التقييم الحالي",
    "My saved models": "نماذجي المحفوظة",
    "Saving…": "جارٍ الحفظ…", "Saved ✓": "تم الحفظ ✓",
    "Could not save — try again.": "تعذّر الحفظ — حاول مجددًا.",
    "Log out": "تسجيل الخروج",
    "You're browsing as a guest": "أنت تتصفح كضيف",
    "Create a free account to save your work and access it from any device.": "أنشئ حسابًا مجانيًا لحفظ أعمالك والوصول إليها من أي جهاز.",
    "Sign in / create account": "تسجيل الدخول / إنشاء حساب",
    "Delete this saved item?": "حذف هذا العنصر المحفوظ؟",
    "Account menu": "قائمة الحساب", "Account": "الحساب",
    "Delete": "حذف",

    /* misc units / small labels */
    "m²": "م²", "SAR": "ر.س", "SAR/m²": "ر.س/م²", "SAR/yr": "ر.س/سنة", "mo": "شهر", "yrs": "سنة",
    "Mode": "النمط", "Timing": "التوقيت", "Exit cap": "رسملة التخارج", "Exit value": "قيمة التخارج",
    "Price / Rent": "السعر / الإيجار", "Gross / NOI": "الإجمالي / الصافي", "Units / Keys": "وحدات / مفاتيح",
  };

  /* Pattern rules for dynamically composed strings (numbers baked in). */
  const RULES = [
    [/^(\d+(?:\.\d+)?)% of land unallocated$/, "$1% من الأرض غير موزعة"],
    [/^(\d+(?:\.\d+)?)% allocated across components\.$/, "$1% موزعة على المكوّنات."],
    [/^Components allocate (.+)% of the land area — over by (.+) pts\. Reduce one or more component allocations\.$/, "المكوّنات توزّع $1% من مساحة الأرض — بزيادة $2 نقطة. قلّل توزيع مكوّن أو أكثر."],
    [/^Net profit SAR (.+)M\.$/, "صافي الربح $1 مليون ريال."],
    [/^Equity IRR (.+)% vs hurdle (.+)%\.$/, "IRR الملكية $1% مقابل المستهدف $2%."],
    [/^(.+)% vs target (.+)%\.$/, "$1% مقابل المستهدف $2%."],
    [/^(\d+) months may not reflect typical procurement\.$/, "$1 شهرًا قد لا تعكس مدد التوريد المعتادة."],
    [/^Hurdle (.+)$/, "المستهدف $1"],
    [/^@(.+) disc\.$/, "بخصم $1"],
    [/^ROI (.+)$/, "العائد $1"],
    [/^Project (—|\d.+)$/, "المشروع $1"],
    [/^OpEx (.+)$/, "مصاريف التشغيل $1"],
    [/^(\d[\d,]*) units$/, "$1 وحدة"],
    [/^(\d[\d,]*) keys$/, "$1 مفتاح"],
    [/^(.+) SAR\/unit$/, "$1 ر.س/وحدة"],
    [/^(.+) SAR\/m²$/, "$1 ر.س/م²"],
    [/^(.+) SAR\/m²·yr$/, "$1 ر.س/م² سنويًا"],
    [/^(.+) SAR\/unit·yr$/, "$1 ر.س/وحدة سنويًا"],
    [/^(.+) SAR ADR$/, "$1 ر.س متوسط الليلة"],
    [/^(\d+) mo sales$/, "$1 شهر بيع"],
    [/^(\d+) mo hold$/, "$1 شهر تشغيل"],
    [/^(SAR .+)\/mo$/, "$1/شهر"],
    [/^(SAR .+)\/yr$/, "$1/سنة"],
    [/^Facility (.+) \((.+) LTC\) · peak balance (.+) of cap$/, "تسهيلات $1 (‏LTC ‏$2) · ذروة الرصيد $3 من السقف"],
    [/^Total capital called · peak (.+)$/, "إجمالي المستدعى · الذروة $1"],
    [/^Horizon auto-sized to (\d+) months \((.+) yrs\) — predesign \+ construction \+ sell-down \/ hold \+ tail\.$/, "الأفق محسوب تلقائيًا: $1 شهرًا ($2 سنة) — التصميم + الإنشاء + البيع/التشغيل + هامش."],
    [/^Base IRR (.+)$/, "‏IRR الأساس $1"],
    [/^(.+) build cost$/, "تكلفة بناء $1"],
    [/^(.+) price\/unit$/, "سعر وحدة $1"],
    [/^(.+) price\/m²$/, "سعر متر $1"],
    [/^(.+) price\/key$/, "سعر مفتاح $1"],
    [/^(.+) rent\/m²$/, "إيجار متر $1"],
    [/^(.+) rent\/unit$/, "إيجار وحدة $1"],
    [/^(.+) ADR$/, "‏ADR ‏$1"],
    [/^(.+) exit cap$/, "رسملة تخارج $1"],
    [/^vs (.+) pref$/, "مقابل $1 عائد ممتاز"],
    [/^LP (.+) · Dev (.+) · GP (.+)$/, "‏LP ‏$1 · المطوّر $2 · ‏GP ‏$3"],
    [/^(.+) performance fee · (.+) catch-up$/, "رسوم أداء $1 · تعويض $2"],
    [/^(.+) performance fee$/, "رسوم أداء $1"],
    [/^Dev fee (.+) \+ co-invest returns$/, "رسوم تطوير $1 + عوائد المشاركة"],
    [/^Acq \+ mgmt (.+) · promote (.+)$/, "استحواذ وإدارة $1 · حافز $2"],
    [/^Project horizon pinned to (.+) yrs — fund closes at exit; no fees accrue past Y(.+)$/, "أفق المشروع مثبّت عند $1 سنة — يُغلق الصندوق عند التخارج ولا تُستحق رسوم بعد السنة $2"],
    [/^Operating starts: M(\d+)$/, "بدء التشغيل: الشهر $1"],
    [/^Peak (.+)$/, "الذروة $1"],
    [/^(.+) effective LTC · senior facility$/, "‏LTC فعلي $1 · تسهيلات رئيسية"],
    [/^(.+) of project cost · one-time$/, "$1 من تكلفة المشروع · مرة واحدة"],
    [/^(.+)\/yr on unreturned equity$/, "$1/سنة على الملكية غير المستردة"],
    [/^(.+) of construction cost · S-curve$/, "$1 من تكلفة الإنشاء · منحنى S"],
    [/^2 · Preferred return \((.+) compounded\)$/, "2 · العائد الممتاز ($1 مركّب)"],
    [/^3 · GP catch-up \((.+)\)$/, "3 · تعويض المدير ($1)"],
    [/^(\d+b?) · Performance fee → GP \((.+)\)$/, "$1 · رسوم الأداء → المدير ($2)"],
    [/^(\d+b?) · Pro-rata to investors \((.+)\)$/, "$1 · الحصة النسبية للمستثمرين ($2)"],
    [/^(.+) of remaining distributions — the GP's promote \/ carry$/, "$1 من التوزيعات المتبقية — حافز المدير"],
    [/^([\d,.]+) m² to allocate$/, "$1 م² للتوزيع"],
    [/^F(\d+)$/, "د$1"],
    [/^([\d.]+) yrs?$/, "$1 سنة"],
    [/^([\d.,]+%) LTC$/, "‏LTC ‏$1"],
    [/^vs ([\d.,]+%)$/, "مقابل $1"],
    [/^([\d.,]+%)\/yr$/, "$1 سنويًا"],
    [/^([\d.,]+%)\/yr on paid-in capital$/, "$1 سنويًا على رأس المال المدفوع"],
    [/^([\d.,]+%) of each equity call$/, "$1 من كل استدعاء رأس مال"],
    [/^([\d.,]+%) of equity collected at close$/, "$1 من رأس المال المُحصَّل عند التأسيس"],
    [/^Splits sum to ([\d.]+)% — adjust to 100%\.$/, "مجموع الحصص $1% — عدّلها إلى 100%."],
    [/^instant$/, "فوري"],
    [/^Reduce one or more allocations — total exceeds available land by ([\d.]+) pts\.$/,
      "قلّل توزيع مكوّن أو أكثر — الإجمالي يتجاوز الأرض المتاحة بمقدار $1 نقطة."],
    [/^Sources exceed uses by (.+)$/, "المصادر تتجاوز الاستخدامات بمقدار $1"],
    [/^Uses exceed sources by (.+)$/, "الاستخدامات تتجاوز المصادر بمقدار $1"],
    /* Auto-numbered duplicates of a known term — e.g. component names like
       "Villa 2" → «فيلا 2». Keep LAST: it matches any "<term> <n>" and
       returns the string unchanged when the base isn't a known term. */
    [/^(.+?) (\d+)$/, (m, base, n) => (D[base] !== undefined ? `${D[base]} ${n}` : m)],
  ];

  /* Case-insensitive index — CSS text-transform means some sources differ
     from the dictionary only by case. */
  const Dlow = {};
  for (const k in D) Dlow[k.toLowerCase()] = D[k];

  const t = (s) => {
    if (typeof s !== "string") return s;
    if (lang === "en") return s;
    if (D[s] !== undefined) return D[s];
    const trimmed = s.trim();
    if (D[trimmed] !== undefined) {
      // preserve leading/trailing whitespace around the translated core
      return s.replace(trimmed, D[trimmed]);
    }
    if (Dlow[trimmed.toLowerCase()] !== undefined) return Dlow[trimmed.toLowerCase()];
    for (const [re, tpl] of RULES) {
      if (re.test(trimmed)) return trimmed.replace(re, tpl);
    }
    return s;
  };

  /* Translate whitelisted string props + string children on every element. */
  const PROP_KEYS = ["label", "hint", "title", "sub", "suffix", "placeholder", "eyebrow", "blurb", "note", "alarm", "plain", "platform", "aria-label"];
  function patchReact() {
    if (lang === "en" || !window.React || window.React.__reapI18n) return;
    const orig = window.React.createElement;
    window.React.createElement = function (type, props, ...children) {
      if (props) {
        let cloned = null;
        for (const k of PROP_KEYS) {
          if (typeof props[k] === "string") {
            const tr = t(props[k]);
            if (tr !== props[k]) { cloned = cloned || Object.assign({}, props); cloned[k] = tr; }
          }
        }
        if (typeof props.children === "string") {
          const tr = t(props.children);
          if (tr !== props.children) { cloned = cloned || Object.assign({}, props); cloned.children = tr; }
        }
        if (cloned) props = cloned;
      }
      const newChildren = children.map((c) => (typeof c === "string" ? t(c) : c));
      return orig.apply(this, [type, props, ...newChildren]);
    };
    window.React.__reapI18n = true;
  }

  /* Landing-page helper: swap elements carrying data-ar attributes. */
  function applyDom() {
    if (lang === "en") return;
    document.querySelectorAll("[data-ar]").forEach((el) => { el.innerHTML = el.getAttribute("data-ar"); });
    document.querySelectorAll("[data-ar-placeholder]").forEach((el) => { el.placeholder = el.getAttribute("data-ar-placeholder"); });
    document.querySelectorAll("[data-ar-title]").forEach((el) => { el.title = el.getAttribute("data-ar-title"); });
  }

  function setLang(l) {
    try { localStorage.setItem(KEY, l === "en" ? "en" : "ar"); } catch (e) {}
    window.location.reload();
  }

  window.I18N = { lang, t, setLang, patchReact, applyDom, dict: D };
})();
