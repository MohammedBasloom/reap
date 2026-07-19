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
    "Mohammed Basloom": "محمد بصلوم",
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
    "Efficiency": "الكفاءة", "NSA / GFA": "الصافي / الإجمالي",
    "FAR": "معامل البناء FAR", "Land coverage": "نسبة تغطية الأرض", "Max floors": "عدد الأدوار",
    "Upper-floor coverage": "تغطية الأدوار العليا", "Last floor": "الدور الأخير",
    "Built-up cost": "تكلفة البناء", "Site work (incl. setbacks)": "أعمال الموقع (مع الارتدادات)",
    "Basement coverage": "تغطية القبو", "Basement cost": "تكلفة القبو",
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
    "Reset": "إعادة تعيين", "Export": "تصدير", "Print": "طباعة",
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
    "Equity · Levered": "الملكية · بعد التمويل", "Project · Unlevered": "المشروع · قبل التمويل",
    "IRR": "IRR", "Multiple": "المضاعف", "Payback": "فترة الاسترداد",
    "Cumulative cashflow — equity vs project": "التدفق التراكمي — الملكية مقابل المشروع",
    "Profit decomposition": "تفكيك الربح", "Revenue → Profit waterfall": "شلال الإيراد → الربح",
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
    "Time adj.": "تسوية الزمن", "Total adj.": "إجمالي التسوية", "Adjusted SAR/m²": "ريال/م² بعد التسوية",
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
    "m²": "م²", "SAR": "ريال", "SAR/m²": "ريال/م²", "mo": "شهر", "yrs": "سنة",
    "Mode": "النمط", "Timing": "التوقيت", "Exit cap": "رسملة التخارج", "Exit value": "قيمة التخارج",
    "Price / Rent": "السعر / الإيجار", "Gross / NOI": "الإجمالي / الصافي", "Units / Keys": "وحدات / مفاتيح",
  };

  const t = (s) => {
    if (typeof s !== "string") return s;
    if (lang === "en") return s;
    if (D[s] !== undefined) return D[s];
    const trimmed = s.trim();
    if (D[trimmed] !== undefined) {
      // preserve leading/trailing whitespace around the translated core
      return s.replace(trimmed, D[trimmed]);
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
