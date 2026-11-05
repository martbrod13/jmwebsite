/*
 * Zabiegi i cennik.
 * Ceny to średnie z krakowskich gabinetów (Booksy, kliniki.pl, listopad 2026) —
 * do zastąpienia cenami gabinetu. Można je też zmieniać w panelu gabinetu (panel.html).
 * duration — czas wizyty w minutach (używany przez kalendarz rezerwacji).
 */
window.JM = window.JM || {};

JM.categories = [
  {
    id: 'makijaz-permanentny',
    name: 'Makijaż permanentny',
    lead: 'Brwi, usta i kreska, które wyglądają dobrze od rana, bez codziennego malowania.',
    about: 'Pigmentacja skóry, która podkreśla rysy twarzy na długie miesiące. Kształt i kolor dobieramy podczas konsultacji i rysunku wstępnego. Pigmentację zaczynamy dopiero wtedy, gdy projekt w pełni Ci odpowiada.',
    prep: [
      'Na 7 dni przed zabiegiem odstaw kosmetyki z retinoidami i kwasami w okolicy zabiegowej.',
      'Na 24 godziny przed zabiegiem nie pij alkoholu ani mocnej kawy.',
      'Jeśli miewasz opryszczkę, przed pigmentacją ust porozmawiaj z lekarzem o profilaktyce.'
    ],
    contra: [
      'ciąża i karmienie piersią',
      'stan zapalny, opryszczka lub infekcja w miejscu zabiegu',
      'niewyrównana cukrzyca',
      'skłonność do bliznowców i keloidów',
      'leczenie izotretynoiną (oraz 6 miesięcy po jego zakończeniu)',
      'leki przeciwzakrzepowe — tylko po konsultacji z lekarzem',
      'chemioterapia i radioterapia'
    ],
    after: [
      'Przez 7–10 dni nie drap i nie zdrapuj strupków.',
      'Utrzymuj okolicę zabiegową w czystości i stosuj maść, którą zalecimy.',
      'Przez 2 tygodnie unikaj sauny, basenu, solarium i mocnego słońca.',
      'Korekta po 4–8 tygodniach jest częścią procesu: wtedy oceniamy, jak pigment się wygoił.'
    ]
  },
  {
    id: 'mezoterapia',
    name: 'Mezoterapia',
    lead: 'Nawilżenie, blask i lepsza kondycja skóry dzięki składnikom podanym tam, gdzie działają.',
    about: 'Wprowadzenie do skóry koktajli z kwasem hialuronowym, witaminami, aminokwasami i peptydami. Składniki aktywne trafiają w głąb skóry, zamiast zostawać na powierzchni jak krem. Preparat dobieramy do potrzeb Twojej skóry.',
    prep: [
      'Przez 3 dni przed zabiegiem unikaj alkoholu.',
      'Leki rozrzedzające krew, np. aspirynę, odstaw tylko po konsultacji z lekarzem.',
      'Przyjdź bez makijażu.'
    ],
    contra: [
      'ciąża i karmienie piersią',
      'infekcja skóry, opryszczka lub trądzik w stanie zapalnym w miejscu zabiegu',
      'uczulenie na składniki preparatu',
      'choroby autoimmunologiczne w fazie zaostrzenia',
      'niewyrównana cukrzyca',
      'leczenie przeciwzakrzepowe',
      'choroba nowotworowa'
    ],
    after: [
      'Przez 24 godziny nie nakładaj makijażu.',
      'Przez 48 godzin unikaj sauny, basenu i intensywnego wysiłku.',
      'Przez 2 tygodnie stosuj krem z filtrem SPF 50.',
      'Drobne grudki i zaczerwienienie znikają zwykle w ciągu 1–3 dni.'
    ]
  },
  {
    id: 'stymulatory',
    name: 'Stymulatory tkankowe',
    lead: 'Jędrniejsza, gęstsza skóra bez zmiany rysów twarzy.',
    about: 'Preparaty, które pobudzają skórę do odbudowy: do produkcji kolagenu, elastyny i własnego kwasu hialuronowego. Nie wypełniają zmarszczek jak wypełniacz i nie zmieniają rysów twarzy. Poprawiają jakość skóry od środka.',
    prep: [
      'Przez 3 dni przed zabiegiem unikaj alkoholu.',
      'Nie planuj peelingów ani zabiegów laserowych na 2 tygodnie przed stymulatorem.',
      'Przyjdź bez makijażu.'
    ],
    contra: [
      'ciąża i karmienie piersią',
      'infekcja lub stan zapalny skóry w miejscu zabiegu',
      'uczulenie na składniki preparatu',
      'choroby autoimmunologiczne w fazie zaostrzenia',
      'leczenie przeciwzakrzepowe',
      'choroba nowotworowa'
    ],
    after: [
      'Przez 24 godziny nie nakładaj makijażu.',
      'Przez 2 dni nie masuj okolicy zabiegowej, chyba że zalecimy inaczej.',
      'Przez 2 tygodnie unikaj sauny, solarium i mocnego słońca.',
      'Grudki w miejscach podania wchłaniają się zwykle w ciągu kilkunastu godzin.'
    ]
  },
  {
    id: 'peelingi',
    name: 'Peelingi chemiczne',
    lead: 'Zabiegi kwasami na przebarwienia, trądzik, pory i szarą skórę.',
    about: 'Kontrolowane złuszczanie naskórka za pomocą kwasów. Rodzaj i stężenie kwasu dobieramy do problemu i wrażliwości skóry. Najlepszy czas na serię to jesień i zima, gdy słońce jest słabsze.',
    prep: [
      'Na tydzień przed zabiegiem odstaw retinoidy, peelingi mechaniczne i depilację w okolicy zabiegowej.',
      'Nie opalaj się przez 2 tygodnie przed zabiegiem.'
    ],
    contra: [
      'ciąża i karmienie piersią (dotyczy większości kwasów)',
      'świeża opalenizna',
      'opryszczka, rany lub stan zapalny skóry',
      'leczenie izotretynoiną (oraz 6 miesięcy po jego zakończeniu)',
      'uczulenie na składniki preparatu',
      'zabieg laserowy w ostatnich tygodniach'
    ],
    after: [
      'Codziennie stosuj krem z filtrem SPF 50, także w pochmurne dni.',
      'Nie zrywaj łuszczącego się naskórka.',
      'Przez kilka dni używaj łagodnych kosmetyków bez kwasów i retinoidów.',
      'Przez 2 tygodnie unikaj sauny i solarium.'
    ]
  }
];

