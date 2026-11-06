/*
 * English versions of categories and treatments.
 * Applied only when the English version of the site is selected.
 * Keys match the ids in treatments.js.
 */
(function () {
  if (JM.lang !== 'en') return;

  const categories = {
    'makijaz-permanentny': {
      name: 'Permanent makeup',
      lead: 'Brows, lips and eyeliner that look good from the moment you wake up.',
      about: 'Pigmentation that enhances your features for many months. We choose the shape and colour together during the consultation and pre-drawing, and we only start once you are completely happy with the design.',
      prep: [
        'Stop using retinoids and acids on the treatment area 7 days before the appointment.',
        'Avoid alcohol and strong coffee for 24 hours before the treatment.',
        'If you get cold sores, talk to your doctor about preventive treatment before lip pigmentation.'
      ],
      contra: [
        'pregnancy and breastfeeding',
        'inflammation, cold sores or infection in the treatment area',
        'uncontrolled diabetes',
        'tendency to scarring or keloids',
        'isotretinoin treatment (and for 6 months after it ends)',
        'anticoagulants, only after consulting your doctor',
        'chemotherapy and radiotherapy'
      ],
      after: [
        'Do not scratch or pick the scabs for 7–10 days.',
        'Keep the area clean and use the ointment we recommend.',
        'Avoid saunas, swimming pools, sunbeds and strong sun for 2 weeks.',
        'The touch-up after 4–8 weeks is part of the process: that is when we check how the pigment has healed.'
      ]
    },
    mezoterapia: {
      name: 'Mesotherapy',
      lead: 'Hydration, glow and healthier skin thanks to ingredients delivered where they work.',
      about: 'Cocktails of hyaluronic acid, vitamins, amino acids and peptides delivered into the skin. The active ingredients reach deeper layers instead of staying on the surface like a cream. We choose the product to suit your skin.',
      prep: [
        'Avoid alcohol for 3 days before the treatment.',
        'Stop blood-thinning medication such as aspirin only after consulting your doctor.',
        'Come without makeup.'
      ],
      contra: [
        'pregnancy and breastfeeding',
        'skin infection, cold sores or inflamed acne in the treatment area',
        'allergy to the ingredients of the product',
        'autoimmune diseases during a flare-up',
        'uncontrolled diabetes',
        'anticoagulant therapy',
        'cancer'
      ],
      after: [
        'Do not apply makeup for 24 hours.',
        'Avoid saunas, swimming pools and intense exercise for 48 hours.',
        'Use SPF 50 sunscreen for 2 weeks.',
        'Small bumps and redness usually disappear within 1–3 days.'
      ]
    },
    stymulatory: {
      name: 'Skin boosters',
      lead: 'Firmer, denser skin without changing your features.',
      about: 'Products that stimulate the skin to rebuild itself: to produce collagen, elastin and its own hyaluronic acid. They do not fill wrinkles like a filler and do not change your features. They improve skin quality from within.',
      prep: [
        'Avoid alcohol for 3 days before the treatment.',
        'Do not plan peels or laser treatments for 2 weeks before a skin booster.',
        'Come without makeup.'
      ],
      contra: [
        'pregnancy and breastfeeding',
        'infection or inflammation in the treatment area',
        'allergy to the ingredients of the product',
        'autoimmune diseases during a flare-up',
        'anticoagulant therapy',
        'cancer'
      ],
      after: [
        'Do not apply makeup for 24 hours.',
        'Do not massage the area for 2 days unless we advise otherwise.',
        'Avoid saunas, sunbeds and strong sun for 2 weeks.',
        'Small bumps at the injection points usually disappear within a few hours.'
      ]
    },
    peelingi: {
      name: 'Acid peels (chemical peels)',
      lead: 'Acid treatments for pigmentation, acne, pores and dull skin.',
      about: 'Controlled exfoliation of the skin with acids. We choose the type and strength of the acid to suit the skin concern and how sensitive your skin is. The best time for a series is autumn and winter, when the sun is weaker.',
      prep: [
        'Stop retinoids, scrubs and hair removal on the treatment area a week before the appointment.',
        'Do not tan for 2 weeks before the treatment.'
      ],
      contra: [
        'pregnancy and breastfeeding (applies to most acids)',
        'a fresh tan',
        'cold sores, wounds or inflamed skin',
        'isotretinoin treatment (and for 6 months after it ends)',
        'allergy to the ingredients of the product',
        'a laser treatment in the last few weeks'
      ],
      after: [
        'Use SPF 50 sunscreen every day, even when it is cloudy.',
        'Do not peel off flaking skin.',
        'Use gentle products without acids or retinoids for a few days.',
        'Avoid saunas and sunbeds for 2 weeks.'
      ]
    }
  };

  const treatments = {
    'pmu-brwi': {
      name: 'Powder brows (ombré)', short: 'Softly shaded brows, like well-applied brow powder.',
      what: 'Permanent makeup for brows done with the powder technique, a gentle shading. Brows look as if they were filled in with powder or shadow: soft, with no harsh outlines.',
      how: 'The pigment is placed shallowly in the skin with a fine needle, dot by dot. The front of the brow stays lighter while the arch and tail are shaded more intensely, so the colour flows naturally. We draw the shape on the skin first and start pigmentation only once you are happy with it.',
      helps: ['sparse, thin or light brows', 'asymmetry and uneven shape', 'gaps from over-plucking', 'brow makeup that wears off during the day'],
      when: 'When you fill in your brows every day or want to look good without makeup: at the pool, at the gym, on holiday. The powder technique also works well on oily skin, where hair strokes tend to blur.',
      benefits: ['time saved on daily makeup', 'brows that resist water, sweat and heat', 'a shape designed for your face', 'a natural result that gradually fades over time'],
      steps: 'Consultation and colour selection, pre-drawing, numbing cream, pigmentation.',
      results: 'Right after the treatment the colour is noticeably darker; it softens as it heals. The final result is visible after about 4 weeks and usually lasts 1–3 years.',
      series: 'Treatment and a touch-up after 4–8 weeks.'
    },
    'pmu-usta': {
      name: 'Lips: outline with full shading', short: 'An even outline and colour, from a natural flush to a soft lipstick look.',
      what: 'Permanent lip makeup that evens out the outline and adds colour. The result can be very subtle, like naturally rosy lips, or more defined, like a soft lipstick.',
      how: 'A pigment matched to your skin tone is placed along the outline and into the lips, shaded from the edge towards the centre. Lips look fuller and more symmetrical, although their volume does not change.',
      helps: ['pale or uneven lip colour', 'a faded, irregular outline', 'slight lip asymmetry', 'lips that have lost colour with age'],
      when: 'When you want to stop wearing lipstick every day or improve the shape of your lips without fillers. If you get cold sores, preventive treatment agreed with your doctor is needed before the appointment.',
      benefits: ['fresh-looking lips without makeup', 'visually fuller, more symmetrical lips', 'colour that does not wear off when eating or drinking', 'a shade matched to your skin tone'],
      steps: 'Consultation and colour selection, outline drawing, numbing cream, pigmentation.',
      results: 'For the first few days the colour is intense, then it softens and becomes natural. The result usually lasts 1–3 years.',
      series: 'Treatment and a touch-up after 4–8 weeks.'
    },
    'pmu-kreska': {
      name: 'Upper eyeliner', short: 'A line above the lashes that makes them look thicker and opens up the eyes.',
      what: 'Permanent makeup in the form of a line above the upper lash line: from a fine line close to the lashes to a softly extended eyeliner.',
      how: 'The pigment is placed just above the upper lash line. We design the thickness, length and finish of the line for your eye shape and lid, so it looks good with eyes both open and half-closed.',
      helps: ['light or sparse lashes', 'eyes that lack definition', 'difficulty drawing an even line', 'allergy to eye makeup'],
      when: 'When you wear eyeliner every day or want to use fewer products around sensitive eyes. Contact lenses must be removed for the treatment.',
      benefits: ['defined eyes from the moment you wake up', 'a line that does not smudge or transfer', 'visually thicker lashes', 'fewer products around the eyes'],
      steps: 'Eyeliner design, numbing cream, pigmentation.',
      results: 'Slight swelling of the lids usually goes down after 1–2 days. The result lasts 1–3 years.',
      series: 'Treatment and a touch-up after 4–8 weeks.'
    },
    'pmu-rzesy': {
      name: 'Lash line enhancement', short: 'Pigment between the lashes: more defined eyes with no visible line.',
      what: 'The most natural type of permanent eye makeup. The pigment fills the spaces between the lashes and does not create a visible line.',
      how: 'The pigment is placed point by point between the roots of the upper lashes. The lash line becomes darker and denser, so the lashes look thicker and the eyes more defined.',
      helps: ['light or sparse lashes', 'gaps in the lash line', 'tired eyes that lack definition'],
      when: 'When you do not like the look of eyeliner but want to define your eyes. It also works well alongside a lash lift or extensions.',
      benefits: ['a subtle result that does not look like makeup', 'defined eyes even without mascara', 'a shorter treatment and faster healing than eyeliner'],
      steps: 'Numbing cream and pigmentation of the lash line.',
      results: 'Visible straight away, final after healing. Lasts 1–3 years.',
      series: 'Treatment and a touch-up after 4–8 weeks.'
    },
    'pmu-korekta': {
      name: 'Touch-up after 4–8 weeks', short: 'Topping up the pigment after healing: a natural stage of permanent makeup.',
      what: 'The second, complementary stage of every permanent makeup treatment.',
      how: 'While healing, the skin takes up the pigment unevenly and some colour flakes off. At the touch-up we assess the result, top up the pigment in lighter areas and refine the shape.',
      helps: ['gaps and uneven colour after healing', 'small adjustments to the shape'],
      when: '4–8 weeks after permanent makeup done at our studio, once the skin has fully healed.',
      benefits: ['even, full colour', 'a longer-lasting result', 'a chance to refine details'],
      steps: 'Assessing the healed result, topping up the pigment.',
      results: 'The final shape and colour of your permanent makeup.',
      series: 'One-off.'
    },
    'pmu-odswiezenie': {
      name: 'Permanent makeup refresh', short: 'Restoring the colour when the pigment fades over time.',
      what: 'Re-pigmentation of permanent makeup that has faded over time.',
      how: 'Sun exposure and natural skin renewal gradually lighten the pigment. A refresh restores the intensity of the colour and the sharpness of the outline, and if needed we slightly adjust the shape.',
      helps: ['faded or uneven colour', 'a blurred outline', 'wanting a slight change of shape'],
      when: 'Usually every 12–24 months, when the colour is no longer defined. Permanent makeup done elsewhere is refreshed after a consultation.',
      benefits: ['a result like a fresh treatment', 'shorter healing than the first pigmentation', 'keeping the shape for years'],
      steps: 'Assessing the pigment, adjusting the shape, pigmentation.',
      results: 'Refreshed colour for another 1–2 years.',
      series: 'One-off, with a touch-up if needed.'
    },
    'mezo-twarz': {
      name: 'Needle mesotherapy: face', short: 'Hydration, glow and nourishment delivered right where they work.',
      what: 'A treatment in which active ingredients are delivered directly into the skin with a very fine needle. It is one of the most effective ways to hydrate and nourish the skin.',
      how: 'A series of shallow micro-injections delivers a cocktail tailored to your skin: with hyaluronic acid, vitamins, amino acids or peptides. The ingredients reach where creams cannot, and the tiny punctures also stimulate the skin to regenerate.',
      helps: ['dehydrated, dull skin', 'loss of glow and firmness', 'first wrinkles', 'skin tired from stress, sun or illness'],
      when: 'As regular skincare from about the age of 25–30, before an important event, or after summer and winter when the skin is dry. A series gives the best results.',
      benefits: ['noticeable hydration after the first treatment', 'a product chosen for your skin', 'a short treatment with no long downtime', 'combines well with chemical peels'],
      steps: 'Cleansing and disinfection, numbing cream, micro-injections, soothing mask.',
      results: 'Skin looks hydrated and radiant after a few days, and the effect builds with each treatment in the series.',
      series: '3–4 treatments every 2–3 weeks, then a maintenance treatment every few months.'
    },
    'mezo-tsd': {
      name: 'Needle mesotherapy: face, neck and décolleté', short: 'Mesotherapy for three areas that age together.',
      what: 'Needle mesotherapy covering the face, neck and décolleté: areas that age together but are often overlooked in daily skincare.',
      how: 'As with facial mesotherapy, we deliver a cocktail of active ingredients through shallow micro-injections, but over a larger area. The skin on the neck and décolleté is thinner, so we adapt the product and technique.',
      helps: ['loose, thin skin on the neck', 'horizontal neck lines', 'dry, rough décolleté', 'a difference between the skin of the face and neck'],
      when: 'When you notice that your neck and décolleté look older than your face, and as skincare after summer.',
      benefits: ['a consistent result on three areas in one visit', 'better hydration and firmness of the neck', 'better value than separate treatments'],
      steps: 'Cleansing and disinfection, numbing cream, micro-injections, soothing mask.',
      results: 'Better hydration and firmness that build with each treatment in the series.',
      series: '3–4 treatments every 2–3 weeks.'
    },
    'mezo-oczy': {
      name: 'Needle mesotherapy: eye area', short: 'Gentle mesotherapy for dark circles, puffiness and fine lines under the eyes.',
      what: 'Mesotherapy designed for the thinnest and most delicate skin on the face: under and around the eyes.',
      how: 'We use products made specifically for the eye area, usually with peptides and low-molecular hyaluronic acid. They support microcirculation, strengthen thin skin and improve its hydration.',
      helps: ['dark circles', 'morning puffiness', 'fine lines and crow’s feet', 'thin, tired skin under the eyes'],
      when: 'When eye creams are no longer enough, with the first expression lines, or after a period of stress and lack of sleep.',
      benefits: ['brighter, rested-looking eyes', 'a treatment adapted to thin skin', 'no break from daily life (small bruises are possible)'],
      steps: 'Disinfection, numbing cream, gentle micro-injections, cooling compresses.',
      results: 'Brighter, smoother skin after a series of treatments.',
      series: '3–4 treatments every 2 weeks.'
    },
    'mezo-glowa': {
      name: 'Needle mesotherapy: scalp', short: 'Stronger hair from the roots and less hair loss.',
      what: 'A treatment that strengthens hair from the roots, delivering nourishing ingredients directly into the scalp.',
      how: 'Micro-injections deliver a cocktail of vitamins, amino acids, peptides and ingredients that boost microcirculation. Hair follicles get what they need to grow, and the scalp is better nourished.',
      helps: ['excessive hair loss', 'thinning hair', 'fine, weak, slow-growing hair'],
      when: 'For seasonal hair loss in autumn and spring, after pregnancy, after a period of stress or dieting. With sudden or heavy hair loss, it is worth getting tests done and seeing a doctor first.',
      benefits: ['less hair loss', 'stronger follicles and new baby hair', 'you can wash your hair the next day'],
      steps: 'Disinfecting the scalp, micro-injections along the partings.',
      results: 'Less hair loss after a few treatments, new hair after 2–3 months.',
      series: '4–6 treatments every 2 weeks.'
    },
    'mikro-twarz': {
      name: 'Microneedling mesotherapy: face', short: 'Smoother texture, smaller pores and new collagen.',
      what: 'A treatment done with a microneedling device (a so-called dermapen) that combines two actions: delivering active ingredients and stimulating collagen production.',
      how: 'The device creates thousands of micro-channels in the skin at a controlled depth. The chosen product penetrates through them, and the micro-injuries trigger the skin’s natural repair process, producing new collagen and elastin.',
      helps: ['enlarged pores', 'acne scars', 'uneven texture and tone', 'pigmentation', 'loss of firmness and fine lines'],
      when: 'When you want to improve the structure of your skin, not just hydrate it. A series is best done in autumn and winter.',
      benefits: ['clearly improved skin texture', 'a rebuilding effect that keeps improving for weeks', 'depth and product matched to the concern', 'can be combined with chemical peels'],
      steps: 'Cleansing, numbing cream, treatment with the device and product, soothing mask.',
      results: 'Skin stays pink for 1–2 days. Texture and firmness keep improving over the following weeks.',
      series: '3–6 treatments every 4 weeks.'
    },
    'mikro-tsd': {
      name: 'Microneedling mesotherapy: face, neck and décolleté', short: 'Microneedling for three areas.',
      what: 'Microneedling mesotherapy covering the face, neck and décolleté in one treatment.',
      how: 'Microneedles create channels in the skin through which the product penetrates, and stimulate collagen production. On the neck and décolleté we work more shallowly because the skin there is thinner.',
      helps: ['loss of firmness on the neck and décolleté', 'uneven skin texture', 'pigmentation on the décolleté', 'fine lines on the neck'],
      when: 'When you want to improve skin quality across the whole area that most often reveals age. Best in autumn and winter.',
      benefits: ['skin renewal on three areas in one visit', 'smoother, firmer skin on the neck', 'better value than separate treatments'],
      steps: 'Cleansing, numbing cream, treatment with the device and product, soothing mask.',
      results: 'Smoother, firmer skin, with the effect building over several weeks.',
      series: '3–6 treatments every 4 weeks.'
    },
    'stym-ha': {
      name: 'Hyaluronic acid skin booster (e.g. Profhilo)', short: 'Intense hydration and visible firming without changing your features.',
      what: 'A skin booster with a very high concentration of pure hyaluronic acid. It is not a filler: it does not change your features, it improves the quality of your skin.',
      how: 'The product is injected at a few points on each side of the face. It spreads evenly through the skin, hydrates it intensely and stimulates cells to produce collagen and elastin. Skin gradually becomes denser and more elastic.',
      helps: ['loss of firmness and elasticity', 'loose, thin, tired skin', 'fine lines and lack of glow', 'neck and décolleté skin (after assessment)'],
      when: 'When the skin starts to lose firmness, usually after 30, and as anti-ageing prevention. A good choice if you want to look younger, not different.',
      benefits: ['a natural result with no change to your features', 'only a few injection points', 'results lasting about 6 months', 'a quick return to daily life'],
      steps: 'Consultation, disinfection, injecting the product at 5 points on each side of the face.',
      results: 'The effect builds over several weeks and lasts about 6 months.',
      series: '2 treatments 4 weeks apart, then a maintenance treatment about every 6 months.'
    },
    'stym-kolagen': {
      name: 'Collagen and hyaluronic acid skin booster (e.g. Karisma)', short: 'Collagen and hyaluronic acid: denser, more elastic skin.',
      what: 'A skin booster that combines collagen with hyaluronic acid. It supports the rebuilding of skin that loses density and elasticity with age.',
      how: 'The collagen in the product acts as a scaffold on which the skin rebuilds its own fibres, while hyaluronic acid binds water and hydrates. The product is injected into the areas that need it.',
      helps: ['loss of density and elasticity', 'fine lines and folds', 'loose skin on the cheeks and neck', 'tired, dehydrated skin'],
      when: 'When the skin loses firmness, usually after 35, or as a complement to other anti-ageing treatments.',
      benefits: ['visibly denser, more elastic skin', 'a natural result without changing your features', 'hydration and rebuilding in one treatment'],
      steps: 'Consultation, disinfection, numbing cream, injecting the product.',
      results: 'Firmness and skin quality improve gradually over several weeks after the series.',
      series: '2–3 treatments every 3–4 weeks.'
    },
    'stym-pn': {
      name: 'Polynucleotides (e.g. Nucleofill, Plinest)', short: 'Regeneration and repair for thin, weakened skin.',
      what: 'A skin booster with polynucleotides, purified fragments of natural DNA. It works mainly by regenerating the skin.',
      how: 'Polynucleotides give the skin material for cell renewal and stimulate fibroblasts, the cells that produce collagen. They also support hydration and calm inflammation, so they work well on thin, weakened skin.',
      helps: ['thin, weakened skin', 'loss of density and firmness', 'fine lines, including around the eyes', 'sun-damaged skin'],
      when: 'When the skin needs regeneration above all: after summer, with the first signs of ageing, or as preparation for other anti-ageing treatments.',
      benefits: ['strong regenerating effect', 'denser, firmer skin', 'suitable for delicate areas (after assessment)'],
      steps: 'Consultation, disinfection, numbing cream, injecting the product.',
      results: 'Skin is denser, firmer and looks rested after the series.',
      series: '3 treatments every 2–3 weeks.'
    },
    'stym-amino': {
      name: 'Amino acid skin booster (e.g. Sunekos, Jalupro)', short: 'Hyaluronic acid and amino acids that skin uses to build collagen.',
      what: 'A skin booster that combines hyaluronic acid with a complex of amino acids, the building blocks the skin uses to make collagen and elastin.',
      how: 'Hyaluronic acid hydrates and creates an environment for repair, while amino acids provide the ingredients for new fibres. Skin regains elasticity and a more even tone.',
      helps: ['first signs of ageing', 'dehydrated, dull skin', 'loss of elasticity', 'eye area (dedicated version)'],
      when: 'When you want to support your skin at an early stage of ageing, or are looking for a gentler alternative to stronger boosters.',
      benefits: ['a natural, refreshed look', 'better elasticity and tone', 'well tolerated by sensitive skin'],
      steps: 'Consultation, disinfection, numbing cream, injecting the product.',
      results: 'Skin is more hydrated, elastic and radiant after a few treatments.',
      series: '4 treatments every 7–10 days.'
    },
    'stym-ejal': {
      name: 'Hyaluronic acid biorevitalisation (e.g. Ejal 40)', short: 'Deep hydration and a fresh look for tired skin.',
      what: 'Biorevitalisation with a high concentration of non-cross-linked hyaluronic acid. A treatment for dehydrated, tired skin that has lost its glow.',
      how: 'Hyaluronic acid is delivered through micro-injections across the treatment area. It binds water in the skin, restores hydration and stimulates fibroblasts. It does not fill or change your features.',
      helps: ['dehydrated, dull skin', 'fine lines caused by dryness', 'loss of glow and elasticity', 'skin on the neck, décolleté and hands'],
      when: 'After summer and winter, before an important event, or as regular care for skin that easily becomes dehydrated.',
      benefits: ['quickly visible hydration', 'a fresh, rested look', 'a good first step if you are new to skin boosters'],
      steps: 'Disinfection, numbing cream, micro-injections of the product.',
      results: 'Skin is hydrated and radiant after a few days. After a series, the effect lasts several months.',
      series: '3 treatments every 2–3 weeks.'
    },
    'stym-oczy': {
      name: 'Eye area skin booster (e.g. Jalupro Young Eye, Sunekos Eye)', short: 'Brighter dark circles and smoother thin skin under the eyes.',
      what: 'A skin booster made specifically for the thin, delicate skin around the eyes.',
      how: 'A product with hyaluronic acid, amino acids or peptides is gently injected under the eyes and around the crow’s feet. It strengthens thin skin, stimulates collagen production and improves hydration, so dark circles are less visible.',
      helps: ['dark circles and shadows under the eyes', 'thin, crêpey skin under the eyes', 'crow’s feet', 'tired-looking eyes'],
      when: 'When eye creams are no longer enough and dark circles and fine lines are visible even after rest.',
      benefits: ['rested, brighter eyes', 'a product designed for the delicate eye area', 'a short treatment'],
      steps: 'Disinfection, numbing cream, gentle injection of the product, cooling compresses.',
      results: 'The skin under the eyes is smoother and brighter after the series. Small bruises may be visible for a few days.',
      series: '3–4 treatments every 1–3 weeks, depending on the product.'
    },
    'kwas-migdalowy': {
      name: 'Mandelic acid peel', short: 'A gentle acid that smooths, brightens and fights bacteria.',
      what: 'One of the gentlest chemical peels. Mandelic acid is an AHA derived from bitter almonds.',
      how: 'The acid loosens the bonds between dead skin cells so they shed more easily. It has a large molecule, so it penetrates slowly and evenly and rarely irritates. It is also antibacterial.',
      helps: ['acne and blackheads', 'pigmentation, including post-acne marks', 'oily and combination skin', 'dull, tired skin'],
      when: 'From autumn to spring. A good first peel and a good choice for sensitive skin and skin with broken capillaries.',
      benefits: ['gentle action and low risk of irritation', 'usually no visible peeling', 'suitable for most skin types', 'smoother, brighter skin'],
      steps: 'Makeup removal and cleansing, applying the acid, neutralising, soothing mask and sunscreen.',
      results: 'Smoother, brighter, clearer skin, noticeably after a few treatments.',
      series: '4–6 treatments every 7–14 days.'
    },
    'kwas-mlekowy': {
      name: 'Lactic acid peel', short: 'Gentle exfoliation combined with hydration, also for dry skin.',
      what: 'A lactic acid peel, one of the gentlest AHAs. Lactic acid occurs naturally in the skin as part of its moisturising layer.',
      how: 'The acid removes dead skin cells and at the same time binds water in the skin. It smooths and brightens without drying, and supports the skin’s protective barrier.',
      helps: ['dry, dehydrated skin', 'rough, uneven texture', 'light pigmentation', 'dull, tired skin'],
      when: 'From autumn to spring, especially for dry and sensitive skin that does not tolerate stronger acids.',
      benefits: ['gentle on dry and sensitive skin', 'exfoliation combined with hydration', 'smooth, radiant skin right after the treatment'],
      steps: 'Makeup removal and cleansing, applying the acid, neutralising, soothing mask and sunscreen.',
      results: 'Smooth, hydrated, brighter skin, noticeably after a few treatments.',
      series: '4–6 treatments every 7–14 days.'
    },
    'kwas-glikolowy': {
      name: 'Glycolic acid peel', short: 'A classic acid for smoother, brighter skin and fine lines.',
      what: 'A glycolic acid peel. Glycolic acid is the smallest AHA and one of the most widely used acids in cosmetology.',
      how: 'Thanks to its small molecule, the acid penetrates the skin quickly and deeply. It removes dead cells, evens out skin tone and stimulates collagen production. We adjust the strength and contact time to how your skin tolerates it.',
      helps: ['uneven texture and tone', 'pigmentation', 'fine lines', 'blackheads and enlarged pores'],
      when: 'From autumn to spring, for normal, oily and mature skin. For very sensitive skin we choose a gentler acid.',
      benefits: ['clearly smoother skin', 'anti-ageing effect through collagen stimulation', 'strength matched to your skin'],
      steps: 'Makeup removal and cleansing, applying the acid, neutralising, soothing mask and sunscreen.',
      results: 'Smoother, brighter skin and less visible fine lines after the series. Light peeling is possible.',
      series: '4–6 treatments every 2 weeks.'
    },
    'kwas-azelainowy': {
      name: 'Azelaic acid peel', short: 'For acne, redness and pigmentation, gentle on sensitive skin.',
      what: 'An azelaic acid peel with antibacterial, anti-inflammatory and brightening properties.',
      how: 'Azelaic acid limits the bacteria that cause acne, calms inflammation and inhibits excess pigment production. It exfoliates gently, which makes it suitable for sensitive skin.',
      helps: ['acne and inflamed spots', 'redness and broken capillaries', 'pigmentation, including post-acne marks', 'skin prone to rosacea (after consultation)'],
      when: 'From autumn to spring, when the skin is acne-prone and sensitive or reactive at the same time.',
      benefits: ['anti-inflammatory and brightening action', 'suitable for sensitive skin and broken capillaries', 'low risk of irritation'],
      steps: 'Makeup removal and cleansing, applying the acid, neutralising, soothing mask and sunscreen.',
      results: 'Fewer inflamed spots and less redness, and a more even tone after the series.',
      series: '4–6 treatments every 7–14 days.'
    },
    'kwas-salicylowy': {
      name: 'Salicylic acid peel', short: 'A BHA that clears pores from within and calms inflammation.',
      what: 'A salicylic acid peel. Salicylic acid is a BHA and, unlike AHAs, it dissolves in oil, so it gets inside the pores.',
      how: 'Salicylic acid penetrates the pores, dissolves the sebum and dead cells clogging them, and also calms inflammation. Skin is clearer, more matte and less prone to breakouts.',
      helps: ['blackheads and clogged pores', 'acne', 'excess oiliness', 'enlarged pores'],
      when: 'From autumn to spring, for oily, combination and acne-prone skin. We do not use it if you are allergic to salicylates.',
      benefits: ['deep cleansing of the pores', 'longer-lasting matte skin', 'anti-inflammatory action'],
      steps: 'Makeup removal and cleansing, applying the acid, neutralising, soothing mask and sunscreen.',
      results: 'Clearer pores and fewer breakouts after a few treatments. Light peeling is possible.',
      series: '4–6 treatments every 2 weeks.'
    },
    'kwas-pirogronowy': {
      name: 'Pyruvic acid peel', short: 'A stronger acid for pores, blackheads and excess sebum.',
      what: 'A pyruvic acid peel, which works more strongly than mandelic acid and is especially good for oily skin.',
      how: 'The acid exfoliates the skin and at the same time gets into the openings of the sebaceous glands, clearing them and reducing sebum production. It also stimulates skin renewal and collagen production.',
      helps: ['oily skin with blackheads', 'acne', 'enlarged pores', 'shallow acne scars'],
      when: 'From autumn to spring, for oily and acne-prone skin. We do not recommend it for skin with broken capillaries or very sensitive skin.',
      benefits: ['effective pore cleansing', 'more matte, less oily skin', 'smoother shallow scars'],
      steps: 'Makeup removal and cleansing, applying the acid, neutralising, soothing mask and sunscreen.',
      results: 'Clearer pores and more even texture after the series. Light peeling for a few days is possible.',
      series: '4–6 treatments every 2 weeks.'
    },
    mezopeeling: {
      name: 'Mesopeel', short: 'A professional peel combining several acids, matched to a specific concern.',
      what: 'A professional peel that combines several acids with active ingredients in one product. Each version targets a different skin concern.',
      how: 'The acids exfoliate the skin and help active ingredients penetrate, for example brightening, anti-acne or anti-ageing ones. We choose the version and strength after assessing your skin.',
      helps: ['pigmentation and melasma (in a series)', 'acne and blackheads', 'dull, tired skin', 'first signs of ageing'],
      when: 'When you need a treatment that targets a specific concern. Best in autumn and winter.',
      benefits: ['a product matched to your skin concern', 'exfoliation and care in one treatment', 'visibly refreshed skin'],
      steps: 'Makeup removal and cleansing, applying the peel, neutralising, mask and sunscreen.',
      results: 'Brighter, refreshed skin, with a clear effect after the series.',
      series: '3–6 treatments every 2–3 weeks.'
    },
    'peeling-retinolowy': {
      name: 'Retinol peel (yellow peel)', short: 'Skin renewal with retinol: pigmentation, wrinkles and uneven tone.',
      what: 'A peel with a high concentration of retinol, called “yellow” because of the colour of the product. One of the most effective anti-ageing and brightening treatments.',
      how: 'We apply the product at the studio and you wash it off at home a few hours later, following our instructions. Retinol speeds up cell renewal, stimulates collagen production and brightens pigmentation. For a few days afterwards the skin flakes in fine pieces.',
      helps: ['pigmentation and melasma', 'wrinkles and loss of firmness', 'uneven tone and texture', 'acne scars and enlarged pores'],
      when: 'From autumn to early spring, when the sun is weak. It is worth planning a few quieter days because the peeling is visible. We do not perform it during pregnancy or breastfeeding.',
      benefits: ['strong anti-ageing and brightening effect', 'a short visit to the studio', 'results visible after a single treatment'],
      steps: 'Cleansing and degreasing the skin, applying the product, instructions for washing it off at home.',
      results: 'Once the peeling is over, skin is smoother, brighter and more even. The effect deepens with each treatment.',
      series: '2–4 treatments every 3–4 weeks.'
    },
    'prx-twarz': {
      name: 'PRX-T33 peel: face', short: 'Needle-free biorevitalisation: firm, radiant skin straight after the treatment.',
      what: 'A peel combining 33% trichloroacetic acid (TCA) with hydrogen peroxide and kojic acid. It is known as needle-free biorevitalisation.',
      how: 'We massage the product into the skin in several layers. TCA works in the deeper layers of the skin and stimulates collagen production, while the hydrogen peroxide means the surface barely peels. Skin is firm and radiant right after the treatment.',
      helps: ['loss of firmness and tone', 'acne scars', 'enlarged pores', 'dull skin without glow'],
      when: 'Before an important event, when your skin needs to look fresh straight away, or in a series as an anti-ageing treatment. It can be done all year round, as long as you use sunscreen every day.',
      benefits: ['results visible straight away', 'no needles and usually no visible peeling', 'possible all year round', 'a quick return to daily life'],
      steps: 'Cleansing, massaging the product in several layers, rinsing, soothing cream with SPF.',
      results: 'Firm, radiant skin right after the treatment; the rebuilding effect grows after the series.',
      series: '4–5 treatments once a week.'
    },
    'prx-tsd': {
      name: 'PRX-T33 peel: face, neck and décolleté', short: 'PRX-T33 for three areas.',
      what: 'The PRX-T33 peel covering the face, neck and décolleté in one treatment.',
      how: 'The same product with 33% TCA, hydrogen peroxide and kojic acid is massaged into a larger area. It stimulates collagen production without noticeable peeling.',
      helps: ['loss of firmness on the neck and décolleté', 'pigmentation on the décolleté', 'fine lines', 'dull skin without glow'],
      when: 'When you want to refresh and firm the skin across the whole area, for example before an event with an open neckline. Possible all year round, with sunscreen.',
      benefits: ['results on three areas in one visit', 'no needles and no break from daily life', 'possible all year round'],
      steps: 'Cleansing, massaging the product in several layers, rinsing, soothing cream with SPF.',
      results: 'Firm, radiant skin; the effect builds after the series.',
      series: '4–5 treatments once a week.'
    }
  };

  // polska nazwa zostaje w namePl: rezerwacje zapisują ją dla panelu gabinetu
  JM.categories.forEach((c) => Object.assign(c, { namePl: c.name }, categories[c.id] || {}));
  JM.treatments.forEach((t) => Object.assign(t, { namePl: t.name }, treatments[t.id] || {}));
  Object.assign(JM.consultation, {
    namePl: JM.consultation.name,
    name: 'Skin consultation',
    short: 'Skin assessment, treatment selection and eligibility check. A good start if you are not sure where to begin.'
  });
})();
