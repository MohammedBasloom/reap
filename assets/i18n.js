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
  // Arabic is the default for a first-time visitor; anyone who has switched
  // before keeps their stored choice.
  const DEFAULT_LANG = "ar";
  let lang;
  try { lang = localStorage.getItem(KEY) || DEFAULT_LANG; } catch (e) { lang = DEFAULT_LANG; }
  if (lang !== "en" && lang !== "ar") lang = DEFAULT_LANG;

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
    "Pre-construction, construction and sales start — then soft costs, contingency, marketing and fees.":
      "ما قبل الإنشاء والإنشاء وبدء البيع — ثم التكاليف غير المباشرة والاحتياطي والتسويق والرسوم.",
    "Set financing & targets": "حدّد التمويل والمستهدفات",
    "Loan-to-cost and interest rate, the hurdle rate for NPV, and optionally an LP / GP fund structure.":
      "نسبة التمويل إلى التكلفة ومعدل الفائدة، ومعدل العائد المستهدف لصافي القيمة الحالية، واختياريًا هيكل صندوق بين الشريك المحدود والشريك العام.",
    /* Guided build */
    "Loan-to-cost and interest rate, and the hurdle rate the equity IRR is judged against.":
      "نسبة التمويل إلى التكلفة ومعدل الفائدة، ومعدل العائد المستهدف الذي يُقاس عليه عائد الملكية.",
    "Fund structure": "هيكل الصندوق",
    "Optional. Split the equity between LP, developer and GP, set the preferred return and the promote.":
      "اختياري. وزّع الملكية بين الشريك المحدود والمطوّر والشريك العام، وحدّد العائد المفضّل وحوافز الأداء.",
    "Use default inputs": "استخدم المدخلات الافتراضية",
    "Show the result": "اعرض النتيجة",
    "Go to the platform": "انتقل للمنصة",
    /* Guided valuation */
    "How to build your valuation": "كيف تبني تقييمك",
    "Building your valuation": "جارٍ بناء تقييمك",
    "Keep going — the value opens when the walk is done.": "واصل — تُفتح القيمة عند إتمام الخطوات.",
    "Start with the property, then the evidence.": "ابدأ بالعقار، ثم بالأدلة.",
    "Each step below moves the final figure. Set it in the panel, or take the market-typical default and move on — either way you will have seen it. Nothing is valued until the last step is answered.":
      "كل خطوة أدناه تحرّك الرقم النهائي. اضبطها من اللوحة، أو خذ الافتراضي السائد في السوق وامضِ — في الحالتين تكون قد اطّلعت عليها. لا يُحتسب تقييم حتى تُجاب آخر خطوة.",
    "Every step is answered — open the valuation.": "تمت الإجابة على كل الخطوات — افتح التقييم.",
    "Describe the property": "صف العقار",
    "Type, city and district, the areas being valued, and — for a building — its age and condition.":
      "النوع والمدينة والحي، والمساحات محل التقييم — وللمبنى: عمره وحالته.",
    "Enter comparable sales": "أدخل الصفقات المقارنة",
    "Three to five recent sales of similar properties, with the adjustment each one needs.":
      "من ثلاث إلى خمس صفقات حديثة لعقارات مشابهة، مع التعديل الذي تحتاجه كل صفقة.",
    "Set the rental income": "حدّد الدخل الإيجاري",
    "Rent, vacancy, operating costs and the cap rate an investor would apply.":
      "الإيجار ونسبة الشغور ومصروفات التشغيل ومعدل الرسملة الذي يطبّقه المستثمر.",
    "Set the rebuild cost": "حدّد تكلفة إعادة البناء",
    "Land rate and build cost per m², the economic life, and any obsolescence.":
      "سعر الأرض وتكلفة البناء للمتر، والعمر الاقتصادي، وأي تقادم.",
    "Weight the approaches": "رجّح الأساليب",
    "Land carries no building to rent out or rebuild, so comparable sales is the only approach available — it takes the full weight.":
      "الأرض لا تحمل مبنى يُؤجَّر أو يُعاد بناؤه، فتبقى المقارنات السوقية الأسلوب الوحيد المتاح — ويأخذ الوزن كاملًا.",
    "Comparable sales": "المقارنات السوقية",
    "How much comparable sales, income and cost each count toward the final figure.":
      "كم يزن كل من المقارنات السوقية والدخل والتكلفة في الرقم النهائي.",
    "Open financial modeling": "افتح النمذجة المالية",
    "Open property valuation": "افتح التقييم العقاري",
    "Every step is answered — open the dashboards.": "تمت الإجابة على كل الخطوات — افتح اللوحات.",
    "still to answer": "خطوة متبقّية",
    "Skip — no fund structure": "تخطَّ — بلا هيكل صندوق",
    "Optional": "اختياري",
    "Building your model": "جارٍ بناء نموذجك",
    "Keep going — the results open when the walk is done.": "واصل — تُفتح النتائج عند إتمام الخطوات.",
    "Every step below is a driver of the answer. Set it yourself in the panel, or take the default and move on — either way you will have seen it once. Nothing is calculated until the last required step is passed.":
      "كل خطوة أدناه محرّك من محرّكات النتيجة. اضبطها بنفسك من اللوحة، أو خذ الافتراضي وامضِ — في الحالتين تكون قد اطّلعت عليها. لا يُحتسب شيء حتى تُنجز آخر خطوة مطلوبة.",
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
    /* "Apartment" stays «شقة» — the valuation page uses it for a single unit
       being valued. The feasibility component is a whole building sold as
       units, so it carries its own key. */
    "Villa": "فيلا", "Townhouse": "تاون هاوس", "Apartment": "شقة", "Build-to-Rent": "سكني للتأجير",
    "Residential Building": "عمارة سكنية - بيع وحدات",

    /* Mixed-Use Building — one envelope, several uses, each sold or let on its
       own terms. */
    /* Land tenure — bought outright, or held on a ground lease. */
    "Land tenure": "حيازة الأرض",
    "Acquisition": "تملّك",
    "Bought outright": "شراء الأرض",
    "Lease": "إيجار",
    "Ground rent, no title": "إيجار أرض دون تملّك",
    "No RETT on a lease": "لا رسوم تصرّف على الإيجار",
    "Ground rent": "إيجار الأرض",
    "Leasehold — what the project keeps": "الأرض المستأجرة — ما يتبقّى للمشروع",
    "Stabilised NOI, all leased space": "صافي الدخل المستقر لكل المساحات المؤجَّرة",
    "Ground rent in the exit year": "إيجار الأرض في سنة التخارج",
    "NOI after ground rent": "صافي الدخل بعد إيجار الأرض",
    "Exit value is capitalised from this figure, not the NOI above — a buyer inherits the ground lease and prices the income net of it.":
      "تُحتسب قيمة التخارج برسملة هذا الرقم لا صافي الدخل أعلاه — فالمشتري يرث عقد إيجار الأرض ويُسعّر الدخل بعد خصمه.",
    "Ground rent (whole period)": "إيجار الأرض (كامل الفترة)",
    /* Leased land: nothing can be sold, since the project holds no title. */
    "Units cannot be sold on leased land": "لا يمكن بيع وحدات على أرض مستأجرة",
    "Units cannot be sold on leased land.": "لا يمكن بيع وحدات على أرض مستأجرة.",
    "These are still set to sell and are being counted as sales revenue:":
      "ما يلي ما زال مضبوطًا على البيع ويُحتسب ضمن إيرادات المبيعات:",
    "Switch them to leasable, remove them, or buy the land instead.":
      "حوّلها إلى التأجير، أو احذفها، أو اشترِ الأرض بدلًا من استئجارها.",
    "−OpEx": "−التشغيل",
    "−Ground rent": "−إيجار الأرض",
    "capitalised after ground rent": "مرسملة بعد إيجار الأرض",
    "Land rent": "قيمة إيجار الأرض",
    "Annual ground rent": "الإيجار السنوي للأرض",
    "Annual rent per m² of plot. Paid in advance at the start of each year, and it runs until the project exits — not to the end of the horizon.":
      "الإيجار السنوي لكل متر مربع من الأرض. يُدفع مقدَّمًا في بداية كل سنة، ويستمر حتى تخارج المشروع لا حتى نهاية أفق الدراسة.",
    "Rent review": "مراجعة الإيجار",
    "Escalates every": "يتصاعد كل",
    "How often the rent steps up. With a five-year review the first five years sit at the opening rate and the first uplift lands in year six.":
      "كل كم سنة يرتفع الإيجار. بمراجعة كل خمس سنوات تبقى السنوات الخمس الأولى على السعر الابتدائي ويأتي أول ارتفاع في السنة السادسة.",
    "Escalation": "نسبة التصاعد",
    "At each review": "عند كل مراجعة",
    "First year rent": "إيجار السنة الأولى",
    "Ground rent is an operating cost, so it does not count toward the debt facility — a lender advances against build cost, not rent. Expect a smaller facility than buying the land.":
      "إيجار الأرض مصروف تشغيلي، لذا لا يدخل ضمن أساس حساب التسهيل الائتماني — فالممول يقرض مقابل تكلفة البناء لا مقابل الإيجار. توقّع تسهيلًا أقل ممّا لو اشتريت الأرض.",

    "Mixed use": "متعدد الاستخدامات",
    "Mixed-Use Building": "مبنى متعدد الاستخدامات",
    "Several uses in one building": "عدة استخدامات في مبنى واحد",
    "Sale + Lease": "بيع وتأجير",
    "Spaces in this building": "المساحات داخل المبنى",
    "Each use below is sold or let on its own terms.": "كل مساحة أدناه تُباع أو تُؤجَّر وفق شروطها الخاصة.",
    "Build cost is set per use below.": "تكلفة البناء تُحدَّد لكل مساحة أدناه.",
    "+ Spaces for sale": "+ مساحات للبيع",
    "+ Spaces for lease": "+ مساحات للتأجير",
    "Spaces for sale": "مساحات للبيع",
    "Spaces for lease": "مساحات للتأجير",
    "No spaces yet. Add the spaces this building holds — you can add several of either kind, so leased retail and leased offices sit side by side.":
      "لا توجد مساحات بعد. أضِف المساحات التي يضمّها المبنى — ويمكنك إضافة أكثر من مساحة من النوع نفسه، فتظهر تجزئة للتأجير ومكاتب للتأجير جنبًا إلى جنب.",
    "Remove this use": "حذف هذه المساحة",
    "Remove component": "حذف المكوّن",
    "Remove this component from the program?": "هل تريد حذف هذا المكوّن من البرنامج؟",
    "Share of GFA": "الحصة من إجمالي المسطحات",
    "of the building's GFA": "من إجمالي مسطحات المبنى",
    "How much of this building's total floor area this use takes. All the uses together should come to 100%.":
      "نسبة ما تشغله هذه المساحة من إجمالي مسطحات المبنى. مجموع المساحات ينبغي أن يبلغ 100%.",
    "The share of this use's floor area that can actually be sold or let. Offices and retail differ.":
      "نسبة المساحة القابلة للبيع أو التأجير فعليًا من مسطحات هذه المساحة. تختلف بين المكاتب والتجزئة.",
    "This use's build rate": "تكلفة بناء هذه المساحة",
    "Construction cost per m² for this use. A retail shell and an office fit-out cost very different amounts.":
      "تكلفة البناء للمتر المربع لهذه المساحة. تكلفة هيكل التجزئة تختلف كثيرًا عن تجهيز المكاتب.",
    "of GFA": "من إجمالي المسطحات",
    "The uses add up to more than the building's GFA. Reduce one or more shares.":
      "مجموع المساحات يتجاوز إجمالي مسطحات المبنى. قلّل حصة مساحة أو أكثر.",
    "Some of the building's GFA is unassigned — it is built and costed but earns nothing.":
      "جزء من مسطحات المبنى غير موزَّع — يُبنى وتُحتسب تكلفته دون أن يُحقّق إيرادًا.",
    "Saleable / leasable": "قابل للبيع / التأجير",
    "Sales revenue + annual NOI": "إيراد المبيعات + صافي الدخل السنوي",
    "Sales revenue ": "إيراد المبيعات ",
    "Annual NOI ": "صافي الدخل السنوي ",
    "Held before exit": "مدة التملّك قبل الخروج",
    "Sell-down window": "فترة تصريف المبيعات",
    "Retail": "تجزئة",
    "Offices": "مكاتب",
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
    "Equity IRR sensitivity": "حساسية عائد الملكية IRR",
    "Profit sensitivity": "حساسية الربح",
    "How far the investors' return moves when each driver is flexed ±10%.":
      "مدى تغيّر عائد المستثمرين عند تحريك كل عامل بنسبة ±10%.",
    "How far net profit moves when each driver is flexed ±10%.":
      "مدى تغيّر صافي الربح عند تحريك كل عامل بنسبة ±10%.",
    "How to read these charts": "كيف تقرأ هذه الرسوم",
    "Each driver is moved 10% above and 10% below the value you entered — one driver at a time, with every other assumption held fixed. The widest rows are the inputs your return depends on most.":
      "يُحرَّك كل عامل بنسبة 10% أعلى و10% أدنى من القيمة التي أدخلتها — عامل واحد في كل مرة مع تثبيت بقية الافتراضات. والصفوف الأعرض هي المدخلات التي يعتمد عليها عائدك أكثر من غيرها.",
    "Weaker of the two results": "النتيجة الأضعف من الحالتين",
    "Stronger of the two results": "النتيجة الأقوى من الحالتين",
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
    "Privacy Policy": "سياسة الخصوصية",
    "Terms of Use": "شروط الاستخدام",
    "Disclaimer": "إخلاء المسؤولية",
    "Beta v2.0": "نسخة تجريبية v2.0",
    "© 2026 REAP. All rights reserved.": "© 2026 REAP. جميع الحقوق محفوظة.",
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

    /* Derived-value marker + glossary tooltips on the assumption fields */
    "Calculated automatically": "قيمة محسوبة تلقائيًا",
    "Efficiency — the share of built floor area that can actually be sold or let. The rest is corridors, stairs, lifts, plant rooms and wall thickness. Typically 65–85%, lower for hotels.":
      "الكفاءة — نسبة المساحة المبنية التي يمكن بيعها أو تأجيرها فعليًا. والباقي ممرات وسلالم ومصاعد وغرف خدمات وسماكة جدران. تتراوح عادة بين 65% و85%، وتقل في الفنادق.",
    "Floor Area Ratio — how much floor area the regulations let you build per m² of plot. FAR 2.0 on 1,000 m² of land allows 2,000 m² of GFA (Gross Floor Area, the total above-ground floor area).":
      "معامل البناء (FAR) — مقدار المساحة الطابقية التي تسمح الأنظمة ببنائها لكل م² من الأرض. فمعامل 2.0 على أرض 1,000 م² يتيح 2,000 م² من الـ GFA (إجمالي المساحة الطابقية فوق الأرض).",
    "Construction cost per m² of above-ground floor area (GFA). Excludes the basement, which carries its own rate, and excludes site works, design fees and contingency.":
      "تكلفة الإنشاء لكل م² من المساحة الطابقية فوق الأرض (GFA). لا تشمل القبو — فله معدل منفصل — ولا أعمال الموقع أو أتعاب التصميم أو الاحتياطي.",
    "Site works — everything outside the building footprint: boundary walls, landscaping, parking, external utilities and setbacks. Expressed as a percentage of construction cost.":
      "أعمال الموقع — كل ما يقع خارج بصمة المبنى: أسوار وتنسيق مواقع ومواقف ومرافق خارجية وارتدادات. وتُحتسب كنسبة من تكلفة الإنشاء.",
    "Average Daily Rate — the average room rate per night across the year. ADR × occupancy × keys × 365 gives annual room revenue.":
      "متوسط سعر الغرفة اليومي (ADR) — متوسط سعر الليلة على مدار السنة. ويُحتسب إيراد الغرف السنوي = ADR × الإشغال × عدد المفاتيح × 365.",
    "The occupancy the asset settles at once lease-up finishes — the long-run average, not the day-one figure.":
      "نسبة الإشغال التي يستقر عليها الأصل بعد اكتمال فترة التأجير — أي المتوسط على المدى الطويل، لا إشغال اليوم الأول.",
    "Operating expenses — the annual cost of running the asset: management, maintenance, utilities, insurance and service charges. Deducted from gross income to give NOI.":
      "المصاريف التشغيلية — التكلفة السنوية لتشغيل الأصل: الإدارة والصيانة والمرافق والتأمين ورسوم الخدمات. وتُخصم من الدخل الإجمالي للوصول إلى صافي الدخل التشغيلي (NOI).",
    "Capitalisation rate at sale — the yield a buyer accepts. Exit value = stabilised NOI ÷ cap rate, so a lower cap rate means a higher sale price. Enter 0 if the asset is not sold at the end — the model then shows no exit proceeds and the return comes from rental income alone.":
      "معدل الرسملة عند البيع — العائد الذي يقبله المشتري. قيمة التخارج = صافي الدخل التشغيلي المستقر ÷ معدل الرسملة، أي أن انخفاض المعدل يعني سعر بيع أعلى. وأدخل 0 إذا لم يكن هناك بيع في نهاية المدة — عندها لا يُظهر النموذج أي حصيلة تخارج ويأتي العائد من الدخل الإيجاري وحده.",
    "The yield a buyer would accept for this space at exit. Stabilised NOI divided by the cap rate gives the exit value. Enter 0 if the space is not sold at the end — the model then shows no exit proceeds and the return comes from rental income alone.":
      "العائد الذي يقبله المشتري لهذه المساحة عند التخارج. وقسمة صافي الدخل التشغيلي المستقر على معدل الرسملة تعطي قيمة التخارج. وأدخل 0 إذا لم تُبَع المساحة في نهاية المدة — عندها لا يُظهر النموذج أي حصيلة تخارج ويأتي العائد من الدخل الإيجاري وحده.",
    "A one-off fee charged on the capital investors commit, paid to the fund manager (GP) when the fund is established.":
      "رسوم تُحتسب مرة واحدة على رأس المال الذي يلتزم به المستثمرون، وتُدفع لمدير الصندوق (GP) عند تأسيس الصندوق.",
    "Annual management fee paid to the fund manager (GP) for running the fund, charged on paid-in capital.":
      "رسوم إدارة سنوية تُدفع لمدير الصندوق (GP) مقابل إدارته، وتُحتسب على رأس المال المدفوع.",
    "Fee paid to the developer for delivering the project, charged as a percentage of construction plus site-works cost.":
      "رسوم تُدفع للمطوّر مقابل تنفيذ المشروع، وتُحتسب كنسبة من تكلفة الإنشاء وأعمال الموقع.",
    "The hurdle — the minimum annual return investors must receive on their capital before the manager earns any performance fee. Compounds until paid.":
      "العائد التفضيلي — الحد الأدنى من العائد السنوي الذي يجب أن يحصل عليه المستثمرون على رأس مالهم قبل أن يستحق المدير أي رسوم أداء. ويتراكم حتى يُدفع.",
    "Also called the promote or carried interest — the manager's share of profit above the preferred return. Paid once at exit, and only if the hurdle is met.":
      "تُعرف أيضًا بحصة التحفيز — نصيب المدير من الأرباح التي تتجاوز العائد التفضيلي. وتُدفع مرة واحدة عند التخارج، وبشرط تحقق العائد التفضيلي.",
    "On raw land, the share of the plot left to build on once roads, utilities and public open space are taken out.":
      "في الأرض الخام، نسبة ما يتبقى من قطعة الأرض للبناء بعد استقطاع الطرق والمرافق والمساحات المفتوحة العامة.",
    "Everything that is not physical construction: design and engineering fees, project management, permits, surveys and legal. Usually 10–15% of construction.":
      "كل ما ليس إنشاءً ماديًا: أتعاب التصميم والهندسة وإدارة المشروع والتراخيص والمساحة والأعمال القانونية. وتبلغ عادة 10–15% من تكلفة الإنشاء.",
    "A reserve for the unknowns — variations, overruns and surprises on site. 5% is a normal minimum on a well-defined scheme.":
      "احتياطي لمواجهة غير المتوقع — التغييرات وتجاوزات التكلفة ومفاجآت الموقع. و5% هو الحد الأدنى المعتاد لمشروع واضح النطاق.",
    "Loan to Cost — how much of total project cost the lender funds. 60% LTC means debt covers 60% and equity must fund the remaining 40%.":
      "نسبة التمويل إلى التكلفة (LTC) — حصة الممول من إجمالي تكلفة المشروع. فنسبة 60% تعني أن الدين يغطي 60% وعلى الملكية تمويل الـ40% المتبقية.",
    "Basement coverage is measured as % of the land area. If the basement spans more than one floor, enter more than 100% — e.g. two full basement floors ≈ 200%.": "تُحسب تغطية القبو كنسبة من مساحة الأرض. إذا كان القبو أكثر من طابق واحد، أدخل نسبة أعلى من 100% — مثلًا: طابقان كاملان ≈ 200%.",
    "Built-up area — the total constructed area: above-ground GFA plus the basement where one is included. The saleable/leasable area is the share of GFA that can actually be sold or let, after circulation, cores and walls.":
      "المساحة المبنية — إجمالي المساحة المُنشأة: مساحة الأدوار فوق الأرض (GFA) مضافًا إليها القبو إن وُجد. أما المساحة القابلة للبيع أو التأجير فهي الجزء من الـ GFA الذي يمكن بيعه أو تأجيره فعليًا بعد خصم الممرات والخدمات والجدران.",
    "Sale price": "سعر البيع", "Avg unit size": "متوسط مساحة الوحدة", "Unit price": "سعر الوحدة",
    "Units (derived)": "عدد الوحدات (محسوب)", "Keys": "المفاتيح", "Key price": "سعر المفتاح",
    "Rent": "الإيجار", "Units": "الوحدات", "ADR": "متوسط سعر الليلة ADR",
    "Initial occupancy": "الإشغال الابتدائي", "Years to stabilization": "سنوات الاستقرار",
    "Stabilized occupancy": "الإشغال المستقر", "OpEx": "مصاريف التشغيل", "Exit cap rate": "معدل الرسملة عند التخارج",
    "Sales period": "فترة البيع", "Operating period": "فترة التشغيل",

    /* Sidebar — timing / costs / financing */
    "Project Timing": "الجدول الزمني", "Pre-construction": "ما قبل الإنشاء", "Construction": "الإنشاء",
    "Sales start": "بدء البيع", "Horizon": "الأفق الزمني", "Auto": "تلقائي",
    "From project start": "من بداية المشروع",
    "No component is being sold": "لا يوجد مكوّن معروض للبيع",
    "Pre-construction + construction + hold / sell-down": "ما قبل الإنشاء + الإنشاء + التشغيل / البيع",
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
    /* Collapse control on the input panels. */
    "Collapse the panel": "طيّ اللوحة", "Expand the panel": "فتح اللوحة",
    "Assumptions": "الفرضيات", "Inputs": "المدخلات",
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
    "Peak debt": "ذروة الدين",
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
    "Income and debt covered every outflow, so no equity was required — an equity IRR is undefined rather than poor.":
      "غطّت الإيرادات والدين كل التدفقات الخارجة، فلم تُطلب أي مساهمة من الملكية — وعليه فإن معدل العائد الداخلي للملكية غير معرّف، لا ضعيف.",
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
    "of which: interest": "منها: الفوائد المدفوعة", "= Equity CF": "= تدفق الملكية", "Cum. equity": "تراكمي الملكية",
    "interest rolled up": "فوائد مُرسملة",
    "Interest there was no cash to pay, added to the loan balance instead": "فوائد لم يتوفر نقد لسدادها، فأُضيفت إلى رصيد القرض بدلًا من ذلك",
    "Memo — not in the totals": "للعلم فقط — خارج المجاميع",
    "Debt service runs monthly, interest before principal. A single year can show both a payment and a roll-up because they fell in different months — interest rolls up while there is no cash, and is paid in full as soon as there is.": "تُحتسب خدمة الدين شهريًا، وتُسدّد الفوائد قبل أصل الدين. قد تُظهر السنة الواحدة سدادًا ورسملة معًا لأنهما وقعا في شهرين مختلفين — تُرسمل الفوائد ما دام النقد غير متوفر، وتُسدّد بالكامل فور توفره",
    "Detail only — these columns explain the debt line beside them and are not added into Equity CF or the cumulative.": "تفصيل فقط — يوضّح هذان العمودان بند الدين المجاور ولا يدخلان في احتساب تدفق الملكية ولا التراكمي",
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
    "yrs) — predesign + construction + sell-down / hold, ending on the last trading month.": "سنة) — التصميم + الإنشاء + البيع/التشغيل، وينتهي في آخر شهر تشغيلي.",
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
    /* Who each use is actually paid to. */
    "Landowner + state": "مالك الأرض والجهات الحكومية",
    "Consultants + authorities": "استشاريون وجهات حكومية",
    "Agents + state": "وسطاء وجهات حكومية",
    "Lender": "جهة التمويل",
    "Unallocated": "غير مخصّص",
    "Landowner": "مالك الأرض",
    "Operators + suppliers": "مشغّلون وموردون",
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
    "Land & ground rent": "الأرض وإيجار الأرض",
    "Construction & site works": "الإنشاء وأعمال الموقع",
    "Profit margin (on revenue)": "هامش الربح (على الإيراد)",
    "ROI on cost": "العائد على التكلفة",
    "Interest as % of all-in cost": "الفوائد كنسبة من إجمالي التكلفة",
    "Interest cover (stabilised)": "تغطية الفوائد (عند الاستقرار)",
    "Interest cover": "تغطية الفوائد",
    "NOI ÷ interest, stabilised": "صافي الدخل التشغيلي ÷ الفوائد، عند الاستقرار",
    "No debt in operations": "لا يوجد دين خلال التشغيل",
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
    "What it costs to secure the site: purchase price and transfer fees if bought, ground rent over the whole hold if leased. Much above 30% and the deal is land-heavy, which squeezes the margin.":
      "ما يلزم لتأمين الموقع: ثمن الشراء ورسوم النقل في حالة التملّك، أو إيجار الأرض طوال فترة الاحتفاظ في حالة الإيجار. وتجاوزها 30% كثيرًا يعني ثقل تكلفة الأرض مما يضغط على الهامش.",
    "Hard construction plus site works and infrastructure — normally the largest single line.":
      "تكلفة الإنشاء المباشرة مع أعمال الموقع والبنية التحتية — وهي عادةً أكبر بند منفرد.",
    "Design, permits, management and the risk buffer.":
      "التصميم والتراخيص والإدارة واحتياطي المخاطر.",
    "All-in construction and site works per m² of built area — compare it against local benchmarks.":
      "إجمالي تكلفة الإنشاء وأعمال الموقع لكل م² مبني — قارنها بالمعدلات السائدة في السوق.",
    "Profit after financing as a share of total revenue. Under ~12% leaves little room for error.":
      "الربح بعد التمويل كنسبة من إجمالي الإيراد. وأقل من نحو 12% يترك هامش خطأ ضيقًا.",
    "Profit after financing over all-in cost including interest — the return on every riyal spent.":
      "الربح بعد التمويل مقسومًا على إجمالي التكلفة شاملة الفوائد — أي العائد على كل ريال منفق.",
    "Total revenue per m² of saleable or leasable area — a quick sanity check against market pricing.":
      "إجمالي الإيراد لكل م² قابل للبيع أو التأجير — فحص سريع لمنطقية الأسعار مقابل السوق.",
    "Financing cost as a share of development cost. High values point to heavy leverage or a long build.":
      "تكلفة التمويل كنسبة من تكلفة التطوير. وارتفاعها يشير إلى رفع مالي كبير أو فترة إنشاء طويلة.",
    "Three shares of one base, and they add to exactly 100%. The base is land + transfer fees + ground rent + construction + site works + soft costs + contingency. It excludes financing interest and selling costs, which are shown under Financing below. Previously these shares were taken over a base that omitted site works and transfer fees, so they summed to about 95% and never quite accounted for the project.":
      "ثلاث حصص من أساس واحد، ومجموعها 100% بالضبط. والأساس هو: الأرض + رسوم النقل + إيجار الأرض + الإنشاء + أعمال الموقع + التكاليف غير المباشرة + الاحتياطي. ولا يشمل فوائد التمويل ولا تكاليف البيع، وهي معروضة ضمن «التمويل» أدناه. وكانت هذه الحصص تُحتسب سابقًا على أساس يغفل أعمال الموقع ورسوم النقل، فكان مجموعها نحو 95% ولا يغطي المشروع بالكامل.",
    "How much the money costs, how hard the facility is working, and whether operating income covers the interest.":
      "كم تكلّف الأموال، وإلى أي مدى تُستخدم التسهيلات، وهل يغطي الدخل التشغيلي الفوائد.",
    "Financing interest as a share of every riyal the project spends, interest included. High values point to heavy leverage or a long build.":
      "فوائد التمويل كنسبة من كل ريال ينفقه المشروع، شاملًا الفوائد نفسها. وارتفاعها يشير إلى رفع مالي كبير أو فترة إنشاء طويلة.",
    "Highest loan balance against the facility cap. At 100% the facility is fully used, with no headroom left.":
      "أعلى رصيد للقرض مقابل سقف التسهيلات. وعند 100% تكون التسهيلات مستنفدة بالكامل دون أي متسع.",
    "Investor cash as a share of everything that funded the project — the rest comes from the loan and from the project's own sales and rental income.":
      "نقد المستثمرين كنسبة من إجمالي ما موّل المشروع — والباقي من القرض ومن إيرادات البيع والإيجار الخاصة بالمشروع.",
    "Operating income after ground rent, divided by the interest due, at its worst month once the lease-up has finished. Below 1× the rent does not cover the interest. Shown as — when the question does not apply: a scheme that sells repays from proceeds, and an ungeared scheme pays no interest.":
      "الدخل التشغيلي بعد إيجار الأرض مقسومًا على الفوائد المستحقة، في أسوأ شهر بعد اكتمال فترة التأجير التدريجي. وأقل من 1× يعني أن الإيجار لا يغطي الفوائد. وتظهر «—» عندما لا ينطبق السؤال: فالمشروع الذي يبيع يسدّد من حصيلة البيع، والمشروع غير المموّل بالدين لا يدفع فوائد.",
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
    /* The comparable's area, named for the basis the approach actually divides
       by — built-up for a building, plot for bare land. Wording follows the
       subject's own fields in step 01 so the two read as the same measurement. */
    "Comparable built-up area": "مساحة بناء العقار المقارن",
    "Comparable land area": "مساحة أرض العقار المقارن",
    "Covered floor area (GFA) of the comparable — the same basis as the subject.":
      "المسطحات المبنية المغطاة (GFA) للعقار المقارن — بالأساس نفسه المستخدم للعقار محل التقييم.",
    "Plot size of the comparable — the same basis as the subject.":
      "مساحة قطعة أرض العقار المقارن — بالأساس نفسه المستخدم للعقار محل التقييم.",
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
    "Weighting the three approaches": "ترجيح الأساليب الثلاثة",
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
    "The three approaches in detail": "تفصيل الأساليب الثلاثة",
    "The workings behind each indicated value — the same three columns a valuer would set out.":
      "تفصيل احتساب القيمة المستخلصة من كل أسلوب — الأعمدة الثلاثة نفسها التي يعرضها المقيّم.",
    "Median adjusted": "الوسيط بعد التسوية",
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
    /* JSX collapses the source line break into a single space — the key must
       match the runtime string, not the indented source. */
    "This tool follows the three internationally recognised valuation approaches (IVS), but is an indicative estimate — not a substitute for an accredited valuer (Taqeem) report where one is legally required.":
      "تتبع هذه الأداة أساليب التقييم الثلاثة المعتمدة دوليًا (IVS)، لكنها تقدير استرشادي — ولا تغني عن تقرير مقيّم معتمد (تقييم) حيث يُشترط نظامًا.",

    /* Sensitivity drivers (valuation) */
    "Comparable prices ±10%": "أسعار المقارنات ±10%",
    "Rent ±10%": "الإيجار ±10%",
    "Cap rate ∓10%": "معدل الرسملة ∓10%",
    "Build cost ±10%": "تكلفة البناء ±10%",
    "Land price ±10%": "سعر الأرض ±10%",

    /* Quality check titles (static ones) */
    "No usable comparables": "لا توجد مقارنات صالحة",
    "Professional practice uses 3–5 comparable sales. Fewer comps make the value less reliable.":
      "تعتمد الممارسة المهنية على ٣–٥ صفقات مقارنة. وكلما قلّ عددها ضعفت موثوقية القيمة.",
    "Total adjustments beyond ±25% suggest the comparable is not truly similar — consider replacing it.":
      "التسويات الإجمالية التي تتجاوز ±٢٥٪ تشير إلى أن العقار المقارن ليس مماثلًا فعليًا — يُفضّل استبداله.",
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
    "Sign in to save this model": "سجّل الدخول لحفظ هذا النموذج",
    "Saved models live in your account, so you can reopen them from any device. Your work is kept while you sign in, and you are brought straight back here.": "النماذج المحفوظة تبقى في حسابك، فتستطيع فتحها من أي جهاز. يُحتفظ بعملك أثناء تسجيل الدخول، وتعود إلى هنا مباشرة.",
    "Keep this scheme in your account and reopen it later": "احفظ هذا المخطط في حسابك وافتحه لاحقًا",
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

    /* =========================================================
       Investment report.

       The report's prose is assembled from templates rather than written
       per-sentence, so the KEY here is a whole sentence with {placeholders}
       still in it. Keep every placeholder — the code substitutes into the
       Arabic string after this lookup, and a dropped one leaves a literal
       "{irr}" in a document going to a bank. Placeholders may be reordered
       freely to suit Arabic word order.
       ========================================================= */

    /* Report chrome & dialog */
    "Report": "التقرير",
    "Prepare the report": "إعداد التقرير",
    "Everything below is optional. Anything left blank is simply omitted, and the report falls back to REAP branding.":
      "كل ما يلي اختياري. أي حقل يُترك فارغًا يُحذف من التقرير، وتُستخدم هوية REAP الافتراضية.",
    "Branding": "الهوية المؤسسية",
    "Company name": "اسم الشركة",
    "Company logo": "شعار الشركة",
    "Company address": "عنوان الشركة",
    "Company website": "الموقع الإلكتروني",
    "PNG or SVG, under 1.5 MB": "PNG أو SVG، أقل من ١٫٥ ميغابايت",
    "That file is not an image.": "هذا الملف ليس صورة.",
    "That image could not be read.": "تعذّرت قراءة الصورة.",
    "Please use an image under 1.5 MB.": "الرجاء استخدام صورة أقل من ١٫٥ ميغابايت.",
    "Remove": "إزالة",
    "Cancel": "إلغاء",
    "Close": "إغلاق",
    "Prepared for": "أُعدّ لصالح",
    "Prepared by": "أُعدّ بواسطة",
    "Contact person": "الشخص المسؤول",
    "Position or title": "المنصب أو الصفة",
    "Notes": "ملاحظات",
    "Report information": "بيانات التقرير",
    "Report title": "عنوان التقرير",
    "Report number": "رقم التقرير",
    "Report date": "تاريخ التقرير",
    "Report details": "تفاصيل التقرير",
    "Confidentiality level": "مستوى السرية",
    "Public": "عام",
    "Confidential": "سرّي",
    "Strictly Confidential": "سرّي للغاية",
    "Generate report": "إنشاء التقرير",
    "There is no programme to report on yet": "لا يوجد برنامج ليُعدّ عنه تقرير بعد",
    "Add at least one component to the programme — and set the land area and price — and the report will assemble from the results. Generating now would produce a complete document in which every figure is zero.":
      "أضف مكوّنًا واحدًا على الأقل إلى البرنامج — وحدّد مساحة الأرض وسعرها — وعندها يُبنى التقرير من النتائج. أما الإنشاء الآن فسينتج وثيقة كاملة كل أرقامها أصفار.",
    "Edit details": "تعديل البيانات",
    "Print or save as PDF": "طباعة أو حفظ بصيغة PDF",
    "Contents": "المحتويات",
    "Page {a} of {b}": "صفحة {a} من {b}",
    "Date": "التاريخ",
    "Reference": "المرجع",
    "Classification": "التصنيف",
    "Feasibility Study": "دراسة جدوى",
    "Produced with REAP — Real Estate Assessment Platform":
      "أُنتج باستخدام REAP — منصة تقييم العقارات",
    "continued": "تابع",
    "The project": "المشروع",

    /* Confidentiality statements */
    "This report may be circulated without restriction.":
      "يجوز تداول هذا التقرير دون قيد.",
    "This report is confidential and is provided solely for the use of the recipient named above. It may not be reproduced or circulated without written consent.":
      "هذا التقرير سرّي ومُقدَّم حصريًا لاستخدام الجهة المذكورة أعلاه، ولا يجوز نسخه أو تداوله دون موافقة خطية.",
    "This report is strictly confidential. It is provided solely for the named recipient and may not be copied, quoted, or disclosed to any other party under any circumstances.":
      "هذا التقرير سرّي للغاية، ومُقدَّم حصريًا للجهة المذكورة، ولا يجوز نسخه أو الاقتباس منه أو الإفصاح عنه لأي طرف آخر تحت أي ظرف.",

    /* Section titles & subtitles */
    "Executive Summary": "الملخص التنفيذي",
    "Findings, headline metrics and overall assessment": "النتائج والمؤشرات الرئيسية والتقييم العام",
    "Project Overview": "نظرة عامة على المشروع",
    "The site, the programme and the timeline as modelled": "الموقع والبرنامج والجدول الزمني كما نُمذجت",
    "Financial Overview": "النظرة المالية العامة",
    "Development cost, revenue and the profit between them": "تكلفة التطوير والإيرادات والربح بينهما",
    "Cash Flow Analysis": "تحليل التدفقات النقدية",
    "Annual movement and the cumulative position": "الحركة السنوية والمركز التراكمي",
    "Investment Metrics": "مؤشرات الاستثمار",
    "Each measure, its value, and what it means": "كل مؤشر وقيمته ودلالته",
    "Capital Structure and Waterfall": "هيكل رأس المال وشلال التوزيعات",
    "How proceeds divide between the partners": "كيفية توزيع العوائد بين الشركاء",
    "Risk Assessment": "تقييم المخاطر",
    "The engine's register of flags raised by these inputs": "سجل التنبيهات التي أثارها المحرك على هذه المدخلات",
    "Sensitivity Analysis": "تحليل الحساسية",
    "What moves the return, and by how much": "ما الذي يحرّك العائد، وبأي مقدار",
    "Assessment": "التقييم",
    "Strengths, weaknesses, opportunities and risk factors": "نقاط القوة والضعف والفرص وعوامل المخاطرة",
    "Recommendation": "التوصية",
    "The conclusion these numbers support": "الاستنتاج الذي تدعمه هذه الأرقام",
    "Appendix": "الملاحق",
    "Assumptions, formulae and definitions": "الفرضيات والمعادلات والتعريفات",

    /* Ratings */
    "Strong": "قوي", "Favourable": "مواتٍ", "Moderate": "متوسط",
    "Marginal": "حدّي", "Unfavourable": "غير مواتٍ",

    /* Verdicts */
    "Proceed": "المضي قدمًا",
    "Proceed, subject to conditions": "المضي قدمًا بشروط",
    "Proceed with caution": "المضي بحذر",
    "Restructure before proceeding": "إعادة الهيكلة قبل المضي",
    "Do not proceed on these assumptions": "عدم المضي وفق هذه الفرضيات",
    "Conditions": "الشروط",
    "Confirm the facility at the modelled peak of {debt}, or restructure toward a lower loan-to-cost.":
      "تأكيد التسهيل عند الذروة المنمذجة {debt}، أو إعادة الهيكلة نحو نسبة دين إلى تكلفة أقل.",
    "Raise contingency to at least 5% of construction before the cost plan is fixed.":
      "رفع الاحتياطي إلى ٥٪ من الإنشاء على الأقل قبل تثبيت خطة التكاليف.",
    "Re-test soft costs against a real consultant fee schedule.":
      "إعادة اختبار التكاليف غير المباشرة مقابل جدول أتعاب استشاري فعلي.",
    "Demonstrate that the stabilised asset can service the facility, or size the debt to the income rather than to cost.":
      "إثبات قدرة الأصل بعد استقراره على خدمة التسهيل، أو تحجيم الدين وفق الدخل لا وفق التكلفة.",
    "Resolve the land allocation, which currently exceeds the site.":
      "معالجة تخصيص الأرض، فهو يتجاوز حاليًا مساحة الموقع.",
    "Support the exit capitalisation rate with transactional evidence.":
      "دعم معدل رسملة التخارج بأدلة من صفقات فعلية.",
    "Re-run the study against tendered construction rates once they are available.":
      "إعادة تشغيل الدراسة على أسعار إنشاء مناقصية فور توفرها.",

    /* Table column heads used verbatim */
    "GFA (m²)": "المساحة الطابقية (م²)",
    "NSA (m²)": "المساحة الصافية (م²)",
    "MOIC": "مضاعف رأس المال",
    "Score": "الدرجة",
    "P10": "المئين ١٠", "P90": "المئين ٩٠",

    /* Executive paragraph */
    "{name} is a {type} scheme in {loc} on a site of {area} m², carrying a total investment of {inv} including finance charges.":
      "{name} مشروع {type} في {loc} على أرض مساحتها {area} م²، بإجمالي استثمار قدره {inv} شاملًا أعباء التمويل.",
    "mixed-use": "متعدد الاستخدامات",
    "the location stated in the inputs": "الموقع المحدد في المدخلات",
    "Revenue of {rev} produces a net profit of {profit}, a margin of {margin}.":
      "إيرادات قدرها {rev} تُنتج صافي ربح {profit}، بهامش {margin}.",
    "Revenue of {rev} does not cover cost, leaving a shortfall of {loss}.":
      "إيرادات قدرها {rev} لا تغطي التكلفة، ما يترك عجزًا قدره {loss}.",
    "The scheme calls {eq} of equity against a peak debt of {debt}, and returns an equity IRR of {irr} with a net present value of {npv} at a {hurdle} discount rate.":
      "يستدعي المشروع {eq} من حقوق الملكية مقابل ذروة دين قدرها {debt}، ويحقق معدل عائد داخلي على الملكية قدره {irr} بقيمة حالية صافية {npv} عند معدل خصم {hurdle}.",
    "No equity was required: income and debt covered every outflow, so the return is reported at project level as {irr} with a net present value of {npv}.":
      "لم تُطلب حقوق ملكية: غطّى الدخل والدين كل التدفقات الخارجة، لذا يُعرض العائد على مستوى المشروع بـ {irr} وقيمة حالية صافية {npv}.",
    "Against the platform's composite measure the scheme scores {score} of 100 and is rated {rating}. The recommendation of this report is: {verdict}.":
      "وفق المقياس المركّب للمنصة يحصل المشروع على {score} من ١٠٠ ويُصنَّف {rating}. وتوصية هذا التقرير هي: {verdict}.",

    /* Project overview */
    "Project particulars": "بيانات المشروع",
    "Project name": "اسم المشروع",
    "Development type": "نوع التطوير",
    "Gross floor area": "المساحة الطابقية الإجمالية",
    "Net saleable / leasable area": "المساحة الصافية القابلة للبيع أو التأجير",
    "Development programme": "برنامج التطوير",
    "Item": "البند", "Detail": "التفصيل",
    "Land tenure": "حيازة الأرض",
    "Freehold — purchased": "ملكية تامة — مشتراة",
    "Leasehold — ground rent": "حق انتفاع — إيجار أرض",
    "Site condition": "حالة الموقع",
    "Raw — requires infrastructure": "خام — تتطلب بنية تحتية",
    "Serviced": "مخدومة",
    "Gross land area": "مساحة الأرض الإجمالية",
    "Net developable area": "المساحة الصافية القابلة للتطوير",
    "Residential units": "الوحدات السكنية",
    "Hotel keys": "مفاتيح الفندق",
    "Pre-construction period": "فترة ما قبل الإنشاء",
    "Construction period": "فترة الإنشاء",
    "Sales commence": "بدء البيع",
    "Analysis horizon": "أفق التحليل",
    "Land share": "حصة الأرض",
    "Units / keys": "وحدات / مفاتيح",
    "Basis": "الأساس",
    "Sale": "بيع", "Lease": "تأجير", "Mixed": "مختلط",
    "{n} months": "{n} شهرًا",
    "{n} years": "{n} سنوات",
    "Month {m}": "الشهر {m}",
    "Year {n}": "السنة {n}",

    /* Financial overview */
    "Development cost": "تكلفة التطوير",
    "Cost head": "بند التكلفة", "Amount": "المبلغ", "Share": "الحصة",
    "Land acquisition": "شراء الأرض",
    "Land transfer fees": "رسوم نقل الملكية",
    "Ground rent over term": "إيجار الأرض خلال المدة",
    "Site infrastructure": "البنية التحتية للموقع",
    "Site works": "أعمال الموقع",
    "Government and sales fees": "الرسوم الحكومية ورسوم البيع",
    "Finance charges": "أعباء التمويل",
    "Total investment": "إجمالي الاستثمار",
    "Revenue source": "مصدر الإيراد",
    "Sales proceeds": "متحصلات البيع",
    "Rental income (gross)": "الدخل الإيجاري (الإجمالي)",
    "Exit / terminal value": "قيمة التخارج النهائية",
    "Operating result on the income-producing element": "النتيجة التشغيلية للعنصر المدرّ للدخل",
    "Operating result, stabilised year": "النتيجة التشغيلية، سنة الاستقرار",
    "The asset at full occupancy in a normal year of operation. These are annual figures, not lifetime ones — a single year, repeated for as long as the asset is held.":
      "الأصل بإشغال كامل في سنة تشغيل اعتيادية. وهذه أرقام سنوية لا إجماليات عمر المشروع — سنة واحدة تتكرر ما دام الأصل محتفظًا به.",
    "Operating result over the whole term": "النتيجة التشغيلية خلال كامل المدة",
    "Everything actually collected and spent across the hold, from first letting to disposal.":
      "كل ما حُصّل وأُنفق فعليًا طوال فترة الاحتفاظ، من أول تأجير حتى التخارج.",
    "Gross income": "الدخل الإجمالي",
    "Rental income collected": "الدخل الإيجاري المحصّل",

    /* Chart totals — the time basis has to be on the label */
    "Total revenue, whole term": "إجمالي الإيرادات، كامل المدة",
    "Net project cash flow, whole term": "صافي التدفق النقدي للمشروع، كامل المدة",
    "Net equity cash flow, whole term": "صافي التدفق النقدي لحقوق الملكية، كامل المدة",
    "Total sources, whole term": "إجمالي المصادر، كامل المدة",

    /* Fund-structure caveat */
    "This section applies only if the project is held through a fund. Everything before it reports the scheme on its own balance sheet; the figures below show how that same result would divide between the partners under the terms set out in the appendix. If no fund is established, none of it applies and the returns already reported stand.":
      "ينطبق هذا القسم فقط إذا كان المشروع مملوكًا عبر صندوق. فكل ما سبقه يعرض المشروع على ميزانيته الخاصة، أما الأرقام أدناه فتبيّن كيف تنقسم النتيجة نفسها بين الشركاء وفق الشروط الواردة في الملاحق. وإذا لم يُؤسَّس صندوق فلا ينطبق أي منها، وتبقى العوائد المعروضة سابقًا هي المعتمدة.",

    /* Assumptions — bases, without trailing full stops (they land at the
       wrong visual edge in an RTL table cell) */
    "Infrastructure cost per m²": "تكلفة البنية التحتية للمتر المربع",
    "Gross land area": "مساحة الأرض الإجمالية",
    "The land purchase price": "سعر شراء الأرض",
    "Gross land area, for each year of the term": "مساحة الأرض الإجمالية، عن كل سنة من المدة",
    "The interval between ground rent reviews": "الفترة الفاصلة بين مراجعات إيجار الأرض",
    "The rent then in force, compounded at each review": "الإيجار الساري حينها، مركَّبًا عند كل مراجعة",
    "Gross land area, spent alongside site works during construction":
      "مساحة الأرض الإجمالية، تُنفَق مع أعمال الموقع أثناء الإنشاء",
    "Construction cost plus site works": "تكلفة الإنشاء زائد أعمال الموقع",
    "Construction plus site works plus soft costs": "الإنشاء زائد أعمال الموقع زائد التكاليف غير المباشرة",
    "Sales revenue only — raises nothing on a wholly leased scheme":
      "إيرادات البيع فقط — لا تُحصّل شيئًا في مشروع مؤجَّر بالكامل",
    "Development cost before finance — land, transfer fees, construction, site works, soft costs and contingency. It sets the facility limit, not the amount drawn":
      "تكلفة التطوير قبل التمويل — الأرض ورسوم النقل والإنشاء وأعمال الموقع والتكاليف غير المباشرة والاحتياطي. وهي تحدّد سقف التسهيل لا المبلغ المسحوب",
    "Annual, charged monthly on the outstanding balance at the twelfth root of the annual rate":
      "سنوي، يُحتسب شهريًا على الرصيد القائم بالجذر الثاني عشر للمعدل السنوي",
    "Annual — discounts the cash flows for NPV, and is the hurdle every return is judged against":
      "سنوي — يُخصم به التدفق النقدي لحساب القيمة الحالية، وهو العتبة التي يُقاس عليها كل عائد",
    "Gross land area — the remainder carries no buildable programme":
      "مساحة الأرض الإجمالية — والباقي لا يحمل برنامجًا قابلًا للبناء",

    /* Report dialog hints */
    "Appears on the cover and in every page header": "يظهر على الغلاف وفي ترويسة كل صفحة",
    "Leave blank to use REAP branding": "اتركه فارغًا لاستخدام هوية REAP",
    "PNG or SVG, under 1.5 MB. Replaces the REAP mark on the cover":
      "PNG أو SVG، أقل من ١٫٥ ميغابايت. يحل محل شعار REAP على الغلاف",
    "Printed under your name on the cover": "يُطبع تحت اسمك على الغلاف",
    "Cover only — not turned into a link": "على الغلاف فقط — لا يُحوَّل إلى رابط",
    "e.g. King Fahd Road, Riyadh 12345": "مثال: طريق الملك فهد، الرياض ١٢٣٤٥",
    "e.g. example.com": "مثال: example.com",
    "Who is receiving this report. These four lines are printed together on the cover.":
      "الجهة التي يُوجَّه إليها التقرير. وتُطبع هذه الأسطر الأربعة معًا على الغلاف.",
    "The recipient organisation, not your own": "الجهة المستلمة، لا جهتك أنت",
    "e.g. Saudi Investment Bank": "مثال: البنك السعودي للاستثمار",
    "The individual the report is addressed to": "الشخص الموجَّه إليه التقرير",
    "e.g. Faisal Al-Otaibi": "مثال: فيصل العتيبي",
    "Their role at the recipient organisation": "منصبه في الجهة المستلمة",
    "e.g. Head of Real Estate Finance": "مثال: رئيس التمويل العقاري",
    "One line of context, printed under the recipient": "سطر واحد للسياق، يُطبع تحت اسم المستلم",
    "e.g. Phase 1 submission": "مثال: تقديم المرحلة الأولى",
    "The heading on the cover. Defaults to the project name": "العنوان على الغلاف. وافتراضيًا اسم المشروع",
    "e.g. Feasibility Study — Al Nakheel": "مثال: دراسة جدوى — النخيل",
    "Your own filing reference, if you use one": "رقم الحفظ لديك، إن كنت تستخدم واحدًا",
    "e.g. REF-2026-014": "مثال: REF-2026-014",
    "Printed on the cover and in every page footer": "يُطبع على الغلاف وفي تذييل كل صفحة",
    "The author or team. Defaults to your company name": "المُعِد أو الفريق. وافتراضيًا اسم شركتك",
    "e.g. Business Development": "مثال: تطوير الأعمال",
    "Sets the footer marking and the notice on the cover": "يحدّد وسم التذييل والإشعار على الغلاف",
    "Site works and infrastructure": "أعمال الموقع والبنية التحتية",
    "Operating expenditure over term": "المصروفات التشغيلية خلال المدة",
    "Gross income, stabilised year": "الدخل الإجمالي، سنة الاستقرار",
    "Operating expenditure, stabilised year": "المصروفات التشغيلية، سنة الاستقرار",
    "Net operating income, stabilised year": "صافي الدخل التشغيلي، سنة الاستقرار",
    "Rental income collected over term": "الدخل الإيجاري المحصّل خلال المدة",
    "Net operating income over term": "صافي الدخل التشغيلي خلال المدة",
    "The first three lines are stabilised annual figures — the asset at full occupancy in a normal year. The lifetime lines below are the totals actually collected and spent across the hold.":
      "الأسطر الثلاثة الأولى أرقام سنوية عند الاستقرار — أي الأصل بإشغال كامل في سنة اعتيادية. أما أسطر المدة أدناه فهي الإجماليات المحصّلة والمنفَقة فعليًا طوال فترة الاحتفاظ.",
    "Gross income over term": "الدخل الإجمالي خلال المدة",
    "Operating expenditure": "المصروفات التشغيلية",
    "Result": "النتيجة",

    /* Cash flow */
    "Annual cash flow": "التدفق النقدي السنوي",
    "Costs and finance charges are shown as outflows. The cumulative column is the running project position, undiscounted.":
      "تُعرض التكاليف وأعباء التمويل كتدفقات خارجة. وعمود التراكم هو المركز الجاري للمشروع دون خصم.",
    "Period": "الفترة", "Cost": "التكلفة", "Finance": "التمويل",
    "Net": "الصافي", "Cumulative": "التراكمي", "Costs": "التكاليف",
    "Annual cash flow, years {a}–{b}": "التدفق النقدي السنوي، السنوات {a}–{b}",
    "{t}, years {a}–{b}": "{t}، السنوات {a}–{b}",

    /* Sign-in gate on export / print */
    "Account required": "يتطلب حسابًا",
    "Sign in to export your report": "سجّل الدخول لتصدير تقريرك",
    "Exporting produces a branded document with your company on the cover — so it needs an account behind it. Your work is kept while you sign in, and you are brought straight back here.":
      "التصدير يُنتج وثيقة تحمل هوية شركتك على الغلاف، ولذلك يتطلب حسابًا. ويُحتفظ بعملك أثناء تسجيل الدخول، ثم تعود إلى هنا مباشرة.",
    "Sign in to print your valuation": "سجّل الدخول لطباعة تقييمك",
    "Printing produces a document that leaves this session, so it needs an account behind it. Your inputs are kept while you sign in, and you are brought straight back here.":
      "الطباعة تُنتج وثيقة تخرج من هذه الجلسة، ولذلك تتطلب حسابًا. ويُحتفظ بمدخلاتك أثناء تسجيل الدخول، ثم تعود إلى هنا مباشرة.",
    "Create free account": "أنشئ حسابًا مجانيًا",
    "Sign in": "تسجيل الدخول",
    "Not now — keep working": "ليس الآن — متابعة العمل",
    "Sign in first.": "سجّل الدخول أولًا.",

    /* Cost & Revenue sections */
    "Cost": "التكاليف",
    "What the scheme costs to build and carry": "ما يكلّفه المشروع بناءً وحملًا",
    "Revenue": "الإيرادات",
    "What the scheme earns, and from where": "ما يحققه المشروع، ومن أين",
    "Cost mix": "مزيج التكاليف",
    "The same heads as a share of the whole.": "البنود نفسها كنسبة من الإجمالي.",
    "Revenue by year": "الإيرادات حسب السنة",
    "When the income actually arrives.": "متى يصل الدخل فعليًا.",

    /* Financial metrics */
    "Financial Metrics": "المؤشرات المالية",
    "The project on its own, and what reaches equity": "المشروع بذاته، وما يصل إلى حقوق الملكية",
    "From revenue to profit": "من الإيراد إلى الربح",
    "Every cost head taken off revenue in turn, ending at net profit.":
      "كل بند تكلفة يُخصم من الإيراد بالتتابع، انتهاءً بصافي الربح.",
    "Project measures": "مؤشرات المشروع",
    "Unlevered. These judge the scheme on its own, before any facility.":
      "غير مرفوعة. تقيس المشروع بذاته، قبل أي تسهيل ائتماني.",
    "Equity measures": "مؤشرات حقوق الملكية",
    "Levered. These judge what reaches the sponsor once the facility has been served.":
      "مرفوعة. تقيس ما يصل إلى الراعي بعد خدمة التسهيل الائتماني.",
    "Project payback": "استرداد المشروع",
    "The month in which the unlevered position first turns positive.":
      "الشهر الذي يتحوّل فيه المركز غير المرفوع إلى الموجب لأول مرة.",
    "Total revenue less every cost, including finance charges.":
      "إجمالي الإيرادات ناقص كل التكاليف، بما فيها أعباء التمويل.",
    "Every cost the scheme incurs, finance charges included.":
      "كل تكلفة يتكبّدها المشروع، بما فيها أعباء التمويل.",
    "Total equity called": "إجمالي حقوق الملكية المستدعاة",
    "Every riyal of equity the scheme required over its life.":
      "كل ريال من حقوق الملكية احتاجه المشروع طوال عمره.",
    "OpEx": "المصروفات التشغيلية",
    "Selling": "البيع",
    "Finance": "التمويل",
    "Profit": "الربح",
    "Land": "الأرض",

    /* Sources and uses */
    "Uses and Sources": "الاستخدامات والمصادر",
    "Sources and Uses": "المصادر والاستخدامات",
    "What the project spends, and what pays for it": "ما ينفقه المشروع، وما يموّله",
    "Uses of funds": "استخدامات الأموال",
    "Sources of funds": "مصادر الأموال",
    "Use": "الاستخدام", "Source": "المصدر",
    "Land and ground rent": "الأرض وإيجارها",
    "Marketing, commission and fees": "التسويق والعمولة والرسوم",
    "Total uses": "إجمالي الاستخدامات",
    "Total sources": "إجمالي المصادر",
    "Revenue applied": "الإيراد المستخدم",
    "Debt facility": "التسهيل الائتماني",
    "Equity injected": "حقوق الملكية المضخوخة",
    "Revenue funds a cost when it arrives in the same month; the facility covers what revenue does not; equity is the residual that covers the rest. The two totals agree by construction.":
      "يموّل الإيراد التكلفة حين يصل في الشهر نفسه، ويغطي التسهيل ما لا يغطيه الإيراد، وحقوق الملكية هي المتبقي الذي يغطي الباقي. والإجماليان متطابقان بحكم البناء.",
    "Where the money goes, by cost head.": "إلى أين تذهب الأموال، بحسب بند التكلفة.",
    "How the spend was funded, by year": "كيف مُوّل الإنفاق، سنويًا",
    "Each year of outflow, split into the equity, debt and revenue that covered it.":
      "كل سنة من التدفق الخارج، مقسّمة إلى حقوق الملكية والدين والإيراد الذي غطّاها.",
    "What pays for it, by funding stream.": "ما يموّله، بحسب مصدر التمويل.",

    /* Cash flow statements */
    "The project statement, and what reaches equity": "بيان المشروع، وما يصل إلى حقوق الملكية",
    "Equity cash flow": "التدفق النقدي لحقوق الملكية",
    "Net project cash flow": "صافي التدفق النقدي للمشروع",
    "Net equity cash flow": "صافي التدفق النقدي لحقوق الملكية",
    "Debt service": "خدمة الدين",
    "Unlevered: revenue less development cost, before any financing. Figures are rounded for presentation; the full amounts are in the Financial Overview.":
      "غير مرفوع: الإيرادات ناقص تكلفة التطوير، قبل أي تمويل. والأرقام مقرّبة لأغراض العرض، والمبالغ الكاملة في النظرة المالية العامة.",
    "The project result after the facility is applied. Debt service carries both principal and interest — the interest sits inside it rather than on a line of its own, and showing it again would count it twice.":
      "نتيجة المشروع بعد تطبيق التسهيل. وخدمة الدين تحمل الأصل والفائدة معًا — فالفائدة داخلها لا في بند مستقل، وإظهارها مرة أخرى يعني احتسابها مرتين.",
    "The project's own cash flow, the facility drawn against it and the cost of servicing that facility — the three together give the cumulative equity position drawn over them.":
      "التدفق النقدي للمشروع نفسه، والتسهيل المسحوب مقابله، وتكلفة خدمة ذلك التسهيل — وتجتمع الثلاثة لتعطي المركز التراكمي لحقوق الملكية المرسوم فوقها.",

    /* Added charts */
    "Cost structure": "هيكل التكاليف",
    "Every cost head, largest first, against total investment.":
      "كل بنود التكلفة، الأكبر أولًا، مقابل إجمالي الاستثمار.",
    "Selling and fees": "البيع والرسوم",
    "Revenue mix": "مزيج الإيرادات",
    "Where the income comes from.": "من أين يأتي الدخل.",
    "Profit by scenario": "الربح حسب السيناريو",
    "Net profit under each case.": "صافي الربح في كل حالة.",
    "Costs and finance charges are shown as outflows. The cumulative row is the running project position, undiscounted. Figures are rounded for presentation.":
      "تُعرض التكاليف وأعباء التمويل كتدفقات خارجة. وصف التراكم هو المركز الجاري للمشروع دون خصم. والأرقام مقرّبة لأغراض العرض.",
    "Project cash flow": "التدفق النقدي للمشروع",
    "Cost and revenue by year, with the cumulative project position drawn over them.":
      "التكاليف والإيرادات سنويًا، مع المركز التراكمي للمشروع مرسومًا فوقها.",
    "Equity and debt": "حقوق الملكية والدين",
    "How the project was funded, and the cumulative equity position drawn over it.":
      "كيف مُوّل المشروع، مع المركز التراكمي لحقوق الملكية مرسومًا فوقه.",
    "Debt drawn": "الدين المسحوب",
    "Debt repaid": "الدين المسدَّد",
    "Distributions": "التوزيعات",

    /* Investment metrics */
    "Metric": "المؤشر", "Value": "القيمة", "Definition": "التعريف",
    "Project NPV": "القيمة الحالية الصافية للمشروع",
    "Project ROI": "العائد على الاستثمار للمشروع",
    "Equity payback": "استرداد حقوق الملكية",
    "Profit margin": "هامش الربح",
    "Loan to cost, as set": "نسبة الدين إلى التكلفة كما حُدِّدت",
    "Annualised return on all capital employed, before the effect of debt.":
      "العائد السنوي على كامل رأس المال المستخدم، قبل أثر الدين.",
    "Annualised return to the equity holder after debt is serviced.":
      "العائد السنوي لحامل حقوق الملكية بعد خدمة الدين.",
    "Value of the unlevered cash flows discounted at the target rate, less the capital they require.":
      "قيمة التدفقات غير المرفوعة مخصومة بالمعدل المستهدف، مطروحًا منها رأس المال الذي تتطلبه.",
    "The same measure applied to the equity cash flows alone.":
      "المقياس نفسه مطبَّقًا على تدفقات حقوق الملكية وحدها.",
    "Total gain expressed as a proportion of capital employed, without regard to timing.":
      "إجمالي المكسب كنسبة من رأس المال المستخدم، بصرف النظر عن التوقيت.",
    "The same proportion measured on equity alone.": "النسبة نفسها مقيسة على حقوق الملكية وحدها.",
    "Every riyal of equity returns this many riyals in total.":
      "كل ريال من حقوق الملكية يعود بهذا العدد من الريالات إجمالًا.",
    "Net profit as a share of total revenue.": "صافي الربح كنسبة من إجمالي الإيرادات.",
    "The month in which cumulative equity distributions first equal contributions.":
      "الشهر الذي تتساوى فيه التوزيعات التراكمية مع المساهمات لأول مرة.",
    "The largest amount of equity outstanding at any one point.":
      "أكبر مبلغ من حقوق الملكية قائم في أي لحظة.",
    "The highest facility balance reached during the draw period.":
      "أعلى رصيد للتسهيل بلغه المشروع خلال فترة السحب.",
    "Peak debt as a proportion of total investment.": "ذروة الدين كنسبة من إجمالي الاستثمار.",
    "Operating income divided by interest, measured once the asset has stabilised. Reported in place of a debt service cover ratio because the facility is a revolving cash sweep with no amortisation schedule.":
      "الدخل التشغيلي مقسومًا على الفائدة، مقيسًا بعد استقرار الأصل. ويُعرض بدلًا من نسبة تغطية خدمة الدين لأن التسهيل عبارة عن كنس نقدي متجدد بلا جدول إطفاء.",

    /* Waterfall */
    "Distribution by party": "التوزيع حسب الطرف",
    "Party": "الطرف", "Contributed": "المساهَم به", "Distributed": "الموزَّع",
    "Limited partners": "الشركاء المحدودون",
    "All partners": "جميع الشركاء",
    "Waterfall tiers": "شرائح الشلال",
    "Share of distributions": "الحصة من التوزيعات",
    "Settled": "نسبة السداد",
    "Measured against": "مقيسة على",
    "Capital is returned first, then the preferred return accrues and is paid, and only the surplus above both is split. Settled shows how much of each claim the tier actually discharged — the rest is still owed.":
      "يُعاد رأس المال أولًا، ثم يستحق العائد التفضيلي ويُدفع، ولا يُقسَّم إلا الفائض فوقهما. ويبيّن عمود نسبة السداد مقدار ما سدّدته كل شريحة فعليًا من استحقاقها — والباقي ما يزال مستحقًا.",
    "Capital called from all partners, {v}": "رأس المال المستدعى من جميع الشركاء، {v}",
    "Contributed and distributed are net within each month: where a partner is called for capital and paid a fee in the same month, only the difference appears. This affects the general partner, who receives the management fees.":
      "المساهَم به والموزَّع يُحتسبان بالصافي داخل كل شهر: فحين يُستدعى شريك لرأس مال وتُدفع له رسوم في الشهر نفسه، لا يظهر إلا الفرق. ويسري ذلك على الشريك العام الذي يتقاضى رسوم الإدارة.",
    "Preferred return earned over the life, {v} — of which {o} remains unpaid":
      "العائد التفضيلي المستحق خلال عمر الصندوق، {v} — منه {o} ما يزال غير مدفوع",
    "No preferred return accrued": "لم يستحق أي عائد تفضيلي",
    "Payable in full — every riyal of preferred return was paid":
      "مستحقة بالكامل — دُفع كل ريال من العائد التفضيلي",
    "Not payable — the preferred return was not met in full, so the reserve went to the investors instead":
      "غير مستحقة — لم يُستوفَ العائد التفضيلي بالكامل، فذهب المخصص إلى المستثمرين بدلًا من ذلك",
    "The surplus above capital and preferred return — a balance, not a claim to settle":
      "الفائض فوق رأس المال والعائد التفضيلي — رصيد لا استحقاق يُسدَّد",
    "Total distributed": "إجمالي الموزَّع",
    "Total through the waterfall": "الإجمالي عبر الشلال",
    "Capital is returned first, then the preferred return accrues and is paid, and only the surplus above both is split.":
      "يُعاد رأس المال أولًا، ثم يستحق العائد التفضيلي ويُدفع، ولا يُقسَّم إلا الفائض فوقهما.",
    "Tier": "الشريحة",
    "Return of capital": "إعادة رأس المال",
    "Preferred return": "العائد التفضيلي",
    "Performance fee to GP": "رسوم الأداء للشريك العام",
    "Residual, pro rata": "المتبقي بالتناسب",
    "Fees": "الرسوم",
    "Fee": "الرسم", "Recipient": "المستفيد",
    "Subscription fee": "رسوم الاشتراك",
    "Asset management fee": "رسوم إدارة الأصول",
    "Development fee": "رسوم التطوير",
    "Performance fee": "رسوم الأداء",
    "Total fees": "إجمالي الرسوم",
    "The preferred return was not achieved over the fund's life, so no performance fee is payable to the general partner.":
      "لم يتحقق العائد التفضيلي خلال عمر الصندوق، فلا تستحق أي رسوم أداء للشريك العام.",
    "Developer": "المطوّر",
    "General partner": "الشريك العام",

    /* Risk register */
    "Severity": "الدرجة", "Finding": "الملاحظة",
    "Critical": "حرجة", "Caution": "تنبيه", "Confirmed": "مؤكَّدة",
    "The model raised {d} critical flags, {w} cautions and {s} confirmations on these inputs. Each is listed below with the condition that produced it.":
      "أثار النموذج {d} تنبيهات حرجة و{w} تنبيهات تحذيرية و{s} تأكيدات على هذه المدخلات. وفيما يلي كل منها مع الشرط الذي أنتجه.",

    /* Sensitivity */
    "Each driver below was flexed ±10% in isolation and the study re-run. The drivers are ordered by the spread they open in equity IRR — the ones at the top are where estimating error costs most.":
      "جرى تحريك كل محرّك أدناه بنسبة ±١٠٪ على حدة وأُعيد تشغيل الدراسة. والمحرّكات مرتبة حسب الفارق الذي تُحدثه في معدل العائد على الملكية — فالأعلى هي التي يكلّف الخطأ في تقديرها أكثر.",
    "Equity IRR sensitivity": "حساسية العائد على حقوق الملكية",
    "Driver sensitivity, ±10%": "حساسية المحرّكات، ±١٠٪",
    "Driver": "المحرّك",
    "IRR at −10%": "العائد عند −١٠٪", "Base IRR": "العائد الأساس", "IRR at +10%": "العائد عند +١٠٪",
    "The equity IRR has no solution on this study, so the drivers are measured against profit instead. Each was flexed ±10% in isolation and the study re-run; the ones at the top are where estimating error costs most.":
      "لا يوجد حل لمعدل العائد على الملكية في هذه الدراسة، لذا تُقاس المحرّكات مقابل الربح بدلاً منه. جرى تحريك كل محرّك بنسبة ±١٠٪ على حدة وأُعيد تشغيل الدراسة؛ والأعلى هي التي يكلّف الخطأ في تقديرها أكثر.",
    "Profit at −10%": "الربح عند −١٠٪", "Profit at +10%": "الربح عند +١٠٪",
    "Spread": "الفارق",
    "Downside": "السيناريو المتشائم", "Base": "الأساس", "Upside": "السيناريو المتفائل",
    "Downside applies a 10% fall in price, a 5% rise in cost, a 3% fall in occupancy and a three-month delay. Upside mirrors it. Base is the study as modelled.":
      "يطبّق السيناريو المتشائم انخفاضًا ١٠٪ في السعر وارتفاعًا ٥٪ في التكلفة وانخفاضًا ٣٪ في الإشغال وتأخيرًا ثلاثة أشهر. ويعكسه السيناريو المتفائل. أما الأساس فهو الدراسة كما نُمذجت.",
    "Scenario": "السيناريو",
    "Monte Carlo simulation": "محاكاة مونت كارلو",
    "{n} trials, each shocking price, cost, occupancy and construction duration together. Probabilities are measured on the {s} trials that required equity and therefore produced a defined IRR.":
      "{n} محاولة، تُصدم في كل منها الأسعار والتكاليف والإشغال ومدة الإنشاء معًا. وتُقاس الاحتمالات على {s} محاولة استلزمت حقوق ملكية ومن ثم أنتجت عائدًا معرّفًا.",
    "Measure": "المقياس", "P50 (median)": "الوسيط P50",
    "Probability": "الاحتمال",
    "Trials returning a positive IRR": "المحاولات التي حققت عائدًا موجبًا",
    "Trials clearing the {h} hurdle": "المحاولات التي تجاوزت عتبة {h}",
    "Distribution of simulated equity IRR": "توزيع العائد المحاكى على حقوق الملكية",
    "Land price / m²": "سعر الأرض / م²",
    "Soft costs %": "التكاليف غير المباشرة ٪",
    "Contingency %": "الاحتياطي ٪",
    "Construction duration": "مدة الإنشاء",
    "Component": "المكوّن",
    "build cost": "تكلفة البناء", "price/m²": "السعر/م²", "price/unit": "السعر/وحدة", "rent/m²": "الإيجار/م²",

    /* Strengths */
    "Strengths": "نقاط القوة",
    "Return clears the target hurdle": "العائد يتجاوز العتبة المستهدفة",
    "Equity IRR of {irr} exceeds the {hurdle} discount rate set for this study, leaving {gap} of headroom.":
      "معدل العائد على الملكية {irr} يتجاوز معدل الخصم {hurdle} المحدد لهذه الدراسة، بفارق {gap}.",
    "Positive net present value": "قيمة حالية صافية موجبة",
    "Discounted at {hurdle}, the equity position creates {npv} of value above the cost of capital.":
      "بالخصم عند {hurdle}، يخلق مركز حقوق الملكية قيمة قدرها {npv} فوق تكلفة رأس المال.",
    "Healthy margin on revenue": "هامش صحي على الإيرادات",
    "Net profit of {profit} on {rev} of revenue is a margin of {margin}.":
      "صافي ربح {profit} على إيرادات {rev} يمثل هامشًا قدره {margin}.",
    "Conservative financing structure": "هيكل تمويل متحفّظ",
    "Peak debt of {debt} is {ltc} of total investment, below the 60% level at which lenders typically begin to price additional risk.":
      "ذروة دين قدرها {debt} تمثل {ltc} من إجمالي الاستثمار، دون مستوى ٦٠٪ الذي يبدأ المقرضون عنده عادةً بتسعير مخاطر إضافية.",
    "Self-funding through the cycle": "تمويل ذاتي طوال الدورة",
    "Income and debt covered every outflow, so the scheme never required an equity injection.":
      "غطّى الدخل والدين كل التدفقات الخارجة، فلم يحتج المشروع إلى ضخ حقوق ملكية.",
    "Comfortable interest cover": "تغطية فائدة مريحة",
    "Operating income covers interest {x}× once the asset stabilises.":
      "يغطي الدخل التشغيلي الفائدة {x}× بعد استقرار الأصل.",
    "Capital returns inside half the horizon": "استرداد رأس المال خلال نصف الأفق",
    "Equity is recovered in month {m} of a {h}-month analysis period.":
      "تُسترد حقوق الملكية في الشهر {m} من فترة تحليل مدتها {h} شهرًا.",
    "Diversified revenue base": "قاعدة إيرادات متنوعة",
    "{n} distinct components spread income across more than one product and demand pool.":
      "{n} مكوّنات متمايزة توزّع الدخل على أكثر من منتج وأكثر من شريحة طلب.",
    "Land held on lease rather than purchased": "الأرض بحق انتفاع لا بالشراء",
    "Ground rent of {rent} over the term replaces an outright land purchase, which lowers the capital the project must raise up front.":
      "إيجار أرض قدره {rent} خلال المدة يحل محل شراء الأرض بالكامل، ما يخفض رأس المال المطلوب مقدمًا.",
    "Value realised at exit": "قيمة محققة عند التخارج",
    "A terminal disposal of {exit} converts the stabilised income into recoverable capital.":
      "تخارج نهائي بقيمة {exit} يحوّل الدخل المستقر إلى رأس مال قابل للاسترداد.",

    /* Weaknesses */
    "Weaknesses": "نقاط الضعف",
    "Return below the target hurdle": "العائد دون العتبة المستهدفة",
    "Equity IRR of {irr} falls short of the {hurdle} discount rate by {gap}.":
      "معدل العائد على الملكية {irr} يقصُر عن معدل الخصم {hurdle} بمقدار {gap}.",
    "Return could not be solved": "تعذّر حساب العائد",
    "The equity cashflow does not change sign, which means contributions are never recovered — no internal rate of return exists.":
      "لا يغيّر التدفق النقدي لحقوق الملكية إشارته، ما يعني عدم استرداد المساهمات إطلاقًا — فلا وجود لمعدل عائد داخلي.",
    "Negative net present value": "قيمة حالية صافية سالبة",
    "Discounted at {hurdle}, the equity position destroys {npv} of value against the cost of capital.":
      "بالخصم عند {hurdle}، يُهدر مركز حقوق الملكية قيمة قدرها {npv} مقابل تكلفة رأس المال.",
    "The scheme runs at a loss": "المشروع يحقق خسارة",
    "Revenue of {rev} does not cover {cost} of cost and finance charges.":
      "إيرادات قدرها {rev} لا تغطي {cost} من التكاليف وأعباء التمويل.",
    "Thin margin on revenue": "هامش ضعيف على الإيرادات",
    "A margin of {margin} leaves little absorption for cost overrun or price softening.":
      "هامش قدره {margin} لا يترك مجالًا يُذكر لامتصاص تجاوز التكاليف أو تراجع الأسعار.",
    "High leverage": "رافعة مالية مرتفعة",
    "Peak debt of {debt} is {ltc} of total investment, which magnifies the effect of any rate move or delay.":
      "ذروة دين قدرها {debt} تمثل {ltc} من إجمالي الاستثمار، ما يضخّم أثر أي تحرك في الفائدة أو أي تأخير.",
    "Slow capital recovery": "بطء استرداد رأس المال",
    "Equity is not recovered until month {m} of a {h}-month horizon, leaving capital exposed for most of the project's life.":
      "لا تُسترد حقوق الملكية حتى الشهر {m} من أفق مدته {h} شهرًا، ما يُبقي رأس المال معرّضًا طوال معظم عمر المشروع.",
    "Tight interest cover": "تغطية فائدة ضيقة",
    "Operating income covers interest only {x}×, which is close to the point at which the facility cannot be serviced from the asset.":
      "يغطي الدخل التشغيلي الفائدة {x}× فقط، وهو قريب من الحد الذي يتعذّر عنده خدمة التسهيل من الأصل.",
    "Contingency below convention": "احتياطي دون المتعارف عليه",
    "A {c} contingency is thinner than the 5–10% normally carried through construction.":
      "احتياطي قدره {c} أقل من نطاق ٥–١٠٪ المعتاد حمله خلال الإنشاء.",
    "Soft costs look understated": "التكاليف غير المباشرة تبدو منخفضة",
    "Design, consultants and project management at {s} of construction sit below the 10–15% ordinarily observed.":
      "التصميم والاستشاريون وإدارة المشروع عند {s} من الإنشاء تقع دون نطاق ١٠–١٥٪ المعتاد.",
    "Single-product exposure": "انكشاف على منتج واحد",
    "All revenue derives from one component, so the scheme carries no internal diversification.":
      "كل الإيرادات تأتي من مكوّن واحد، فلا يحمل المشروع أي تنويع داخلي.",

    /* Opportunities */
    "Opportunities": "الفرص",
    "Unallocated land remains": "بقيت أرض غير مخصصة",
    "{pct} of the site — about {area} m² — carries no component. It is available for a further phase, for public realm, or for density the current program does not use.":
      "{pct} من الموقع — نحو {area} م² — لا يحمل أي مكوّن، وهو متاح لمرحلة لاحقة أو لمرافق عامة أو لكثافة لا يستخدمها البرنامج الحالي.",
    "Capacity for additional leverage": "قدرة على رافعة إضافية",
    "At {ltc} of total investment the facility is well inside conventional limits, so more debt could be drawn to lift the return on equity.":
      "عند {ltc} من إجمالي الاستثمار يقع التسهيل داخل الحدود المتعارف عليها بمريح، فيمكن سحب دين إضافي لرفع العائد على حقوق الملكية.",
    "An exit is not currently priced in": "لم تُسعَّر قيمة تخارج حاليًا",
    "The model holds the income-producing element to the end of the horizon without a disposal. Setting an exit cap rate would show what a sale is worth.":
      "يحتفظ النموذج بالعنصر المدرّ للدخل حتى نهاية الأفق دون تخارج. وتحديد معدل رسملة للتخارج سيُظهر قيمة البيع.",
    "Developable share could be tested": "يمكن اختبار الحصة القابلة للتطوير",
    "Only {pct} of the gross site is treated as developable. A masterplan that lifts that share would spread the land cost over more saleable area.":
      "يُعامَل {pct} فقط من الموقع الإجمالي كقابل للتطوير. ومخطط رئيسي يرفع هذه الحصة سيوزّع تكلفة الأرض على مساحة قابلة للبيع أكبر.",
    "Sales could start earlier": "يمكن بدء البيع مبكرًا",
    "Sales begin in month {m}, after the {p}-month pre-construction period. Releasing earlier would pull revenue forward and reduce the peak funding requirement.":
      "يبدأ البيع في الشهر {m} بعد فترة ما قبل الإنشاء ومدتها {p} شهرًا. والطرح مبكرًا سيقدّم الإيرادات ويخفض ذروة الاحتياج التمويلي.",
    "A fund structure has not been modelled": "لم يُنمذج هيكل صندوق",
    "The study reports the project on its own balance sheet. Modelling an LP / GP structure would show how the return divides between sponsor and investor.":
      "تعرض الدراسة المشروع على ميزانيته الخاصة. ونمذجة هيكل شريك محدود / شريك عام ستُظهر كيف ينقسم العائد بين الراعي والمستثمر.",
    "Density has room to move": "لدى الكثافة مجال للزيادة",
    "The program does not exhaust the site's allocation, so additional gross floor area could be tested against the same land cost.":
      "لا يستنفد البرنامج تخصيص الموقع، فيمكن اختبار مساحة طابقية إجمالية إضافية مقابل تكلفة الأرض نفسها.",

    /* Risk factors */
    "Risk factors": "عوامل المخاطرة",
    "Downside case": "الحالة المتشائمة",
    "A 10% adverse move in price, cost and absorption together with a three-month construction delay takes profit to {p} and equity IRR to {i}.":
      "تحرك معاكس بنسبة ١٠٪ في السعر والتكلفة والامتصاص مع تأخير إنشائي ثلاثة أشهر يأخذ الربح إلى {p} والعائد على الملكية إلى {i}.",
    "Interest rate exposure": "الانكشاف على سعر الفائدة",
    "Debt peaks at {debt} and total finance charges are {int}. A one-point rise in the {r} rate is felt across the whole draw period.":
      "يبلغ الدين ذروته عند {debt} وإجمالي أعباء التمويل {int}. وارتفاع نقطة واحدة عن معدل {r} يُحسّ أثره طوال فترة السحب.",
    "A {n}-month build carries the scheme through more of the cycle than a shorter programme, and extends the window over which cost inflation applies.":
      "بناء مدته {n} شهرًا يعبر بالمشروع جزءًا أكبر من الدورة مقارنة ببرنامج أقصر، ويمدّد النافذة التي يسري عليها تضخم التكاليف.",
    "Letting and occupancy": "التأجير والإشغال",
    "Gross income of {g} depends on the occupancy assumed for the leased element. Income is the first thing to move if absorption is slower than planned.":
      "دخل إجمالي قدره {g} يعتمد على الإشغال المفترض للعنصر المؤجَّر. والدخل أول ما يتحرك إذا كان الامتصاص أبطأ من المخطط.",
    "Exit pricing": "تسعير التخارج",
    "{exit} of the total return is a terminal value set by a capitalisation rate. Yield expansion between now and disposal reduces it directly.":
      "{exit} من إجمالي العائد قيمة نهائية يحددها معدل رسملة. وأي اتساع في العائد المطلوب حتى التخارج يخفضها مباشرة.",
    "Simulated dispersion": "تشتت المحاكاة",
    "Across {n} trials that required equity, {p} returned a positive IRR and {h} cleared the hurdle. The tenth percentile outcome is {p10}.":
      "من بين {n} محاولة استلزمت حقوق ملكية، حققت {p} عائدًا موجبًا وتجاوزت {h} العتبة. ونتيجة المئين العاشر هي {p10}.",
    "Ground rent obligation": "التزام إيجار الأرض",
    "Rent of {rent} accrues over the term whether or not the asset performs, and it is payable ahead of any return to capital.":
      "يستحق إيجار قدره {rent} خلال المدة سواء أدّى الأصل أم لا، ويُدفع قبل أي عائد لرأس المال.",
    "Peak capital at risk": "ذروة رأس المال المعرّض",
    "The most capital exposed at any one time is {pe}, which is the figure a sponsor must be able to fund before any of it comes back.":
      "أكبر رأس مال معرّض في أي لحظة هو {pe}، وهو المبلغ الذي يجب أن يقدر الراعي على تمويله قبل عودة أي جزء منه.",

    /* Empty states */
    "No strength test was met on these inputs.": "لم يتحقق أي اختبار قوة على هذه المدخلات.",
    "No weakness test was triggered on these inputs.": "لم يُفعَّل أي اختبار ضعف على هذه المدخلات.",
    "No opportunity test was met on these inputs.": "لم يتحقق أي اختبار فرصة على هذه المدخلات.",
    "No risk factor test was triggered on these inputs.": "لم يُفعَّل أي اختبار مخاطرة على هذه المدخلات.",

    /* Recommendation bodies */
    "The scheme clears its return target with margin, creates value on a discounted basis, and carries no red flag on the risk register. On the assumptions set out in this report it supports a decision to proceed.":
      "يتجاوز المشروع هدف العائد بهامش، ويخلق قيمة على أساس مخصوم، ولا يحمل أي تنبيه حرج في سجل المخاطر. ووفق الفرضيات الواردة في هذا التقرير فإنه يدعم قرار المضي قدمًا.",
    "The scheme meets its return target and creates value on a discounted basis. The margin over the hurdle is not wide, so the conditions below should be satisfied before capital is committed.":
      "يحقق المشروع هدف العائد ويخلق قيمة على أساس مخصوم. غير أن الهامش فوق العتبة ليس واسعًا، لذا ينبغي استيفاء الشروط أدناه قبل الالتزام برأس المال.",
    "The scheme creates value but does not clear the return target on the current assumptions. It merits further work on the inputs carrying the most sensitivity before a commitment is made.":
      "يخلق المشروع قيمة لكنه لا يتجاوز هدف العائد وفق الفرضيات الحالية. ويستحق مزيدًا من العمل على المدخلات الأكثر حساسية قبل اتخاذ أي التزام.",
    "The scheme returns capital but falls short of the target and shows material risk. The structure — programme, price, cost or financing — should be revised and the study re-run before it is taken further.":
      "يعيد المشروع رأس المال لكنه يقصُر عن الهدف ويُظهر مخاطر جوهرية. وينبغي مراجعة الهيكل — البرنامج أو السعر أو التكلفة أو التمويل — وإعادة تشغيل الدراسة قبل المضي به أبعد.",
    "On the inputs modelled the scheme does not recover its capital at an acceptable return. It should not be progressed without a material change to the assumptions on which it rests.":
      "وفق المدخلات المنمذجة لا يسترد المشروع رأس ماله بعائد مقبول. ولا ينبغي المضي به دون تغيير جوهري في الفرضيات التي يقوم عليها.",

    /* Appendix */
    "Assumptions and input parameters": "الفرضيات ومعاملات الإدخال",
    "Parameter": "المعامل",
    "Applied to": "يُطبَّق على",
    "Each percentage is applied to the basis named in the third column. Rates are annual unless stated.":
      "تُطبَّق كل نسبة على الأساس المذكور في العمود الثالث. والمعدلات سنوية ما لم يُذكر خلاف ذلك.",
    "Gross land area. Not charged on a leasehold site.":
      "مساحة الأرض الإجمالية. لا تُحتسب على أرض بحق انتفاع.",
    "The land purchase price. Not charged on a leasehold site.":
      "سعر شراء الأرض. لا تُحتسب على أرض بحق انتفاع.",
    "Gross land area, each year of the term. Leasehold only.":
      "مساحة الأرض الإجمالية، عن كل سنة من المدة. لحق الانتفاع فقط.",
    "Interval between ground rent reviews.": "الفترة الفاصلة بين مراجعات إيجار الأرض.",
    "The rent then in force, compounded at each review.":
      "الإيجار الساري حينها، مركَّبًا عند كل مراجعة.",
    "Gross land area. Spent alongside site works during construction.":
      "مساحة الأرض الإجمالية. تُنفَق مع أعمال الموقع أثناء الإنشاء.",
    "Construction cost plus site works.": "تكلفة الإنشاء زائد أعمال الموقع.",
    "Construction plus site works plus soft costs.":
      "الإنشاء زائد أعمال الموقع زائد التكاليف غير المباشرة.",
    "Sales revenue only. Raises nothing on a wholly leased scheme.":
      "إيرادات البيع فقط. لا تُحصّل شيئًا في مشروع مؤجَّر بالكامل.",
    "Development cost before finance — land, transfer fees, construction, site works, soft costs and contingency. Sets the facility limit, not the amount drawn.":
      "تكلفة التطوير قبل التمويل — الأرض ورسوم النقل والإنشاء وأعمال الموقع والتكاليف غير المباشرة والاحتياطي. تحدّد سقف التسهيل لا المبلغ المسحوب.",
    "Annual, charged monthly on the outstanding balance at the twelfth root of the annual rate.":
      "سنوي، يُحتسب شهريًا على الرصيد القائم بالجذر الثاني عشر للمعدل السنوي.",
    "Annual. Discounts the cash flows for NPV, and is the hurdle every return is judged against.":
      "سنوي. يُخصم به التدفق النقدي لحساب القيمة الحالية، وهو العتبة التي يُقاس عليها كل عائد.",
    "Developable share": "الحصة القابلة للتطوير",
    "Gross land area. The remainder carries no buildable programme.":
      "مساحة الأرض الإجمالية. والباقي لا يحمل برنامجًا قابلًا للبناء.",
    "Unlevered: revenue less development cost, before any financing. Figures are rounded for presentation; the full amounts are in the Cost and Revenue sections.":
      "غير مرفوع: الإيرادات ناقص تكلفة التطوير، قبل أي تمويل. والأرقام مقرّبة لأغراض العرض، والمبالغ الكاملة في قسمَي التكاليف والإيرادات.",
    "Land price per m²": "سعر الأرض للمتر المربع",
    "Ground rent per m² per year": "إيجار الأرض للمتر المربع سنويًا",
    "Rent review period": "دورة مراجعة الإيجار",
    "Rent escalation at review": "نسبة التصعيد عند المراجعة",
    "Site infrastructure per m²": "البنية التحتية للمتر المربع",
    "Discount rate / hurdle": "معدل الخصم / العتبة",
    "Fund terms": "شروط الصندوق",
    "Term": "الشرط",
    "Limited partner equity": "حقوق الشركاء المحدودين",
    "Developer co-investment": "مشاركة المطوّر",
    "General partner co-investment": "مشاركة الشريك العام",
    "Asset management fee per year": "رسوم إدارة الأصول سنويًا",
    "Performance split to GP": "حصة الأداء للشريك العام",
    "How the score was calculated": "كيف احتُسبت الدرجة",
    "The composite score is the sum of five components, each capped at its own maximum and computed only from figures printed elsewhere in this report. It is a summary of those figures, not an additional judgement about them.":
      "الدرجة المركّبة هي مجموع خمسة مكوّنات، لكل منها حد أقصى خاص، وتُحتسب حصريًا من أرقام مطبوعة في مواضع أخرى من هذا التقرير. وهي تلخيص لتلك الأرقام لا حكم إضافي عليها.",
    "Maximum": "الحد الأقصى",
    "Return vs hurdle": "العائد مقابل العتبة",
    "IRR ÷ hurdle, credited in full at 1.5× and above": "العائد ÷ العتبة، يُحتسب كاملًا عند ١٫٥× فأعلى",
    "Value created per riyal of capital": "القيمة المخلوقة لكل ريال من رأس المال",
    "NPV ÷ capital at risk, credited in full at 0.50 and above": "القيمة الحالية ÷ رأس المال المعرّض، تُحتسب كاملة عند ٠٫٥٠ فأعلى",
    "Profit margin on revenue": "هامش الربح على الإيرادات",
    "Profit ÷ revenue, credited in full at 25% and above": "الربح ÷ الإيرادات، يُحتسب كاملًا عند ٢٥٪ فأعلى",
    "Speed of capital recovery": "سرعة استرداد رأس المال",
    "Proportion of the horizon remaining once capital is repaid": "نسبة ما تبقّى من الأفق بعد سداد رأس المال",
    "Risk register": "سجل المخاطر",
    "Ten points, less three per critical flag and one and a half per caution":
      "عشر نقاط، تُخصم ثلاث لكل تنبيه حرج ونقطة ونصف لكل تحذير",
    "Composite score": "الدرجة المركّبة",
    "Rating bands": "نطاقات التصنيف",
    "Rating": "التصنيف",
    "This scheme called no equity, so the return, value and payback components were measured at project level. An equity IRR is undefined when there is no equity series to solve — that is a property of a self-funding project, not a failure of it.":
      "لم يستدعِ هذا المشروع حقوق ملكية، لذا قيست مكوّنات العائد والقيمة والاسترداد على مستوى المشروع. والعائد على حقوق الملكية غير معرّف حين لا توجد سلسلة ملكية تُحل — وتلك خاصية مشروع ممول ذاتيًا لا إخفاق فيه.",
    "Basis of preparation": "أساس الإعداد",
    "Every figure in this report is produced by the platform's own calculation engine from the inputs listed above. Cash flows are modelled monthly and aggregated for presentation. Discounting is monthly at the rate stated. No figure has been adjusted, rounded up, or supplied from outside the model, and no part of this document was generated by a language model — the narrative is assembled from fixed templates selected by the rules printed in this appendix, so the same inputs will always produce the same report.":
      "كل رقم في هذا التقرير ناتج عن محرك الحساب الخاص بالمنصة من المدخلات المدرجة أعلاه. وتُنمذَج التدفقات النقدية شهريًا وتُجمَّع للعرض، ويجري الخصم شهريًا بالمعدل المذكور. ولم يُعدَّل أي رقم أو يُقرَّب صعودًا أو يُستمد من خارج النموذج، ولم يُنتَج أي جزء من هذه الوثيقة بنموذج لغوي — بل يُجمَّع السرد من قوالب ثابتة تختارها القواعد المطبوعة في هذا الملحق، ومن ثم تُنتج المدخلات نفسها التقرير نفسه دائمًا.",
    "This is an indicative analysis for screening and decision support. It is not an accredited valuation and not a substitute for one where a licensed valuer, a physical inspection or a regulated report is required.":
      "هذا تحليل استرشادي لأغراض الفرز ودعم القرار. وليس تقييمًا معتمدًا ولا بديلًا عنه حيثما يُشترط مقيّم مرخّص أو معاينة ميدانية أو تقرير خاضع للتنظيم.",
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
    [/^Horizon auto-sized to (\d+) months \((.+) yrs\) — predesign \+ construction \+ sell-down \/ hold, ending on the last trading month\.$/, "الأفق محسوب تلقائيًا: $1 شهرًا ($2 سنة) — التصميم + الإنشاء + البيع/التشغيل، وينتهي في آخر شهر تشغيلي."],
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

    /* Valuation — build-up ledger rows (interpolated, so they never match the dictionary) */
    [/^− Vacancy \((.+)\)$/, "− الشواغر ($1)"],
    [/^− Operating costs \((.+)\)$/, "− مصاريف التشغيل ($1)"],
    [/^÷ Cap rate (.+)$/, "÷ معدل الرسملة $1"],
    [/^− Depreciation \((.+) · eff\. age (.+) yrs\)$/, "− الإهلاك ($1 · العمر الفعلي $2 سنة)"],
    [/^× ([\d.,]+) (م²|m²)$/, "× $1 $2"],
    [/^([\d.,]+%) divergence$/, "تباين $1"],

    /* Valuation — quality checks (interpolated) */
    [/^Only (\d+) comparables?$/, "عدد المقارنات $1 فقط"],
    [/^Comp (\d+) is heavily adjusted \((.+)\)$/, "العقار المقارن $1 خضع لتسوية كبيرة ($2)"],
    [/^Your adjusted comps span (.+) around the middle value\. Re-check the adjustments or replace outlier comps\.$/,
      "تتباعد مقارناتك بعد التسوية بنحو $1 حول القيمة الوسطى. راجع التسويات أو استبدل المقارنات الشاذة."],
    [/^(.+) is outside the typical 4–12% band for income property in the region\.$/,
      "$1 خارج النطاق المعتاد 4–12% للعقارات المدرّة للدخل في المنطقة."],
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
