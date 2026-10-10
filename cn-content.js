/* Cabinet Numismatique: reference content. Arrays are [français, English, العربية]. */
(function (root) {
  "use strict";
  const CN = root.CN || (root.CN = {});

  CN.GRADE_INFO = {
    G: { name: ["AB · Assez beau", "Good", "مقبولة"],
      coin: ["Très usée ; contours et légendes principales visibles, peu de détails.", "Heavily worn; outline and main legends visible, little detail.", "متآكلة بشدة؛ الحدود والكتابات الرئيسية ظاهرة مع قليل من التفاصيل."],
      note: ["Mou, très circulé, nombreux plis, petites déchirures possibles.", "Limp and heavily circulated, many folds, possible small tears.", "رخوة وكثيرة التداول، بطيّات عديدة وربما تمزقات صغيرة."] },
    VG: { name: ["B · Beau", "Very Good", "جيدة"],
      coin: ["Bien usée, mais les grands motifs restent nets et le grènetis est complet.", "Well worn, but the main design is clear and the rims are complete.", "متآكلة بوضوح، لكن النقوش الرئيسية واضحة والإطار مكتمل."],
      note: ["Bien circulé, papier souple, plis et salissures, mais complet.", "Well circulated, soft paper, folds and soiling, but intact.", "متداولة كثيرًا، ورق ليّن مع طيّات واتساخ، لكنها سليمة."] },
    F: { name: ["TB · Très beau", "Fine", "جيدة جدًا"],
      coin: ["Usure moyenne et régulière ; légendes nettes, une partie des détails visible.", "Moderate, even wear; legends sharp, some inner detail visible.", "تآكل متوسط ومنتظم؛ الكتابات حادة وبعض التفاصيل ظاهرة."],
      note: ["Circulation nette, nombreux plis, le papier garde un peu de tenue.", "Clear circulation, many folds, paper still has some body.", "تداول واضح وطيّات كثيرة، والورق ما زال متماسكًا نوعًا ما."] },
    VF: { name: ["TTB · Très très beau", "Very Fine", "جميلة"],
      coin: ["Usure légère à moyenne sur les points hauts ; la plupart des détails sont nets.", "Light to moderate wear on the high points; most details sharp.", "تآكل خفيف إلى متوسط على النقاط العالية؛ ومعظم التفاصيل حادة."],
      note: ["Plusieurs plis (souvent 3 à 7), papier encore assez ferme, légère salissure.", "Several folds (often 3 to 7), paper still fairly crisp, light soiling.", "عدة طيّات (غالبًا من 3 إلى 7)، الورق ما زال متماسكًا مع اتساخ خفيف."] },
    XF: { name: ["SUP · Superbe", "Extremely Fine", "جميلة جدًا"],
      coin: ["Usure légère sur les seuls points les plus hauts ; traces de brillant.", "Light wear on the highest points only; traces of luster.", "تآكل خفيف على أعلى النقاط فقط؛ مع بقايا من اللمعان."],
      note: ["Jusqu’à trois plis légers, papier ferme, couleurs vives.", "Up to three light folds, crisp paper, bright colors.", "حتى ثلاث طيّات خفيفة، ورق متماسك وألوان زاهية."] },
    AU: { name: ["SPL · Splendide", "About Uncirculated", "شبه غير متداولة"],
      coin: ["Simple frottement sur les points hauts ; l’essentiel du brillant est présent.", "Only a trace of wear on the high points; most mint luster remains.", "أثر احتكاك طفيف على النقاط العالية؛ ومعظم لمعان السكّ باقٍ."],
      note: ["Un seul pli léger ou un coin corné ; sinon comme neuf.", "One light fold or corner bend; otherwise like new.", "طيّة خفيفة واحدة أو ثني في الزاوية، وإلا فهي كالجديدة."] },
    UNC: { name: ["FDC / NEUF", "Uncirculated", "غير متداولة / جديدة"],
      coin: ["Aucune usure : brillant de frappe intact, marques de contact possibles. Inclut les belles épreuves.", "No wear: full mint luster, contact marks possible. Includes proofs.", "بلا تآكل: لمعان السكّ كامل وقد توجد علامات احتكاك. يشمل السكّ المصقول."],
      note: ["Aucun pli ni manipulation visible ; papier craquant d’origine.", "No folds or visible handling; crisp original paper.", "بلا طيّات ولا آثار لمس؛ ورق أصلي متماسك."] },
  };

  CN.MATERIALS = [["gold", "mGold"], ["silver", "mSilver"], ["bronze", "mBronze"], ["nickel", "mNickel"], ["alu", "mAlu"], ["steel", "mSteel"], ["paper", "mPaper"], ["polymer", "mPolymer"], ["other", "mOther"]];

  CN.PROBES = [
    { id: "detail", kinds: ["coin", "other"], l: ["Reliefs détaillés", "Sharp high points", "تفاصيل النقش حادة"], tip: ["Cheveux, barbe, plumes ou feuillages encore détaillés sur les points les plus hauts.", "Hair, beard, feathers or leaves still detailed on the highest points.", "الشعر أو اللحية أو الريش أو الأوراق ما زالت مفصّلة على أعلى النقاط."] },
    { id: "legible", kinds: ["coin", "other"], l: ["Légendes lisibles", "Legends legible", "الكتابات مقروءة"], tip: ["Légendes et date entièrement lisibles.", "Legends and date fully legible.", "الكتابات والتاريخ مقروءة بالكامل."] },
    { id: "luster", kinds: ["coin", "other"], l: ["Brillant d’origine", "Original luster", "لمعان أصلي"], tip: ["Reflet de frappe visible quand on incline la pièce sous la lumière.", "Mint shine visible when you tilt the coin under light.", "بريق السكّ يظهر عند إمالة القطعة تحت الضوء."] },
    { id: "patina", kinds: ["coin", "other"], l: ["Patine naturelle", "Natural patina", "باتينا طبيعية"], tip: ["Coloration régulière formée avec le temps, sans zones frottées.", "Even toning formed over time, with no rubbed areas.", "تلوّن منتظم تكوّن مع الزمن دون مناطق مفروكة."] },
    { id: "cleaned", kinds: ["coin", "other"], l: ["Nettoyée / polie", "Cleaned / polished", "منظَّفة / ملمَّعة"], tip: ["Micro-rayures parallèles, éclat artificiel ou couleur trop uniforme.", "Fine parallel hairlines, unnatural shine or overly uniform color.", "خدوش دقيقة متوازية أو لمعان مصطنع أو لون موحّد أكثر من اللازم."] },
    { id: "marks", kinds: ["coin", "other"], l: ["Rayures / chocs", "Scratches / knocks", "خدوش / ضربات"], tip: ["Rayures visibles, chocs sur la tranche ou coups sur les champs.", "Visible scratches, rim knocks or dents in the fields.", "خدوش ظاهرة أو ضربات على الحافة أو انبعاجات."] },
    { id: "holed", kinds: ["coin", "other"], l: ["Trou / soudure", "Hole / solder", "ثقب / لحام"], tip: ["Trou, trace de monture ou de soudure (ancien bijou).", "Hole, mount or solder mark (ex-jewelry).", "ثقب أو أثر تركيب أو لحام (حلية سابقة)."] },
    { id: "corrosion", kinds: ["coin", "other"], l: ["Corrosion", "Corrosion", "تآكل كيميائي"], tip: ["Vert-de-gris, taches actives ou surface poreuse.", "Verdigris, active spots or a porous surface.", "زنجار أو بقع نشطة أو سطح مسامي."] },
    { id: "proof", kinds: ["coin", "other"], l: ["Belle épreuve (BE)", "Proof strike", "سكّ مصقول (بروف)"], tip: ["Champs miroir et reliefs mats, frappe soignée destinée aux collectionneurs.", "Mirror fields and frosted devices, struck for collectors.", "أرضية مرآوية ونقوش مطفأة، سكّ متقن للهواة."] },
    { id: "case", kinds: ["other"], l: ["Écrin / ruban", "Case / ribbon", "العلبة / الشريط"], tip: ["Écrin, ruban ou certificat d’origine conservés.", "Original case, ribbon or certificate kept.", "العلبة أو الشريط أو الشهادة الأصلية محفوظة."] },
    { id: "crisp", kinds: ["note"], l: ["Papier craquant", "Crisp paper", "ورق متماسك"], tip: ["Le papier « claque » et garde son apprêt d’origine.", "The paper snaps and keeps its original sheen.", "الورق متماسك ويحتفظ بلمعانه الأصلي."] },
    { id: "folds", kinds: ["note"], l: ["Plis", "Folds", "طيّات"], tip: ["Indiquez le nombre de plis dans les notes : c’est le premier critère de grade d’un billet.", "Give the number of folds in the notes: it is the first grading criterion for a note.", "اذكر عدد الطيّات في الملاحظات: إنها المعيار الأول لدرجة الورقة."] },
    { id: "pinholes", kinds: ["note"], l: ["Trous / déchirures", "Pinholes / tears", "ثقوب / تمزقات"], tip: ["Trous d’épingle, déchirures ou manques, même petits.", "Pinholes, tears or missing pieces, even small ones.", "ثقوب دبابيس أو تمزقات أو أجزاء ناقصة ولو صغيرة."] },
    { id: "stains", kinds: ["note"], l: ["Taches / écritures", "Stains / writing", "بقع / كتابات"], tip: ["Taches, rousseurs, encre ou inscriptions.", "Stains, foxing, ink or writing.", "بقع أو اصفرار أو حبر أو كتابات."] },
    { id: "repaired", kinds: ["note"], l: ["Réparé / rogné", "Repaired / trimmed", "مرمّم / مقصوص"], tip: ["Ruban adhésif, marges coupées ou restaurées.", "Tape, trimmed or restored margins.", "شريط لاصق أو هوامش مقصوصة أو مرمّمة."] },
    { id: "washed", kinds: ["note"], l: ["Lavé / repassé", "Washed / pressed", "مغسول / مكويّ"], tip: ["Papier trop plat, relief d’impression disparu, couleurs ternies.", "Paper too flat, no embossing left, faded colors.", "ورق مسطّح أكثر من اللازم، بلا بروز طباعي، وألوان باهتة."] },
    { id: "serial", kinds: ["note"], l: ["Numéro spécial", "Special serial", "رقم مميّز"], tip: ["Numéro bas, unis, radar, en échelle ou billet de remplacement ★.", "Low, solid, radar, ladder or replacement ★ serial.", "رقم منخفض أو متطابق أو رادار أو متسلسل أو ورقة بديلة ★."] },
    { id: "uv", kinds: ["note"], l: ["UV / fil / filigrane", "UV / thread / watermark", "UV / خيط / علامة مائية"], tip: ["Réaction sous UV, fil de sécurité ou filigrane différent : souvent une variété cataloguée.", "UV reaction, security thread or watermark variant: often a catalogued variety.", "تفاعل تحت الأشعة فوق البنفسجية أو خيط أمان أو علامة مائية مختلفة: غالبًا تنويعة مسجّلة."] },
  ];

  CN.GUIDE_VALUE = [
    { t: ["Rareté et tirage", "Rarity & mintage", "الندرة وحجم الإصدار"], d: ["Un faible tirage, une refonte massive ou un atelier peu actif rendent un millésime rare. Pour les billets, certaines combinaisons de signatures n’ont circulé que quelques mois.", "Low mintage, mass melting or a little-used mint make a date scarce. For notes, some signature combinations circulated for only a few months.", "قلّة الإصدار أو الصهر بكميات كبيرة أو قلّة نشاط دار السكّ تجعل السنة نادرة. وبعض تركيبات التوقيعات في الأوراق لم تُتداول إلا بضعة أشهر."] },
    { t: ["État de conservation", "Condition", "حالة الحفظ"], d: ["Deux grades d’écart peuvent multiplier le prix par dix sur un objet recherché. L’usure se lit d’abord sur les points hauts du relief, et les plis sur un billet.", "Two grades apart can mean a tenfold price gap on a sought-after item. Wear shows first on a coin’s high points, folds first on a note.", "فارق درجتين قد يعني تضاعف السعر عشر مرات للقطع المطلوبة. يظهر التآكل أولًا على أعلى نقاط النقش، والطيّات أولًا في الورقة."] },
    { t: ["Aspect et patine", "Eye appeal & patina", "المظهر والباتينا"], d: ["Une patine naturelle et homogène est un atout. Un objet nettoyé, poli, lavé ou repassé perd souvent la moitié de sa valeur : ne le frottez jamais.", "Even, natural toning adds appeal. A cleaned, polished, washed or pressed item often loses half its value, so never rub one.", "الباتينا الطبيعية المتجانسة ميزة. أما القطعة المنظَّفة أو الملمَّعة أو المغسولة أو المكويّة فتفقد غالبًا نصف قيمتها، فلا تفركها أبدًا."] },
    { t: ["Authenticité et certification", "Authenticity & certification", "الأصالة والتوثيق"], d: ["Les dates clés sont les plus contrefaites. Un objet certifié sous coque (PCGS, NGC, PMG) se vend plus vite et plus cher.", "Key dates are the most counterfeited. An item certified and encapsulated by PCGS, NGC or PMG sells faster and for more.", "السنوات المفتاحية هي الأكثر تزويرًا. والقطعة الموثّقة والمغلّفة لدى PCGS أو NGC أو PMG تُباع أسرع وبسعر أعلى."] },
    { t: ["Provenance", "Provenance", "المصدر"], d: ["Une provenance documentée (collection connue, trésor, ancienne vente) rassure les acheteurs et peut ajouter une prime.", "Documented provenance (a known collection, a hoard, an old sale) reassures buyers and can add a premium.", "المصدر الموثّق (مجموعة معروفة، كنز، مزاد قديم) يطمئن المشترين وقد يضيف علاوة."] },
    { t: ["Marché et métal", "Market & metal", "السوق وسعر المعدن"], d: ["Les pièces d’or et d’argent ont un plancher fixé par le cours du métal. La demande des collectionneurs suit les modes et la popularité des séries.", "Gold and silver coins have a floor set by bullion prices. Collector demand follows fashion and the popularity of a series.", "للقطع الذهبية والفضية حدّ أدنى يحدده سعر المعدن. ويتبع طلب الهواة الموضة وشعبية السلسلة."] },
  ];
  CN.GUIDE_NOTES = [
    { t: ["Numéros de série", "Serial numbers", "الأرقام التسلسلية"], d: ["Numéros bas (000001), unis (777777), radar (123321), en échelle (1234567) et billets de remplacement marqués d’une étoile ★ ou d’un préfixe spécial portent une prime.", "Low (000001), solid (777777), radar (123321) and ladder (1234567) serials, and replacement notes marked with a star ★ or a special prefix, carry a premium.", "الأرقام المنخفضة (000001) والمتطابقة (777777) والرادار (123321) والمتسلسلة (1234567) والأوراق البديلة المعلَّمة بنجمة ★ أو بادئة خاصة تحظى بعلاوة."] },
    { t: ["Signatures et variétés", "Signatures & varieties", "التوقيعات والتنويعات"], d: ["Un même billet existe souvent avec plusieurs signatures, fils de sécurité ou réactions UV. Ces variétés portent une lettre dans le catalogue Pick (P# 60b, 60c…).", "The same note often exists with several signatures, security threads or UV reactions. These varieties carry a letter in the Pick catalogue (P# 60b, 60c…).", "كثيرًا ما تصدر الورقة نفسها بتوقيعات أو خيوط أمان أو تفاعلات UV مختلفة. وتحمل هذه التنويعات حرفًا في كتالوج Pick (P# 60b، 60c…)."] },
    { t: ["Erreurs d’impression", "Printing errors", "أخطاء الطباعة"], d: ["Impression décalée, encre manquante, pli d’impression, numéros discordants : les erreurs authentiques sont recherchées et se vendent avec une forte prime.", "Misaligned printing, missing ink, gutter folds, mismatched serials: genuine errors are sought after and sell at strong premiums.", "الطباعة المنزاحة والحبر الناقص وطيّات الطباعة والأرقام غير المتطابقة: الأخطاء الأصلية مطلوبة وتُباع بعلاوة كبيرة."] },
  ];
  CN.GLOSSARY = [
    { t: ["Tirage", "Mintage", "حجم الإصدار"], d: ["Nombre d’exemplaires frappés ou imprimés pour une date et un atelier.", "Number of pieces struck or printed for a given date and mint.", "عدد القطع المسكوكة أو المطبوعة لسنة ودار سكّ معيّنتين."] },
    { t: ["Différent d’atelier", "Mint mark", "علامة دار السكّ"], d: ["Lettre ou symbole indiquant l’atelier de frappe (A = Paris, S = San Francisco…).", "Letter or symbol identifying the mint (A = Paris, S = San Francisco…).", "حرف أو رمز يدل على دار السكّ (A لباريس، S لسان فرانسيسكو…)."] },
    { t: ["Patine", "Patina", "الباتينا"], d: ["Couche de surface formée naturellement avec le temps ; elle fait partie de l’originalité.", "Surface layer formed naturally over time; part of the item’s originality.", "طبقة سطحية تتكوّن طبيعيًا مع الزمن وتُعدّ جزءًا من الأصالة."] },
    { t: ["Brillant de frappe", "Luster", "لمعان السكّ"], d: ["Reflet créé par l’écoulement du métal lors de la frappe ; il disparaît avec l’usure.", "Shine created by metal flow during striking; it fades with wear.", "بريق ينتج عن انسياب المعدن أثناء السكّ ويزول مع التآكل."] },
    { t: ["Sous coque", "Slabbed", "مغلّفة"], d: ["Objet authentifié, noté et scellé dans un boîtier par un service tiers (PCGS, NGC, PMG).", "Item authenticated, graded and sealed in a holder by a third-party service (PCGS, NGC, PMG).", "قطعة موثّقة ومصنّفة ومختومة داخل علبة من جهة مستقلة (PCGS، NGC، PMG)."] },
    { t: ["Belle épreuve", "Proof strike", "سكّ مصقول (بروف)"], d: ["Frappe soignée sur flan poli : champs miroir et motifs nets, destinée aux collectionneurs.", "Careful strike on a polished blank: mirror fields and crisp devices, made for collectors.", "سكّ متقن على قرص مصقول: أرضية مرآوية ونقوش حادة، مخصّص للهواة."] },
    { t: ["Date clé", "Key date", "السنة المفتاحية"], d: ["Millésime le plus rare d’une série, indispensable pour la compléter ; souvent le plus contrefait.", "The scarcest date of a series, needed to complete it; often the most counterfeited.", "أندر سنة في سلسلة ما، ولا تكتمل المجموعة دونها، وغالبًا الأكثر تزويرًا."] },
    { t: ["Billet de remplacement", "Replacement note", "الورقة البديلة"], d: ["Billet imprimé pour remplacer un exemplaire défectueux, signalé par une étoile ★ ou un préfixe spécial.", "Note printed to replace a faulty one, flagged by a star ★ or a special prefix.", "ورقة تُطبع بدل أخرى معيبة، وتُميَّز بنجمة ★ أو بادئة خاصة."] },
    { t: ["Pick (P#)", "Pick (P#)", "رقم Pick (P#)"], d: ["Numéro du Standard Catalog of World Paper Money ; la lettre finale désigne la variété (date, signature).", "Number in the Standard Catalog of World Paper Money; the final letter marks the variety (date, signature).", "رقم الورقة في الكتالوج العالمي للنقود الورقية؛ والحرف الأخير يدل على التنويعة (التاريخ، التوقيع)."] },
    { t: ["KM# et N#", "KM# and N#", "KM# وN#"], d: ["KM# : numéro Krause du Standard Catalog of World Coins. N# : numéro du type dans le catalogue Numista.", "KM#: Krause number in the Standard Catalog of World Coins. N#: the type number in the Numista catalogue.", "KM#: رقم Krause في الكتالوج العالمي للعملات. N#: رقم النوع في كتالوج Numista."] },
  ];

  const S = (fr, en, ar) => ({ fr, en, ar });
  const pick = (o, l) => (o && typeof o === "object" && !Array.isArray(o) ? o[l] : o);
  const ex = {
    title: S("États-Unis · 1 cent Lincoln 1909-S VDB", "United States · 1909-S VDB Lincoln cent", "الولايات المتحدة · سنت لينكولن 1909-S VDB"),
    kind: "coin", iso2: "US", country: "United States", refs: { km: "KM# 132", pick: "", numista: "", other: "" }, year: "1909",
    grade: "VF", confidence: "medium", value: { low: 1150, high: 1400, currency: "USD" },
    ladder: [{ grade: "G", low: 750, high: 900 }, { grade: "VG", low: 850, high: 1000 }, { grade: "F", low: 950, high: 1150 }, { grade: "VF", low: 1150, high: 1400 }, { grade: "XF", low: 1400, high: 1700 }, { grade: "AU", low: 1650, high: 2000 }, { grade: "UNC", low: 2400, high: 3500 }],
    specs: [
      { label: S("Métal", "Metal", "المعدن"), value: "Bronze 95% Cu" }, { label: S("Poids", "Weight", "الوزن"), value: "3.11 g" },
      { label: S("Diamètre", "Diameter", "القطر"), value: "19 mm" }, { label: S("Tirage", "Mintage", "حجم الإصدار"), value: "484,000" },
      { label: S("Graveur", "Designer", "النقّاش"), value: "Victor D. Brenner" }, { label: S("Référence", "Catalogue", "المرجع"), value: "KM# 132" },
    ],
    summary: S("En TTB (VF), avec une patine brune naturelle et sans nettoyage, ce cent se négocie en général entre 1 150 et 1 400 USD. C’est la date clé de toute la série Lincoln.",
      "In Very Fine (VF), with natural brown patina and no cleaning, this cent typically sells for $1,150 to $1,400. It is the key date of the whole Lincoln series.",
      "في حالة «جميلة» (VF)، مع باتينا بنية طبيعية ومن دون تنظيف، يُباع هذا السنت عادةً بين 1,150 و1,400 دولار. وهو السنة المفتاحية لسلسلة لينكولن كلها."),
    sources: [
      { name: "PCGS Price Guide", ref: "1909-S VDB 1C", says: S("Cote du VF autour de 1 150 – 1 300 USD ; date la plus demandée de la série.", "VF listed around $1,150–1,300; the most sought-after date of the series.", "سعر VF نحو 1,150 – 1,300 دولار؛ أكثر سنوات السلسلة طلبًا.") },
      { name: "Heritage Auctions", ref: "", says: S("Exemplaires VF certifiés vendus le plus souvent entre 1 000 et 1 500 USD selon l’aspect.", "Certified VF examples mostly sold for $1,000–1,500 depending on eye appeal.", "بيعت نسخ VF موثّقة غالبًا بين 1,000 و1,500 دولار حسب المظهر.") },
      { name: "Krause SCWC", ref: "KM# 132", says: S("Tirage de 484 000 ; identifie la variété S VDB.", "Mintage 484,000; identifies the S VDB variety.", "حجم الإصدار 484,000؛ يحدد تنويعة S VDB.") },
    ],
    factors: S(["Tirage très faible : 484 000 exemplaires avant le retrait des initiales.", "Demande constante : aucune série Lincoln n’est complète sans elle.", "Très contrefaite (S ajouté) : un exemplaire certifié vaut nettement plus."],
      ["Very low mintage: 484,000 struck before the initials were removed.", "Steady demand: no Lincoln set is complete without it.", "Heavily counterfeited (added S), so a certified coin is worth much more."],
      ["حجم إصدار ضئيل: 484,000 قطعة قبل حذف الأحرف الأولى.", "طلب ثابت: لا تكتمل سلسلة لينكولن من دونها.", "كثيرة التزوير (إضافة حرف S)، لذا فالموثّقة أعلى قيمة بكثير."]),
    history: S("Frappé pour le centenaire de la naissance de Lincoln, ce cent est la première pièce courante américaine à l’effigie d’un personnage réel. Les initiales VDB du graveur, jugées trop voyantes, ont été retirées quelques jours après le lancement d’août 1909, quand San Francisco n’en avait frappé que 484 000.",
      "Struck for the centennial of Lincoln’s birth, this was the first circulating US coin to portray a real person. The designer’s initials VDB, judged too prominent, were removed days after the August 1909 launch, when San Francisco had struck only 484,000.",
      "سُكّ هذا السنت في الذكرى المئوية لميلاد لينكولن، وهو أول عملة أمريكية متداولة تحمل صورة شخصية حقيقية. وحُذفت الأحرف الأولى VDB للنقّاش لبروزها بعد أيام من إطلاقه في أغسطس 1909، ولم تكن سان فرانسيسكو قد سكّت منه سوى 484,000 قطعة."),
    specifics: S("La contrefaçon la plus courante est un 1909 VDB de Philadelphie auquel on a ajouté un S. Vérifiez la forme du S et l’absence de ligne de collage.", "The most common fake is a Philadelphia 1909 VDB with an added S. Check the S shape and look for a glue seam.", "التزوير الأشيع هو سنت 1909 VDB من فيلادلفيا أُضيف إليه حرف S. افحص شكل الحرف وغياب خط اللصق."),
    advice: S(["Faites-la certifier par PCGS ou NGC avant toute vente.", "Ne la nettoyez pas ; tenez-la par la tranche."], ["Have it certified by PCGS or NGC before selling.", "Do not clean it; hold it by the edge."], ["وثّقها لدى PCGS أو NGC قبل البيع.", "لا تنظّفها وأمسكها من الحافة."]),
    questions: S(["Les poils de la barbe de Lincoln sont-ils encore distincts ?"], ["Are the hairs of Lincoln’s beard still distinct?"], ["هل ما زالت شعيرات لحية لينكولن واضحة؟"]),
  };
  CN.exampleResult = function (lang) {
    const r = {};
    for (const [k, v] of Object.entries(ex)) {
      if (k === "specs") r.specs = v.map((s) => ({ label: pick(s.label, lang), value: s.value }));
      else if (k === "sources") r.sources = v.map((s) => ({ name: s.name, ref: s.ref, says: pick(s.says, lang) }));
      else r[k] = pick(v, lang);
    }
    return r;
  };
  CN.EXAMPLE_FORM = { kind: "coin", country: "United States", year: "1909", denom: "1 cent", mark: "S", material: "bronze", refs: "KM# 132", grade: "VF", probes: ["legible", "patina"], notes: "" };
})(typeof window !== "undefined" ? window : globalThis);