JM.consultation = {
  id: 'konsultacja',
  category: 'konsultacja',
  name: 'Konsultacja kosmetologiczna',
  duration: 20,
  price: 0,
  short: 'Ocena skóry, dobór zabiegu i kwalifikacja. Dobry początek, jeśli nie wiesz, od czego zacząć.'
};

JM.treatments = [
  // Makijaż permanentny
  {
    id: 'pmu-brwi', category: 'makijaz-permanentny', name: 'Brwi pudrowe (ombre)', duration: 150, price: 850,
    short: 'Miękko cieniowane brwi, jak dobrze wykonany makijaż cieniem.',
    desc: 'Jaśniejsza nasada przechodzi w bardziej nasycony łuk i ogon, dzięki czemu brwi wyglądają naturalnie i lekko. Kształt projektujemy pod proporcje Twojej twarzy, a kolor pod karnację i kolor włosów.',
    forWhom: ['rzadkie lub asymetryczne brwi', 'osoby, które codziennie dorysowują brwi', 'cera tłusta i mieszana, na której technika pudrowa goi się lepiej niż włoskowa'],
    steps: 'Konsultacja i dobór koloru, rysunek wstępny, znieczulenie kremem, pigmentacja. Całość trwa ok. 2,5 godziny.',
    results: 'Zaraz po zabiegu kolor jest wyraźnie ciemniejszy. Ostateczny efekt widać po wygojeniu, po ok. 4 tygodniach. Utrzymuje się zwykle 1–3 lata.',
    series: 'Zabieg i korekta po 4–8 tygodniach.'
  },
  {
    id: 'pmu-usta', category: 'makijaz-permanentny', name: 'Usta — kontur z wypełnieniem', duration: 150, price: 850,
    short: 'Wyrównany kontur i kolor: od naturalnie zaróżowionych ust po delikatną pomadkę.',
    desc: 'Pigmentacja poprawia symetrię i kształt ust oraz dodaje im koloru. Intensywność dobieramy razem, od subtelnego odświeżenia po wyraźniejszy efekt pomadki.',
    forWhom: ['blade lub nierówne w kolorze usta', 'zatarty kontur', 'osoby, które chcą zrezygnować z codziennej pomadki'],
    steps: 'Konsultacja i dobór koloru, rysunek konturu, znieczulenie kremem, pigmentacja.',
    results: 'Po zagojeniu kolor jest jaśniejszy i bardziej naturalny niż zaraz po zabiegu. Efekt utrzymuje się zwykle 1–3 lata.',
    series: 'Zabieg i korekta po 4–8 tygodniach.'
  },
  {
    id: 'pmu-kreska', category: 'makijaz-permanentny', name: 'Kreska górna (eyeliner)', duration: 120, price: 650,
    short: 'Kreska nad linią rzęs, która optycznie zagęszcza rzęsy i otwiera spojrzenie.',
    desc: 'Grubość i zakończenie kreski dobieramy do kształtu oka: od cienkiej linii przy rzęsach po delikatnie wydłużony eyeliner.',
    forWhom: ['osoby, które codziennie malują kreskę', 'jasne lub rzadkie rzęsy', 'alergia na kosmetyki kolorowe'],
    steps: 'Projekt kreski, znieczulenie kremem, pigmentacja. Soczewki kontaktowe trzeba wyjąć na czas zabiegu.',
    results: 'Lekki obrzęk powiek mija zwykle po 1–2 dniach. Efekt utrzymuje się 1–3 lata.',
    series: 'Zabieg i korekta po 4–8 tygodniach.'
  },
  {
    id: 'pmu-rzesy', category: 'makijaz-permanentny', name: 'Zagęszczenie linii rzęs', duration: 90, price: 450,
    short: 'Pigment między rzęsami: oko wygląda wyraziściej, a kreski nie widać.',
    desc: 'Pigment wprowadzamy pomiędzy rzęsy górnej powieki. Nie tworzy widocznej kreski, tylko sprawia, że rzęsy wydają się gęstsze. To najbardziej naturalny rodzaj makijażu permanentnego oka.',
    forWhom: ['osoby ceniące najbardziej naturalny efekt', 'jasne rzęsy', 'osoby, które nie lubią malować oczu'],
    steps: 'Znieczulenie kremem i pigmentacja linii rzęs. Soczewki kontaktowe trzeba wyjąć na czas zabiegu.',
    results: 'Efekt widoczny od razu, ostateczny po wygojeniu. Utrzymuje się 1–3 lata.',
    series: 'Zabieg i korekta po 4–8 tygodniach.'
  },
  {
    id: 'pmu-korekta', category: 'makijaz-permanentny', name: 'Korekta po 4–8 tygodniach', duration: 90, price: 300,
    short: 'Uzupełnienie pigmentu po wygojeniu: naturalny etap makijażu permanentnego.',
    desc: 'Podczas gojenia skóra przyjmuje pigment nierównomiernie. Na korekcie uzupełniamy kolor tam, gdzie tego potrzeba, i dopracowujemy kształt.',
    forWhom: ['osoby 4–8 tygodni po makijażu permanentnym wykonanym w gabinecie'],
    steps: 'Ocena wygojenia, uzupełnienie pigmentu.',
    results: 'Pełny, równy kolor i ostateczny kształt.',
    series: 'Jednorazowo.'
  },
  {
    id: 'pmu-odswiezenie', category: 'makijaz-permanentny', name: 'Odświeżenie makijażu permanentnego', duration: 120, price: 350, from: true,
    short: 'Przywrócenie koloru, gdy pigment z czasem zblednie.',
    desc: 'Pigment w skórze z czasem jaśnieje. Odświeżenie przywraca nasycenie koloru i ostrość konturu. Zalecamy je zwykle co 12–24 miesiące.',
    forWhom: ['makijaż permanentny wykonany w gabinecie, który wyblakł', 'makijaż wykonany gdzie indziej, po konsultacji'],
    steps: 'Ocena pigmentu, ewentualna korekta kształtu, pigmentacja.',
    results: 'Odświeżony kolor na kolejne 1–2 lata.',
    series: 'Jednorazowo, w razie potrzeby z korektą.'
  },

  // Mezoterapia
  {
    id: 'mezo-twarz', category: 'mezoterapia', name: 'Mezoterapia igłowa — twarz', duration: 45, price: 450, from: true,
    short: 'Mikroiniekcje koktajlu nawilżającego, rozświetlającego lub przeciwstarzeniowego.',
    desc: 'Preparat podajemy serią płytkich mikroiniekcji w całą twarz. Skóra staje się bardziej nawilżona, gładka i promienna, a drobne zmarszczki mniej widoczne.',
    forWhom: ['skóra odwodniona i szara', 'pierwsze zmarszczki', 'zmęczona skóra po lecie lub po zimie'],
    steps: 'Oczyszczenie i dezynfekcja, krem znieczulający, mikroiniekcje, maska kojąca.',
    results: 'Pierwszy efekt nawilżenia po kilku dniach, pełny po serii zabiegów.',
    series: 'Seria 3–4 zabiegów co 2–3 tygodnie, potem zabieg przypominający co kilka miesięcy.'
  },
  {
    id: 'mezo-tsd', category: 'mezoterapia', name: 'Mezoterapia igłowa — twarz, szyja, dekolt', duration: 60, price: 650, from: true,
    short: 'To samo działanie co na twarzy, rozszerzone na szyję i dekolt.',
    desc: 'Szyja i dekolt starzeją się szybciej niż twarz, a w codziennej pielęgnacji często są pomijane. Jeden zabieg obejmuje wszystkie trzy okolice.',
    forWhom: ['utrata jędrności skóry szyi i dekoltu', 'drobne zmarszczki na szyi', 'skóra odwodniona'],
    steps: 'Oczyszczenie i dezynfekcja, krem znieczulający, mikroiniekcje, maska kojąca.',
    results: 'Lepsze nawilżenie i napięcie skóry, narastające z każdym zabiegiem serii.',
    series: 'Seria 3–4 zabiegów co 2–3 tygodnie.'
  },
  {
    id: 'mezo-oczy', category: 'mezoterapia', name: 'Mezoterapia igłowa — okolice oczu', duration: 30, price: 400, from: true,
    short: 'Preparaty do cienkiej skóry pod oczami: na cienie, obrzęki i drobne zmarszczki.',
    desc: 'Skóra wokół oczu jest najcieńsza na twarzy, dlatego używamy preparatów stworzonych specjalnie dla tej okolicy. Rozjaśniają cienie, zmniejszają obrzęki i wygładzają „kurze łapki”.',
    forWhom: ['cienie i opuchnięcia pod oczami', 'drobne zmarszczki wokół oczu', 'zmęczone spojrzenie'],
    steps: 'Dezynfekcja, krem znieczulający, delikatne mikroiniekcje, okłady chłodzące.',
    results: 'Rozjaśnienie i wygładzenie skóry po serii zabiegów.',
    series: 'Seria 3–4 zabiegów co 2 tygodnie.'
  },
  {
    id: 'mezo-glowa', category: 'mezoterapia', name: 'Mezoterapia igłowa — skóra głowy', duration: 40, price: 450, from: true,
    short: 'Koktajl z witaminami i peptydami, który wzmacnia mieszki włosowe.',
    desc: 'Mikroiniekcje podajemy bezpośrednio w skórę głowy. Składniki aktywne pobudzają mieszki włosowe i poprawiają kondycję włosów. Przy nagłym lub dużym wypadaniu włosów warto najpierw wykonać badania i skonsultować się z lekarzem.',
    forWhom: ['nadmierne wypadanie włosów, np. sezonowe, po ciąży lub po stresie', 'przerzedzone włosy', 'osłabione, cienkie włosy'],
    steps: 'Dezynfekcja skóry głowy, mikroiniekcje wzdłuż przedziałków.',
    results: 'Mniej wypadających włosów po kilku zabiegach, nowe baby hair po 2–3 miesiącach.',
    series: 'Seria 4–6 zabiegów co 2 tygodnie.'
  },
  {
    id: 'mikro-twarz', category: 'mezoterapia', name: 'Mezoterapia mikroigłowa — twarz', duration: 60, price: 350, from: true,
    short: 'Mikrokanały w skórze, przez które wnika preparat, i pobudzenie produkcji kolagenu.',
    desc: 'Urządzenie z mikroigłami wykonuje w skórze tysiące mikrokanałów. Przez nie wnika dobrany preparat, a kontrolowane mikrouszkodzenia pobudzają skórę do produkcji kolagenu.',
    forWhom: ['rozszerzone pory', 'blizny potrądzikowe', 'nierówna faktura skóry i przebarwienia', 'utrata jędrności'],
    steps: 'Oczyszczenie, krem znieczulający, praca urządzeniem z preparatem, maska kojąca.',
    results: 'Skóra jest zaróżowiona przez 1–2 dni. Poprawa faktury i jędrności narasta przez kolejne tygodnie.',
    series: 'Seria 3–6 zabiegów co 4 tygodnie.'
  },
  {
    id: 'mikro-tsd', category: 'mezoterapia', name: 'Mezoterapia mikroigłowa — twarz, szyja, dekolt', duration: 75, price: 500, from: true,
    short: 'Mezoterapia mikroigłowa w wersji na trzy okolice.',
    desc: 'Ten sam zabieg co na twarzy, obejmujący też szyję i dekolt. Dobry wybór przy utracie jędrności i drobnych zmarszczkach na szyi.',
    forWhom: ['utrata jędrności szyi i dekoltu', 'nierówna faktura skóry', 'przebarwienia na dekolcie'],
    steps: 'Oczyszczenie, krem znieczulający, praca urządzeniem z preparatem, maska kojąca.',
    results: 'Gładsza i jędrniejsza skóra, efekt narasta przez kilka tygodni.',
    series: 'Seria 3–6 zabiegów co 4 tygodnie.'
  },

  // Stymulatory tkankowe
  {
    id: 'stym-ha', category: 'stymulatory', name: 'Stymulator z kwasem hialuronowym (np. Profhilo)', duration: 45, price: 1300, from: true,
    short: 'Wysokie stężenie czystego kwasu hialuronowego: nawilżenie i wyraźne ujędrnienie.',
    desc: 'Preparat podajemy w kilku punktach po każdej stronie twarzy. Rozprowadza się w skórze, intensywnie ją nawilża i pobudza do odbudowy. Skóra staje się jędrniejsza i bardziej elastyczna, a rysy twarzy się nie zmieniają.',
    forWhom: ['utrata jędrności i elastyczności', 'skóra cienka i wiotka', 'profilaktyka starzenia po 30. roku życia'],
    steps: 'Konsultacja, dezynfekcja, podanie preparatu w 5 punktach po każdej stronie twarzy.',
    results: 'Efekt narasta przez kilka tygodni i utrzymuje się ok. 6 miesięcy.',
    series: '2 zabiegi w odstępie 4 tygodni.'
  },
  {
    id: 'stym-pn', category: 'stymulatory', name: 'Polinukleotydy (np. Nucleofill)', duration: 45, price: 1250, from: true,
    short: 'Wsparcie regeneracji komórek: gęstsza, napięta skóra.',
    desc: 'Polinukleotydy to naturalne fragmenty DNA, które wspierają regenerację komórek skóry. Poprawiają jej gęstość i napięcie oraz wygładzają drobne zmarszczki.',
    forWhom: ['skóra cienka, zmęczona, z utratą gęstości', 'okolica oczu i szyja (po kwalifikacji)', 'skóra po intensywnym słońcu'],
    steps: 'Konsultacja, dezynfekcja, krem znieczulający, podanie preparatu.',
    results: 'Poprawa gęstości i jakości skóry po serii zabiegów.',
    series: 'Seria 3 zabiegów co 2–3 tygodnie.'
  },
  {
    id: 'stym-amino', category: 'stymulatory', name: 'Biostymulator z aminokwasami (np. Sunekos)', duration: 45, price: 900, from: true,
    short: 'Kwas hialuronowy i aminokwasy, z których skóra buduje kolagen i elastynę.',
    desc: 'Połączenie kwasu hialuronowego z kompleksem aminokwasów. Poprawia nawilżenie, elastyczność i koloryt skóry. Ma też wariant przeznaczony do okolicy oczu.',
    forWhom: ['pierwsze oznaki starzenia', 'skóra odwodniona i szara', 'okolica oczu'],
    steps: 'Konsultacja, dezynfekcja, krem znieczulający, podanie preparatu.',
    results: 'Skóra jest bardziej nawilżona i promienna po kilku zabiegach.',
    series: 'Seria 4 zabiegów co 7–10 dni.'
  },

  // Peelingi chemiczne
  {
    id: 'kwas-migdalowy', category: 'peelingi', name: 'Peeling kwasem migdałowym', duration: 45, price: 230,
    short: 'Łagodny kwas, który wygładza, rozjaśnia i działa antybakteryjnie.',
    desc: 'Kwas migdałowy ma dużą cząsteczkę, dlatego wnika powoli i rzadko podrażnia. To dobry wybór na pierwszy peeling i dla skóry wrażliwej.',
    forWhom: ['cera trądzikowa i tłusta', 'przebarwienia', 'skóra wrażliwa i naczynkowa'],
    steps: 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.',
    results: 'Gładsza, jaśniejsza skóra po kilku zabiegach.',
    series: 'Seria 4–6 zabiegów co 7–14 dni.'
  },
  {
    id: 'kwas-pirogronowy', category: 'peelingi', name: 'Peeling kwasem pirogronowym', duration: 45, price: 260,
    short: 'Silniejszy kwas na pory, zaskórniki i nadmiar sebum.',
    desc: 'Kwas pirogronowy oczyszcza pory, reguluje wydzielanie sebum i pobudza odnowę naskórka. Nie zalecamy go przy skórze naczynkowej.',
    forWhom: ['cera tłusta z zaskórnikami', 'rozszerzone pory', 'płytkie blizny potrądzikowe'],
    steps: 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.',
    results: 'Oczyszczone pory i wyrównana faktura skóry po serii.',
    series: 'Seria 4–6 zabiegów co 2 tygodnie.'
  },
  {
    id: 'mezopeeling', category: 'peelingi', name: 'Mezopeeling', duration: 50, price: 300,
    short: 'Profesjonalny peeling łączący kilka kwasów, dobrany do konkretnego problemu.',
    desc: 'Mezopeeling łączy kilka kwasów ze składnikami aktywnymi. Wybieramy wariant do problemu skóry: przebarwień, trądziku lub oznak starzenia.',
    forWhom: ['przebarwienia', 'trądzik', 'szara, zmęczona skóra'],
    steps: 'Demakijaż i oczyszczenie, nałożenie peelingu, neutralizacja, maska i krem z filtrem.',
    results: 'Rozjaśnienie i odświeżenie skóry, wyraźne po serii.',
    series: 'Seria 3–6 zabiegów co 2–3 tygodnie.'
  },
  {
    id: 'prx-twarz', category: 'peelingi', name: 'Peeling PRX-T33 — twarz', duration: 40, price: 400,
    short: 'TCA 33% bez wyraźnego złuszczania: jędrność i blask bez przerwy w codzienności.',
    desc: 'Peeling łączy 33% kwas trójchlorooctowy (TCA) z nadtlenkiem wodoru i kwasem kojowym. Działa w głębszych warstwach skóry, a na powierzchni prawie jej nie złuszcza, dlatego zwykle nie wymaga przerwy od codziennych obowiązków.',
    forWhom: ['utrata jędrności', 'blizny potrądzikowe', 'szara skóra przed ważnym wyjściem'],
    steps: 'Oczyszczenie, wmasowanie preparatu w kilku warstwach, zmycie, krem kojący z filtrem.',
    results: 'Napięta, rozświetlona skóra od razu po zabiegu, efekt odbudowy narasta po serii.',
    series: 'Seria 4–5 zabiegów co tydzień.'
  },
  {
    id: 'prx-tsd', category: 'peelingi', name: 'Peeling PRX-T33 — twarz, szyja, dekolt', duration: 50, price: 500,
    short: 'PRX-T33 w wersji na trzy okolice.',
    desc: 'Ten sam zabieg co na twarzy, obejmujący też szyję i dekolt. Można go wykonywać przez cały rok, pod warunkiem codziennego stosowania kremu z filtrem.',
    forWhom: ['utrata jędrności szyi i dekoltu', 'przebarwienia na dekolcie', 'drobne zmarszczki'],
    steps: 'Oczyszczenie, wmasowanie preparatu w kilku warstwach, zmycie, krem kojący z filtrem.',
    results: 'Napięta, rozświetlona skóra, efekt narasta po serii.',
    series: 'Seria 4–5 zabiegów co tydzień.'
  }
];
