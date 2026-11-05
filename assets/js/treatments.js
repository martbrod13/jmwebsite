/*
 * Zabiegi i cennik.
 * Ceny to średnie z krakowskich gabinetów (Booksy, kliniki.pl, listopad 2026) —
 * do zastąpienia cenami gabinetu. Można je też zmieniać w panelu gabinetu (panel.html).
 * duration — czas wizyty w minutach (używany przez kalendarz rezerwacji).
 * Pola opisu: what (czym jest), how (na czym polega), helps (na co pomaga),
 * when (kiedy się stosuje), benefits (zalety), steps (przebieg), results (efekty), series (seria).
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
  // ---------- Makijaż permanentny ----------
  {
    id: 'pmu-brwi', category: 'makijaz-permanentny', name: 'Brwi pudrowe (ombre)', duration: 150, price: 850,
    short: 'Miękko cieniowane brwi, jak dobrze wykonany makijaż cieniem.',
    what: 'Makijaż permanentny brwi wykonany techniką pudrową, czyli delikatnym cieniowaniem. Brwi wyglądają jak podkreślone cieniem lub pudrem: miękko, bez ostrych konturów.',
    how: 'Pigment wprowadzamy płytko w skórę cienką igłą, punkt po punkcie. Nasadę brwi zostawiamy jaśniejszą, a łuk i ogon cieniujemy mocniej, dzięki czemu kolor przechodzi naturalnie. Kształt rysujemy najpierw na skórze i zaczynamy pigmentację dopiero wtedy, gdy projekt Ci odpowiada.',
    helps: ['rzadkie, przerzedzone lub jasne brwi', 'asymetria i nierówny kształt', 'luki po wyskubywaniu', 'brwi, które ścierają się w ciągu dnia'],
    when: 'Gdy codziennie dorysowujesz brwi albo chcesz wyglądać dobrze bez makijażu: na basenie, na treningu, na urlopie. Technika pudrowa dobrze sprawdza się też przy cerze tłustej, na której efekt włoskowy szybko się rozmywa.',
    benefits: ['oszczędność czasu przy codziennym makijażu', 'brwi odporne na wodę, pot i upał', 'kształt dopasowany do proporcji twarzy', 'naturalny efekt, który z czasem stopniowo jaśnieje'],
    steps: 'Konsultacja i dobór koloru, rysunek wstępny, znieczulenie kremem, pigmentacja.',
    results: 'Zaraz po zabiegu kolor jest wyraźnie ciemniejszy, a po wygojeniu jaśnieje. Ostateczny efekt widać po ok. 4 tygodniach. Utrzymuje się zwykle 1–3 lata.',
    series: 'Zabieg i korekta po 4–8 tygodniach.'
  },
  {
    id: 'pmu-usta', category: 'makijaz-permanentny', name: 'Usta — kontur z wypełnieniem', duration: 150, price: 850,
    short: 'Wyrównany kontur i kolor: od naturalnie zaróżowionych ust po delikatną pomadkę.',
    what: 'Makijaż permanentny ust, który wyrównuje kontur i nadaje ustom kolor. Efekt może być bardzo subtelny, jak naturalnie zaróżowione usta, albo wyraźniejszy, jak delikatna pomadka.',
    how: 'Pigment w odcieniu dobranym do karnacji wprowadzamy wzdłuż konturu i w czerwień wargową, cieniując go od brzegu ku środkowi. Usta wyglądają na pełniejsze i bardziej symetryczne, choć ich objętość się nie zmienia.',
    helps: ['blade lub nierówne w kolorze usta', 'zatarty, nieregularny kontur', 'drobna asymetria ust', 'usta, które z wiekiem straciły kolor'],
    when: 'Gdy chcesz zrezygnować z codziennej pomadki albo poprawić kształt ust bez wypełniaczy. Jeśli miewasz opryszczkę, przed zabiegiem potrzebna jest profilaktyka uzgodniona z lekarzem.',
    benefits: ['świeży wygląd ust bez makijażu', 'optycznie pełniejsze i bardziej symetryczne usta', 'kolor, który nie ściera się przy jedzeniu i piciu', 'odcień dopasowany do karnacji'],
    steps: 'Konsultacja i dobór koloru, rysunek konturu, znieczulenie kremem, pigmentacja.',
    results: 'Przez pierwsze dni kolor jest intensywny, potem jaśnieje i staje się naturalny. Efekt utrzymuje się zwykle 1–3 lata.',
    series: 'Zabieg i korekta po 4–8 tygodniach.'
  },
  {
    id: 'pmu-kreska', category: 'makijaz-permanentny', name: 'Kreska górna (eyeliner)', duration: 120, price: 650,
    short: 'Kreska nad linią rzęs, która optycznie zagęszcza rzęsy i otwiera spojrzenie.',
    what: 'Makijaż permanentny powieki w formie kreski nad linią rzęs: od cienkiej linii przy rzęsach po delikatnie wydłużony eyeliner.',
    how: 'Pigment wprowadzamy tuż nad linią rzęs górnej powieki. Grubość, długość i zakończenie kreski projektujemy pod kształt oka i opadanie powieki, tak żeby kreska wyglądała dobrze i przy otwartym, i przy przymkniętym oku.',
    helps: ['jasne lub rzadkie rzęsy', 'mało wyraziste spojrzenie', 'trudność z równym malowaniem kreski', 'uczulenie na kosmetyki do oczu'],
    when: 'Gdy codziennie malujesz kreskę albo chcesz ograniczyć kosmetyki przy wrażliwych oczach. Soczewki kontaktowe trzeba wyjąć na czas zabiegu.',
    benefits: ['wyraziste oko od samego rana', 'kreska, która się nie rozmazuje i nie odbija na powiece', 'optycznie gęstsze rzęsy', 'mniej kosmetyków przy oczach'],
    steps: 'Projekt kreski, znieczulenie kremem, pigmentacja.',
    results: 'Lekki obrzęk powiek mija zwykle po 1–2 dniach. Efekt utrzymuje się 1–3 lata.',
    series: 'Zabieg i korekta po 4–8 tygodniach.'
  },
  {
    id: 'pmu-rzesy', category: 'makijaz-permanentny', name: 'Zagęszczenie linii rzęs', duration: 90, price: 450,
    short: 'Pigment między rzęsami: oko wygląda wyraziściej, a kreski nie widać.',
    what: 'Najbardziej naturalny rodzaj makijażu permanentnego oka. Pigment wypełnia przestrzenie między rzęsami i nie tworzy widocznej kreski.',
    how: 'Pigment wprowadzamy punktowo pomiędzy nasadami rzęs górnej powieki. Linia rzęs staje się ciemniejsza i bardziej zwarta, więc rzęsy wyglądają na gęstsze, a oko na podkreślone.',
    helps: ['jasne lub rzadkie rzęsy', 'prześwity w linii rzęs', 'zmęczone, mało wyraziste spojrzenie'],
    when: 'Gdy nie lubisz efektu kreski, ale chcesz podkreślić oko. Dobrze uzupełnia też laminację lub przedłużanie rzęs.',
    benefits: ['subtelny efekt, którego nie widać jako makijażu', 'oko podkreślone także bez tuszu', 'krótszy zabieg i szybsze gojenie niż przy kresce'],
    steps: 'Znieczulenie kremem i pigmentacja linii rzęs.',
    results: 'Efekt widoczny od razu, ostateczny po wygojeniu. Utrzymuje się 1–3 lata.',
    series: 'Zabieg i korekta po 4–8 tygodniach.'
  },
  {
    id: 'pmu-korekta', category: 'makijaz-permanentny', name: 'Korekta po 4–8 tygodniach', duration: 90, price: 300,
    short: 'Uzupełnienie pigmentu po wygojeniu: naturalny etap makijażu permanentnego.',
    what: 'Drugi, uzupełniający etap każdego makijażu permanentnego.',
    how: 'Podczas gojenia skóra przyjmuje pigment nierównomiernie, a część koloru złuszcza się razem z naskórkiem. Na korekcie oceniamy efekt, uzupełniamy pigment w jaśniejszych miejscach i dopracowujemy kształt.',
    helps: ['prześwity i nierówny kolor po wygojeniu', 'drobne poprawki kształtu'],
    when: '4–8 tygodni po makijażu permanentnym wykonanym w gabinecie, gdy skóra jest w pełni wygojona.',
    benefits: ['równy, pełny kolor', 'trwalszy efekt', 'możliwość dopracowania szczegółów'],
    steps: 'Ocena wygojenia, uzupełnienie pigmentu.',
    results: 'Ostateczny kształt i kolor makijażu permanentnego.',
    series: 'Jednorazowo.'
  },
  {
    id: 'pmu-odswiezenie', category: 'makijaz-permanentny', name: 'Odświeżenie makijażu permanentnego', duration: 120, price: 350, from: true,
    short: 'Przywrócenie koloru, gdy pigment z czasem zblednie.',
    what: 'Ponowna pigmentacja makijażu permanentnego, który z czasem wyblakł.',
    how: 'Pod wpływem słońca i naturalnej odnowy skóry pigment stopniowo jaśnieje. Odświeżając makijaż, przywracamy nasycenie koloru i ostrość konturu, a w razie potrzeby lekko korygujemy kształt.',
    helps: ['wyblakły lub nierówny kolor', 'rozmyty kontur', 'chęć delikatnej zmiany kształtu'],
    when: 'Zwykle co 12–24 miesiące, gdy kolor przestaje być wyraźny. Makijaż wykonany w innym gabinecie odświeżamy po konsultacji.',
    benefits: ['efekt jak po świeżym zabiegu', 'krótsze gojenie niż przy pierwszej pigmentacji', 'utrzymanie kształtu na lata'],
    steps: 'Ocena pigmentu, korekta kształtu, pigmentacja.',
    results: 'Odświeżony kolor na kolejne 1–2 lata.',
    series: 'Jednorazowo, w razie potrzeby z korektą.'
  },

  // ---------- Mezoterapia ----------
  {
    id: 'mezo-twarz', category: 'mezoterapia', name: 'Mezoterapia igłowa — twarz', duration: 45, price: 450, from: true,
    short: 'Nawilżenie, blask i odżywienie skóry podane prosto tam, gdzie działają.',
    what: 'Zabieg, w którym składniki aktywne podajemy bezpośrednio w skórę za pomocą bardzo cienkiej igły. To jeden z najskuteczniejszych sposobów, żeby dostarczyć skórze nawilżenia i odżywienia.',
    how: 'Seria płytkich mikroiniekcji wprowadza do skóry koktajl dobrany do jej potrzeb: z kwasem hialuronowym, witaminami, aminokwasami lub peptydami. Składniki trafiają tam, gdzie krem nie dociera, a drobne nakłucia dodatkowo pobudzają skórę do regeneracji.',
    helps: ['odwodnienie i szarość skóry', 'utrata blasku i jędrności', 'pierwsze zmarszczki', 'skóra zmęczona stresem, słońcem lub chorobą'],
    when: 'Jako regularna pielęgnacja od ok. 25.–30. roku życia, przed ważnym wydarzeniem albo po lecie i zimie, gdy skóra jest przesuszona. Najlepsze efekty daje seria zabiegów.',
    benefits: ['wyraźne nawilżenie już po pierwszym zabiegu', 'preparat dobrany do Twojej skóry', 'krótki zabieg bez długiej rekonwalescencji', 'dobrze łączy się z peelingami chemicznymi'],
    steps: 'Oczyszczenie i dezynfekcja, krem znieczulający, mikroiniekcje, maska kojąca.',
    results: 'Skóra jest nawilżona i promienna po kilku dniach, a efekt narasta z każdym zabiegiem serii.',
    series: '3–4 zabiegi co 2–3 tygodnie, potem zabieg przypominający co kilka miesięcy.'
  },
  {
    id: 'mezo-tsd', category: 'mezoterapia', name: 'Mezoterapia igłowa — twarz, szyja, dekolt', duration: 60, price: 650, from: true,
    short: 'Mezoterapia na trzy okolice, które starzeją się razem.',
    what: 'Mezoterapia igłowa obejmująca twarz, szyję i dekolt, czyli okolice, które starzeją się razem, a w codziennej pielęgnacji często są pomijane.',
    how: 'Tak jak przy mezoterapii twarzy podajemy koktajl składników aktywnych serią płytkich mikroiniekcji, ale na większym obszarze. Skóra szyi i dekoltu jest cieńsza, więc dobieramy do niej preparat i technikę.',
    helps: ['wiotka, cienka skóra szyi', 'poziome zmarszczki na szyi', 'przesuszony, szorstki dekolt', 'różnica w wyglądzie skóry twarzy i szyi'],
    when: 'Gdy zauważasz, że szyja i dekolt wyglądają starzej niż twarz, a także jako pielęgnacja po lecie.',
    benefits: ['spójny efekt na trzech okolicach w jednej wizycie', 'lepsze nawilżenie i napięcie skóry szyi', 'korzystniejsza cena niż osobne zabiegi'],
    steps: 'Oczyszczenie i dezynfekcja, krem znieczulający, mikroiniekcje, maska kojąca.',
    results: 'Lepsze nawilżenie i napięcie skóry, narastające z każdym zabiegiem serii.',
    series: '3–4 zabiegi co 2–3 tygodnie.'
  },
  {
    id: 'mezo-oczy', category: 'mezoterapia', name: 'Mezoterapia igłowa — okolice oczu', duration: 30, price: 400, from: true,
    short: 'Delikatna mezoterapia na cienie, obrzęki i drobne zmarszczki pod oczami.',
    what: 'Mezoterapia przeznaczona dla najcieńszej i najdelikatniejszej skóry na twarzy: okolicy pod oczami i wokół nich.',
    how: 'Używamy preparatów stworzonych specjalnie do okolicy oka, zwykle z peptydami i niskocząsteczkowym kwasem hialuronowym. Wspierają mikrokrążenie, wzmacniają cienką skórę i poprawiają jej nawilżenie.',
    helps: ['cienie pod oczami', 'poranne obrzęki', 'drobne zmarszczki, tzw. kurze łapki', 'cienka, zmęczona skóra pod oczami'],
    when: 'Gdy kremy pod oczy przestają wystarczać, przy pierwszych zmarszczkach mimicznych albo po okresie niewyspania i stresu.',
    benefits: ['rozjaśnione, wypoczęte spojrzenie', 'zabieg dostosowany do cienkiej skóry', 'bez przerwy w codziennych obowiązkach (możliwe drobne siniaki)'],
    steps: 'Dezynfekcja, krem znieczulający, delikatne mikroiniekcje, okłady chłodzące.',
    results: 'Rozjaśnienie i wygładzenie skóry widoczne po serii zabiegów.',
    series: '3–4 zabiegi co 2 tygodnie.'
  },
  {
    id: 'mezo-glowa', category: 'mezoterapia', name: 'Mezoterapia igłowa — skóra głowy', duration: 40, price: 450, from: true,
    short: 'Wzmocnienie włosów od cebulek i mniej wypadających włosów.',
    what: 'Zabieg wzmacniający włosy od cebulek, w którym składniki odżywcze podajemy bezpośrednio w skórę głowy.',
    how: 'Mikroiniekcjami wprowadzamy koktajl z witaminami, aminokwasami, peptydami i składnikami pobudzającymi mikrokrążenie. Mieszki włosowe dostają to, czego potrzebują do wzrostu, a skóra głowy jest lepiej ukrwiona i odżywiona.',
    helps: ['nadmierne wypadanie włosów', 'przerzedzenie i prześwity', 'cienkie, osłabione, wolno rosnące włosy'],
    when: 'Przy sezonowym wypadaniu włosów jesienią i wiosną, po ciąży, po okresie stresu lub odchudzania. Przy nagłym lub dużym wypadaniu warto najpierw wykonać badania i skonsultować się z lekarzem.',
    benefits: ['mniej wypadających włosów', 'wzmocnione cebulki i nowe, krótkie włoski', 'włosy można umyć już następnego dnia'],
    steps: 'Dezynfekcja skóry głowy, mikroiniekcje wzdłuż przedziałków.',
    results: 'Mniejsze wypadanie po kilku zabiegach, nowe włosy po 2–3 miesiącach.',
    series: '4–6 zabiegów co 2 tygodnie.'
  },
  {
    id: 'mikro-twarz', category: 'mezoterapia', name: 'Mezoterapia mikroigłowa — twarz', duration: 60, price: 350, from: true,
    short: 'Gładsza faktura skóry, mniejsze pory i odbudowa kolagenu.',
    what: 'Zabieg wykonywany urządzeniem z mikroigłami (tzw. dermapenem), który łączy dwa działania: wprowadzanie składników aktywnych i pobudzanie produkcji kolagenu.',
    how: 'Urządzenie wykonuje w skórze tysiące mikrokanałów na kontrolowanej głębokości. Przez nie wnika dobrany preparat, a mikrouszkodzenia uruchamiają naturalny proces naprawczy skóry, w którym powstaje nowy kolagen i elastyna.',
    helps: ['rozszerzone pory', 'blizny potrądzikowe', 'nierówna faktura i koloryt', 'przebarwienia', 'utrata jędrności i drobne zmarszczki'],
    when: 'Gdy zależy Ci na poprawie struktury skóry, a nie tylko na nawilżeniu. Serię najlepiej wykonać jesienią i zimą.',
    benefits: ['wyraźna poprawa faktury skóry', 'efekt odbudowy, który narasta przez tygodnie', 'głębokość i preparat dobierane do problemu', 'można łączyć z peelingami chemicznymi'],
    steps: 'Oczyszczenie, krem znieczulający, praca urządzeniem z preparatem, maska kojąca.',
    results: 'Skóra jest zaróżowiona przez 1–2 dni. Poprawa faktury i jędrności narasta przez kolejne tygodnie.',
    series: '3–6 zabiegów co 4 tygodnie.'
  },
  {
    id: 'mikro-tsd', category: 'mezoterapia', name: 'Mezoterapia mikroigłowa — twarz, szyja, dekolt', duration: 75, price: 500, from: true,
    short: 'Mezoterapia mikroigłowa w wersji na trzy okolice.',
    what: 'Mezoterapia mikroigłowa obejmująca twarz, szyję i dekolt w jednym zabiegu.',
    how: 'Mikroigły tworzą w skórze kanały, przez które wnika preparat, i pobudzają produkcję kolagenu. Na szyi i dekolcie pracujemy płycej, bo skóra jest tam cieńsza.',
    helps: ['utrata jędrności szyi i dekoltu', 'nierówna faktura skóry', 'przebarwienia na dekolcie', 'drobne zmarszczki na szyi'],
    when: 'Gdy chcesz poprawić jakość skóry na całym obszarze, który najczęściej zdradza wiek. Najlepiej jesienią i zimą.',
    benefits: ['odbudowa skóry na trzech okolicach w jednej wizycie', 'gładsza i jędrniejsza skóra szyi', 'korzystniejsza cena niż osobne zabiegi'],
    steps: 'Oczyszczenie, krem znieczulający, praca urządzeniem z preparatem, maska kojąca.',
    results: 'Gładsza i jędrniejsza skóra, efekt narasta przez kilka tygodni.',
    series: '3–6 zabiegów co 4 tygodnie.'
  },

  // ---------- Stymulatory tkankowe ----------
  {
    id: 'stym-ha', category: 'stymulatory', name: 'Stymulator z kwasem hialuronowym (np. Profhilo)', duration: 45, price: 1300, from: true,
    short: 'Intensywne nawilżenie i wyraźne ujędrnienie bez zmiany rysów twarzy.',
    what: 'Stymulator tkankowy z bardzo wysokim stężeniem czystego kwasu hialuronowego. To nie wypełniacz: nie zmienia rysów twarzy, tylko poprawia jakość skóry.',
    how: 'Preparat podajemy w kilku punktach po każdej stronie twarzy. W skórze rozprowadza się równomiernie, intensywnie ją nawilża i pobudza komórki do produkcji kolagenu i elastyny. Skóra stopniowo staje się gęstsza i bardziej sprężysta.',
    helps: ['utrata jędrności i elastyczności', 'skóra wiotka, cienka, zmęczona', 'drobne zmarszczki i brak blasku', 'skóra szyi i dekoltu (po kwalifikacji)'],
    when: 'Gdy skóra zaczyna tracić jędrność, zwykle po 30. roku życia, a także jako profilaktyka starzenia. Dobry wybór, jeśli chcesz wyglądać młodziej, ale nie inaczej.',
    benefits: ['naturalny efekt bez zmiany rysów', 'tylko kilka punktów podania', 'efekt utrzymujący się ok. 6 miesięcy', 'szybki powrót do codzienności'],
    steps: 'Konsultacja, dezynfekcja, podanie preparatu w 5 punktach po każdej stronie twarzy.',
    results: 'Efekt narasta przez kilka tygodni i utrzymuje się ok. 6 miesięcy.',
    series: '2 zabiegi co 4 tygodnie, potem zabieg podtrzymujący co ok. 6 miesięcy.'
  },
  {
    id: 'stym-pn', category: 'stymulatory', name: 'Polinukleotydy (np. Nucleofill)', duration: 45, price: 1250, from: true,
    short: 'Regeneracja i odbudowa cienkiej, osłabionej skóry.',
    what: 'Stymulator tkankowy z polinukleotydami, czyli oczyszczonymi fragmentami DNA pochodzenia naturalnego. Działa przede wszystkim regenerująco.',
    how: 'Polinukleotydy dostarczają skórze materiału do odnowy komórek i pobudzają fibroblasty, czyli komórki produkujące kolagen. Wspierają też nawilżenie i łagodzą stany zapalne, dlatego dobrze sprawdzają się przy skórze cienkiej i osłabionej.',
    helps: ['cienka, osłabiona skóra', 'utrata gęstości i napięcia', 'drobne zmarszczki, także wokół oczu', 'skóra zniszczona słońcem'],
    when: 'Gdy skóra potrzebuje przede wszystkim regeneracji: po lecie, przy pierwszych oznakach starzenia albo jako przygotowanie do innych zabiegów odmładzających.',
    benefits: ['silne działanie regenerujące', 'gęstsza, bardziej napięta skóra', 'możliwość pracy w delikatnych okolicach (po kwalifikacji)'],
    steps: 'Konsultacja, dezynfekcja, krem znieczulający, podanie preparatu.',
    results: 'Skóra jest gęstsza, bardziej napięta i wypoczęta po serii zabiegów.',
    series: '3 zabiegi co 2–3 tygodnie.'
  },
  {
    id: 'stym-amino', category: 'stymulatory', name: 'Biostymulator z aminokwasami (np. Sunekos)', duration: 45, price: 900, from: true,
    short: 'Kwas hialuronowy i aminokwasy, z których skóra buduje kolagen.',
    what: 'Biostymulator łączący kwas hialuronowy z kompleksem aminokwasów, czyli cegiełek, z których skóra buduje kolagen i elastynę.',
    how: 'Kwas hialuronowy nawilża i tworzy w skórze środowisko sprzyjające odbudowie, a aminokwasy dostarczają składników do produkcji nowych włókien. Skóra odzyskuje elastyczność i równiejszy koloryt.',
    helps: ['pierwsze oznaki starzenia', 'skóra odwodniona, szara i bez blasku', 'utrata elastyczności', 'okolica oczu (wariant dedykowany)'],
    when: 'Gdy chcesz wesprzeć skórę na wczesnym etapie starzenia albo szukasz łagodniejszej alternatywy dla silniejszych stymulatorów.',
    benefits: ['naturalny efekt odświeżenia', 'lepsza elastyczność i koloryt', 'dobra tolerancja przez skórę wrażliwą'],
    steps: 'Konsultacja, dezynfekcja, krem znieczulający, podanie preparatu.',
    results: 'Skóra jest bardziej nawilżona, elastyczna i promienna po kilku zabiegach.',
    series: '4 zabiegi co 7–10 dni.'
  },

  // ---------- Peelingi chemiczne ----------
  {
    id: 'kwas-migdalowy', category: 'peelingi', name: 'Peeling kwasem migdałowym', duration: 45, price: 230,
    short: 'Łagodny kwas, który wygładza, rozjaśnia i działa antybakteryjnie.',
    what: 'Jeden z najłagodniejszych peelingów chemicznych. Kwas migdałowy należy do kwasów AHA i jest pozyskiwany z gorzkich migdałów.',
    how: 'Kwas rozluźnia połączenia między martwymi komórkami naskórka, które dzięki temu łatwiej się złuszczają. Ma dużą cząsteczkę, więc wnika powoli i równomiernie i rzadko podrażnia. Działa też antybakteryjnie.',
    helps: ['trądzik i zaskórniki', 'przebarwienia, także potrądzikowe', 'cera tłusta i mieszana', 'szara, zmęczona skóra'],
    when: 'Od jesieni do wiosny. To dobry pierwszy peeling i dobry wybór dla skóry wrażliwej i naczynkowej.',
    benefits: ['łagodne działanie i małe ryzyko podrażnień', 'zwykle bez widocznego łuszczenia', 'odpowiedni dla większości typów skóry', 'wygładzona i rozjaśniona skóra'],
    steps: 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.',
    results: 'Gładsza, jaśniejsza i oczyszczona skóra, wyraźnie po kilku zabiegach.',
    series: '4–6 zabiegów co 7–14 dni.'
  },
  {
    id: 'kwas-pirogronowy', category: 'peelingi', name: 'Peeling kwasem pirogronowym', duration: 45, price: 260,
    short: 'Silniejszy kwas na pory, zaskórniki i nadmiar sebum.',
    what: 'Peeling chemiczny kwasem pirogronowym, który działa silniej niż kwas migdałowy i szczególnie dobrze sprawdza się przy cerze tłustej.',
    how: 'Kwas złuszcza naskórek, a jednocześnie wnika w ujścia gruczołów łojowych, oczyszcza je i ogranicza wydzielanie sebum. Pobudza też skórę do odnowy i produkcji kolagenu.',
    helps: ['cera tłusta, z zaskórnikami', 'trądzik', 'rozszerzone pory', 'płytkie blizny potrądzikowe'],
    when: 'Od jesieni do wiosny, przy cerze tłustej i trądzikowej. Nie zalecamy go przy skórze naczynkowej i bardzo wrażliwej.',
    benefits: ['skuteczne oczyszczenie porów', 'matowa, mniej przetłuszczająca się skóra', 'wygładzenie płytkich blizn'],
    steps: 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.',
    results: 'Oczyszczone pory i wyrównana faktura skóry po serii. Przez kilka dni możliwe delikatne łuszczenie.',
    series: '4–6 zabiegów co 2 tygodnie.'
  },
  {
    id: 'mezopeeling', category: 'peelingi', name: 'Mezopeeling', duration: 50, price: 300,
    short: 'Profesjonalny peeling łączący kilka kwasów, dobrany do konkretnego problemu.',
    what: 'Profesjonalny peeling łączący kilka kwasów ze składnikami aktywnymi w jednym preparacie. Każdy wariant jest przeznaczony do innego problemu skóry.',
    how: 'Kwasy złuszczają naskórek i ułatwiają wnikanie składników aktywnych, np. rozjaśniających, przeciwtrądzikowych lub odmładzających. Wariant i stężenie dobieramy po ocenie skóry.',
    helps: ['przebarwienia i melasma (w serii)', 'trądzik i zaskórniki', 'szara, zmęczona skóra', 'pierwsze oznaki starzenia'],
    when: 'Gdy potrzebujesz zabiegu celowanego w konkretny problem. Najlepiej jesienią i zimą.',
    benefits: ['preparat dopasowany do problemu skóry', 'złuszczanie i pielęgnacja w jednym zabiegu', 'widoczne odświeżenie skóry'],
    steps: 'Demakijaż i oczyszczenie, nałożenie peelingu, neutralizacja, maska i krem z filtrem.',
    results: 'Rozjaśniona, odświeżona skóra, wyraźny efekt po serii.',
    series: '3–6 zabiegów co 2–3 tygodnie.'
  },
  {
    id: 'prx-twarz', category: 'peelingi', name: 'Peeling PRX-T33 — twarz', duration: 40, price: 400,
    short: 'Biorewitalizacja bez igły: napięta, rozświetlona skóra od razu po zabiegu.',
    what: 'Peeling łączący 33% kwas trójchlorooctowy (TCA) z nadtlenkiem wodoru i kwasem kojowym. Nazywany jest biorewitalizacją bez igły.',
    how: 'Preparat wmasowujemy w skórę w kilku warstwach. TCA działa w głębszych warstwach skóry i pobudza produkcję kolagenu, a dzięki nadtlenkowi wodoru naskórek prawie się nie złuszcza. Skóra jest napięta i rozświetlona od razu po zabiegu.',
    helps: ['utrata jędrności i napięcia', 'blizny potrądzikowe', 'rozszerzone pory', 'szara skóra bez blasku'],
    when: 'Przed ważnym wyjściem, gdy skóra ma wyglądać świeżo od razu, albo w serii jako zabieg odmładzający. Można go wykonywać przez cały rok, pod warunkiem codziennego stosowania kremu z filtrem.',
    benefits: ['efekt widoczny od razu', 'bez igieł i zwykle bez widocznego łuszczenia', 'zabieg możliwy przez cały rok', 'szybki powrót do codzienności'],
    steps: 'Oczyszczenie, wmasowanie preparatu w kilku warstwach, zmycie, krem kojący z filtrem.',
    results: 'Napięta, rozświetlona skóra od razu po zabiegu, efekt odbudowy narasta po serii.',
    series: '4–5 zabiegów co tydzień.'
  },
  {
    id: 'prx-tsd', category: 'peelingi', name: 'Peeling PRX-T33 — twarz, szyja, dekolt', duration: 50, price: 500,
    short: 'PRX-T33 w wersji na trzy okolice.',
    what: 'Peeling PRX-T33 obejmujący twarz, szyję i dekolt w jednym zabiegu.',
    how: 'Ten sam preparat z 33% TCA, nadtlenkiem wodoru i kwasem kojowym wmasowujemy na większym obszarze. Pobudza produkcję kolagenu bez wyraźnego złuszczania naskórka.',
    helps: ['utrata jędrności szyi i dekoltu', 'przebarwienia na dekolcie', 'drobne zmarszczki', 'szara skóra bez blasku'],
    when: 'Gdy chcesz odświeżyć i ujędrnić skórę na całym obszarze, np. przed wydarzeniem, przy którym dekolt jest odsłonięty. Możliwy przez cały rok, z kremem z filtrem.',
    benefits: ['efekt na trzech okolicach w jednej wizycie', 'bez igieł i bez przerwy w codzienności', 'zabieg możliwy przez cały rok'],
    steps: 'Oczyszczenie, wmasowanie preparatu w kilku warstwach, zmycie, krem kojący z filtrem.',
    results: 'Napięta, rozświetlona skóra, efekt narasta po serii.',
    series: '4–5 zabiegów co tydzień.'
  }
];
