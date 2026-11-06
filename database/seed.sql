-- =====================================================================
--  Dane startowe. Wygenerowane przez: node database/generate-seed.js
--  Uruchom po schema.sql. Części oznaczone PRZYKŁAD to dane testowe.
-- =====================================================================
SET search_path = salon, public, extensions;
BEGIN;

-- Kategorie
INSERT INTO categories (id, name, lead, about, preparation, contraindications, aftercare, sort_order) VALUES ('konsultacja', 'Konsultacja', 'Ocena skóry i dobór zabiegów.', NULL, '{}'::text[], '{}'::text[], '{}'::text[], 0);
INSERT INTO categories (id, name, lead, about, preparation, contraindications, aftercare, sort_order) VALUES ('makijaz-permanentny', 'Makijaż permanentny', 'Brwi, usta i kreska, które wyglądają dobrze od rana, bez codziennego malowania.', 'Pigmentacja skóry, która podkreśla rysy twarzy na długie miesiące. Kształt i kolor dobieramy podczas konsultacji i rysunku wstępnego. Pigmentację zaczynamy dopiero wtedy, gdy projekt w pełni Ci odpowiada.', ARRAY['Na 7 dni przed zabiegiem odstaw kosmetyki z retinoidami i kwasami w okolicy zabiegowej.', 'Na 24 godziny przed zabiegiem nie pij alkoholu ani mocnej kawy.', 'Jeśli miewasz opryszczkę, przed pigmentacją ust porozmawiaj z lekarzem o profilaktyce.']::text[], ARRAY['ciąża i karmienie piersią', 'stan zapalny, opryszczka lub infekcja w miejscu zabiegu', 'niewyrównana cukrzyca', 'skłonność do bliznowców i keloidów', 'leczenie izotretynoiną (oraz 6 miesięcy po jego zakończeniu)', 'leki przeciwzakrzepowe — tylko po konsultacji z lekarzem', 'chemioterapia i radioterapia']::text[], ARRAY['Przez 7–10 dni nie drap i nie zdrapuj strupków.', 'Utrzymuj okolicę zabiegową w czystości i stosuj maść, którą zalecimy.', 'Przez 2 tygodnie unikaj sauny, basenu, solarium i mocnego słońca.', 'Korekta po 4–8 tygodniach jest częścią procesu: wtedy oceniamy, jak pigment się wygoił.']::text[], 1);
INSERT INTO categories (id, name, lead, about, preparation, contraindications, aftercare, sort_order) VALUES ('mezoterapia', 'Mezoterapia', 'Nawilżenie, blask i lepsza kondycja skóry dzięki składnikom podanym tam, gdzie działają.', 'Wprowadzenie do skóry koktajli z kwasem hialuronowym, witaminami, aminokwasami i peptydami. Składniki aktywne trafiają w głąb skóry, zamiast zostawać na powierzchni jak krem. Preparat dobieramy do potrzeb Twojej skóry.', ARRAY['Przez 3 dni przed zabiegiem unikaj alkoholu.', 'Leki rozrzedzające krew, np. aspirynę, odstaw tylko po konsultacji z lekarzem.', 'Przyjdź bez makijażu.']::text[], ARRAY['ciąża i karmienie piersią', 'infekcja skóry, opryszczka lub trądzik w stanie zapalnym w miejscu zabiegu', 'uczulenie na składniki preparatu', 'choroby autoimmunologiczne w fazie zaostrzenia', 'niewyrównana cukrzyca', 'leczenie przeciwzakrzepowe', 'choroba nowotworowa']::text[], ARRAY['Przez 24 godziny nie nakładaj makijażu.', 'Przez 48 godzin unikaj sauny, basenu i intensywnego wysiłku.', 'Przez 2 tygodnie stosuj krem z filtrem SPF 50.', 'Drobne grudki i zaczerwienienie znikają zwykle w ciągu 1–3 dni.']::text[], 2);
INSERT INTO categories (id, name, lead, about, preparation, contraindications, aftercare, sort_order) VALUES ('stymulatory', 'Stymulatory tkankowe', 'Jędrniejsza, gęstsza skóra bez zmiany rysów twarzy.', 'Preparaty, które pobudzają skórę do odbudowy: do produkcji kolagenu, elastyny i własnego kwasu hialuronowego. Nie wypełniają zmarszczek jak wypełniacz i nie zmieniają rysów twarzy. Poprawiają jakość skóry od środka.', ARRAY['Przez 3 dni przed zabiegiem unikaj alkoholu.', 'Nie planuj peelingów ani zabiegów laserowych na 2 tygodnie przed stymulatorem.', 'Przyjdź bez makijażu.']::text[], ARRAY['ciąża i karmienie piersią', 'infekcja lub stan zapalny skóry w miejscu zabiegu', 'uczulenie na składniki preparatu', 'choroby autoimmunologiczne w fazie zaostrzenia', 'leczenie przeciwzakrzepowe', 'choroba nowotworowa']::text[], ARRAY['Przez 24 godziny nie nakładaj makijażu.', 'Przez 2 dni nie masuj okolicy zabiegowej, chyba że zalecimy inaczej.', 'Przez 2 tygodnie unikaj sauny, solarium i mocnego słońca.', 'Grudki w miejscach podania wchłaniają się zwykle w ciągu kilkunastu godzin.']::text[], 3);
INSERT INTO categories (id, name, lead, about, preparation, contraindications, aftercare, sort_order) VALUES ('peelingi', 'Kwasy (peelingi chemiczne)', 'Zabiegi kwasami na przebarwienia, trądzik, pory i szarą skórę.', 'Kontrolowane złuszczanie naskórka za pomocą kwasów. Rodzaj i stężenie kwasu dobieramy do problemu i wrażliwości skóry. Najlepszy czas na serię to jesień i zima, gdy słońce jest słabsze.', ARRAY['Na tydzień przed zabiegiem odstaw retinoidy, peelingi mechaniczne i depilację w okolicy zabiegowej.', 'Nie opalaj się przez 2 tygodnie przed zabiegiem.']::text[], ARRAY['ciąża i karmienie piersią (dotyczy większości kwasów)', 'świeża opalenizna', 'opryszczka, rany lub stan zapalny skóry', 'leczenie izotretynoiną (oraz 6 miesięcy po jego zakończeniu)', 'uczulenie na składniki preparatu', 'zabieg laserowy w ostatnich tygodniach']::text[], ARRAY['Codziennie stosuj krem z filtrem SPF 50, także w pochmurne dni.', 'Nie zrywaj łuszczącego się naskórka.', 'Przez kilka dni używaj łagodnych kosmetyków bez kwasów i retinoidów.', 'Przez 2 tygodnie unikaj sauny i solarium.']::text[], 4);

-- Zabiegi (ceny: średnie z krakowskich gabinetów, do zastąpienia cennikiem gabinetu)
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'konsultacja', 'konsultacja', 'Konsultacja kosmetologiczna', 'Ocena skóry, dobór zabiegu i kwalifikacja. Dobry początek, jeśli nie wiesz, od czego zacząć.',
  'Spotkanie przed pierwszym zabiegiem: ocena skóry, rozmowa o oczekiwaniach i kwalifikacja do zabiegu.',
  NULL,
  '{}'::text[], NULL,
  '{}'::text[], NULL, NULL, NULL,
  20, 0, false, 0);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'pmu-brwi', 'makijaz-permanentny', 'Brwi pudrowe (ombre)', 'Miękko cieniowane brwi, jak dobrze wykonany makijaż cieniem.',
  'Makijaż permanentny brwi wykonany techniką pudrową, czyli delikatnym cieniowaniem. Brwi wyglądają jak podkreślone cieniem lub pudrem: miękko, bez ostrych konturów.',
  'Pigment wprowadzamy płytko w skórę cienką igłą, punkt po punkcie. Nasadę brwi zostawiamy jaśniejszą, a łuk i ogon cieniujemy mocniej, dzięki czemu kolor przechodzi naturalnie. Kształt rysujemy najpierw na skórze i zaczynamy pigmentację dopiero wtedy, gdy projekt Ci odpowiada.',
  ARRAY['rzadkie, przerzedzone lub jasne brwi', 'asymetria i nierówny kształt', 'luki po wyskubywaniu', 'brwi, które ścierają się w ciągu dnia']::text[], 'Gdy codziennie dorysowujesz brwi albo chcesz wyglądać dobrze bez makijażu: na basenie, na treningu, na urlopie. Technika pudrowa dobrze sprawdza się też przy cerze tłustej, na której efekt włoskowy szybko się rozmywa.',
  ARRAY['oszczędność czasu przy codziennym makijażu', 'brwi odporne na wodę, pot i upał', 'kształt dopasowany do proporcji twarzy', 'naturalny efekt, który z czasem stopniowo jaśnieje']::text[], 'Konsultacja i dobór koloru, rysunek wstępny, znieczulenie kremem, pigmentacja.', 'Zaraz po zabiegu kolor jest wyraźnie ciemniejszy, a po wygojeniu jaśnieje. Ostateczny efekt widać po ok. 4 tygodniach. Utrzymuje się zwykle 1–3 lata.', 'Zabieg i korekta po 4–8 tygodniach.',
  150, 850, false, 1);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'pmu-usta', 'makijaz-permanentny', 'Usta — kontur z wypełnieniem', 'Wyrównany kontur i kolor: od naturalnie zaróżowionych ust po delikatną pomadkę.',
  'Makijaż permanentny ust, który wyrównuje kontur i nadaje ustom kolor. Efekt może być bardzo subtelny, jak naturalnie zaróżowione usta, albo wyraźniejszy, jak delikatna pomadka.',
  'Pigment w odcieniu dobranym do karnacji wprowadzamy wzdłuż konturu i w czerwień wargową, cieniując go od brzegu ku środkowi. Usta wyglądają na pełniejsze i bardziej symetryczne, choć ich objętość się nie zmienia.',
  ARRAY['blade lub nierówne w kolorze usta', 'zatarty, nieregularny kontur', 'drobna asymetria ust', 'usta, które z wiekiem straciły kolor']::text[], 'Gdy chcesz zrezygnować z codziennej pomadki albo poprawić kształt ust bez wypełniaczy. Jeśli miewasz opryszczkę, przed zabiegiem potrzebna jest profilaktyka uzgodniona z lekarzem.',
  ARRAY['świeży wygląd ust bez makijażu', 'optycznie pełniejsze i bardziej symetryczne usta', 'kolor, który nie ściera się przy jedzeniu i piciu', 'odcień dopasowany do karnacji']::text[], 'Konsultacja i dobór koloru, rysunek konturu, znieczulenie kremem, pigmentacja.', 'Przez pierwsze dni kolor jest intensywny, potem jaśnieje i staje się naturalny. Efekt utrzymuje się zwykle 1–3 lata.', 'Zabieg i korekta po 4–8 tygodniach.',
  150, 850, false, 2);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'pmu-kreska', 'makijaz-permanentny', 'Kreska górna (eyeliner)', 'Kreska nad linią rzęs, która optycznie zagęszcza rzęsy i otwiera spojrzenie.',
  'Makijaż permanentny powieki w formie kreski nad linią rzęs: od cienkiej linii przy rzęsach po delikatnie wydłużony eyeliner.',
  'Pigment wprowadzamy tuż nad linią rzęs górnej powieki. Grubość, długość i zakończenie kreski projektujemy pod kształt oka i opadanie powieki, tak żeby kreska wyglądała dobrze i przy otwartym, i przy przymkniętym oku.',
  ARRAY['jasne lub rzadkie rzęsy', 'mało wyraziste spojrzenie', 'trudność z równym malowaniem kreski', 'uczulenie na kosmetyki do oczu']::text[], 'Gdy codziennie malujesz kreskę albo chcesz ograniczyć kosmetyki przy wrażliwych oczach. Soczewki kontaktowe trzeba wyjąć na czas zabiegu.',
  ARRAY['wyraziste oko od samego rana', 'kreska, która się nie rozmazuje i nie odbija na powiece', 'optycznie gęstsze rzęsy', 'mniej kosmetyków przy oczach']::text[], 'Projekt kreski, znieczulenie kremem, pigmentacja.', 'Lekki obrzęk powiek mija zwykle po 1–2 dniach. Efekt utrzymuje się 1–3 lata.', 'Zabieg i korekta po 4–8 tygodniach.',
  120, 650, false, 3);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'pmu-rzesy', 'makijaz-permanentny', 'Zagęszczenie linii rzęs', 'Pigment między rzęsami: oko wygląda wyraziściej, a kreski nie widać.',
  'Najbardziej naturalny rodzaj makijażu permanentnego oka. Pigment wypełnia przestrzenie między rzęsami i nie tworzy widocznej kreski.',
  'Pigment wprowadzamy punktowo pomiędzy nasadami rzęs górnej powieki. Linia rzęs staje się ciemniejsza i bardziej zwarta, więc rzęsy wyglądają na gęstsze, a oko na podkreślone.',
  ARRAY['jasne lub rzadkie rzęsy', 'prześwity w linii rzęs', 'zmęczone, mało wyraziste spojrzenie']::text[], 'Gdy nie lubisz efektu kreski, ale chcesz podkreślić oko. Dobrze uzupełnia też laminację lub przedłużanie rzęs.',
  ARRAY['subtelny efekt, którego nie widać jako makijażu', 'oko podkreślone także bez tuszu', 'krótszy zabieg i szybsze gojenie niż przy kresce']::text[], 'Znieczulenie kremem i pigmentacja linii rzęs.', 'Efekt widoczny od razu, ostateczny po wygojeniu. Utrzymuje się 1–3 lata.', 'Zabieg i korekta po 4–8 tygodniach.',
  90, 450, false, 4);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'pmu-korekta', 'makijaz-permanentny', 'Korekta po 4–8 tygodniach', 'Uzupełnienie pigmentu po wygojeniu: naturalny etap makijażu permanentnego.',
  'Drugi, uzupełniający etap każdego makijażu permanentnego.',
  'Podczas gojenia skóra przyjmuje pigment nierównomiernie, a część koloru złuszcza się razem z naskórkiem. Na korekcie oceniamy efekt, uzupełniamy pigment w jaśniejszych miejscach i dopracowujemy kształt.',
  ARRAY['prześwity i nierówny kolor po wygojeniu', 'drobne poprawki kształtu']::text[], '4–8 tygodni po makijażu permanentnym wykonanym w gabinecie, gdy skóra jest w pełni wygojona.',
  ARRAY['równy, pełny kolor', 'trwalszy efekt', 'możliwość dopracowania szczegółów']::text[], 'Ocena wygojenia, uzupełnienie pigmentu.', 'Ostateczny kształt i kolor makijażu permanentnego.', 'Jednorazowo.',
  90, 300, false, 5);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'pmu-odswiezenie', 'makijaz-permanentny', 'Odświeżenie makijażu permanentnego', 'Przywrócenie koloru, gdy pigment z czasem zblednie.',
  'Ponowna pigmentacja makijażu permanentnego, który z czasem wyblakł.',
  'Pod wpływem słońca i naturalnej odnowy skóry pigment stopniowo jaśnieje. Odświeżając makijaż, przywracamy nasycenie koloru i ostrość konturu, a w razie potrzeby lekko korygujemy kształt.',
  ARRAY['wyblakły lub nierówny kolor', 'rozmyty kontur', 'chęć delikatnej zmiany kształtu']::text[], 'Zwykle co 12–24 miesiące, gdy kolor przestaje być wyraźny. Makijaż wykonany w innym gabinecie odświeżamy po konsultacji.',
  ARRAY['efekt jak po świeżym zabiegu', 'krótsze gojenie niż przy pierwszej pigmentacji', 'utrzymanie kształtu na lata']::text[], 'Ocena pigmentu, korekta kształtu, pigmentacja.', 'Odświeżony kolor na kolejne 1–2 lata.', 'Jednorazowo, w razie potrzeby z korektą.',
  120, 350, true, 6);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'mezo-twarz', 'mezoterapia', 'Mezoterapia igłowa — twarz', 'Nawilżenie, blask i odżywienie skóry podane prosto tam, gdzie działają.',
  'Zabieg, w którym składniki aktywne podajemy bezpośrednio w skórę za pomocą bardzo cienkiej igły. To jeden z najskuteczniejszych sposobów, żeby dostarczyć skórze nawilżenia i odżywienia.',
  'Seria płytkich mikroiniekcji wprowadza do skóry koktajl dobrany do jej potrzeb: z kwasem hialuronowym, witaminami, aminokwasami lub peptydami. Składniki trafiają tam, gdzie krem nie dociera, a drobne nakłucia dodatkowo pobudzają skórę do regeneracji.',
  ARRAY['odwodnienie i szarość skóry', 'utrata blasku i jędrności', 'pierwsze zmarszczki', 'skóra zmęczona stresem, słońcem lub chorobą']::text[], 'Jako regularna pielęgnacja od ok. 25.–30. roku życia, przed ważnym wydarzeniem albo po lecie i zimie, gdy skóra jest przesuszona. Najlepsze efekty daje seria zabiegów.',
  ARRAY['wyraźne nawilżenie już po pierwszym zabiegu', 'preparat dobrany do Twojej skóry', 'krótki zabieg bez długiej rekonwalescencji', 'dobrze łączy się z peelingami chemicznymi']::text[], 'Oczyszczenie i dezynfekcja, krem znieczulający, mikroiniekcje, maska kojąca.', 'Skóra jest nawilżona i promienna po kilku dniach, a efekt narasta z każdym zabiegiem serii.', '3–4 zabiegi co 2–3 tygodnie, potem zabieg przypominający co kilka miesięcy.',
  45, 450, true, 7);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'mezo-tsd', 'mezoterapia', 'Mezoterapia igłowa — twarz, szyja, dekolt', 'Mezoterapia na trzy okolice, które starzeją się razem.',
  'Mezoterapia igłowa obejmująca twarz, szyję i dekolt, czyli okolice, które starzeją się razem, a w codziennej pielęgnacji często są pomijane.',
  'Tak jak przy mezoterapii twarzy podajemy koktajl składników aktywnych serią płytkich mikroiniekcji, ale na większym obszarze. Skóra szyi i dekoltu jest cieńsza, więc dobieramy do niej preparat i technikę.',
  ARRAY['wiotka, cienka skóra szyi', 'poziome zmarszczki na szyi', 'przesuszony, szorstki dekolt', 'różnica w wyglądzie skóry twarzy i szyi']::text[], 'Gdy zauważasz, że szyja i dekolt wyglądają starzej niż twarz, a także jako pielęgnacja po lecie.',
  ARRAY['spójny efekt na trzech okolicach w jednej wizycie', 'lepsze nawilżenie i napięcie skóry szyi', 'korzystniejsza cena niż osobne zabiegi']::text[], 'Oczyszczenie i dezynfekcja, krem znieczulający, mikroiniekcje, maska kojąca.', 'Lepsze nawilżenie i napięcie skóry, narastające z każdym zabiegiem serii.', '3–4 zabiegi co 2–3 tygodnie.',
  60, 650, true, 8);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'mezo-oczy', 'mezoterapia', 'Mezoterapia igłowa — okolice oczu', 'Delikatna mezoterapia na cienie, obrzęki i drobne zmarszczki pod oczami.',
  'Mezoterapia przeznaczona dla najcieńszej i najdelikatniejszej skóry na twarzy: okolicy pod oczami i wokół nich.',
  'Używamy preparatów stworzonych specjalnie do okolicy oka, zwykle z peptydami i niskocząsteczkowym kwasem hialuronowym. Wspierają mikrokrążenie, wzmacniają cienką skórę i poprawiają jej nawilżenie.',
  ARRAY['cienie pod oczami', 'poranne obrzęki', 'drobne zmarszczki, tzw. kurze łapki', 'cienka, zmęczona skóra pod oczami']::text[], 'Gdy kremy pod oczy przestają wystarczać, przy pierwszych zmarszczkach mimicznych albo po okresie niewyspania i stresu.',
  ARRAY['rozjaśnione, wypoczęte spojrzenie', 'zabieg dostosowany do cienkiej skóry', 'bez przerwy w codziennych obowiązkach (możliwe drobne siniaki)']::text[], 'Dezynfekcja, krem znieczulający, delikatne mikroiniekcje, okłady chłodzące.', 'Rozjaśnienie i wygładzenie skóry widoczne po serii zabiegów.', '3–4 zabiegi co 2 tygodnie.',
  30, 400, true, 9);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'mezo-glowa', 'mezoterapia', 'Mezoterapia igłowa — skóra głowy', 'Wzmocnienie włosów od cebulek i mniej wypadających włosów.',
  'Zabieg wzmacniający włosy od cebulek, w którym składniki odżywcze podajemy bezpośrednio w skórę głowy.',
  'Mikroiniekcjami wprowadzamy koktajl z witaminami, aminokwasami, peptydami i składnikami pobudzającymi mikrokrążenie. Mieszki włosowe dostają to, czego potrzebują do wzrostu, a skóra głowy jest lepiej ukrwiona i odżywiona.',
  ARRAY['nadmierne wypadanie włosów', 'przerzedzenie i prześwity', 'cienkie, osłabione, wolno rosnące włosy']::text[], 'Przy sezonowym wypadaniu włosów jesienią i wiosną, po ciąży, po okresie stresu lub odchudzania. Przy nagłym lub dużym wypadaniu warto najpierw wykonać badania i skonsultować się z lekarzem.',
  ARRAY['mniej wypadających włosów', 'wzmocnione cebulki i nowe, krótkie włoski', 'włosy można umyć już następnego dnia']::text[], 'Dezynfekcja skóry głowy, mikroiniekcje wzdłuż przedziałków.', 'Mniejsze wypadanie po kilku zabiegach, nowe włosy po 2–3 miesiącach.', '4–6 zabiegów co 2 tygodnie.',
  40, 450, true, 10);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'mikro-twarz', 'mezoterapia', 'Mezoterapia mikroigłowa — twarz', 'Gładsza faktura skóry, mniejsze pory i odbudowa kolagenu.',
  'Zabieg wykonywany urządzeniem z mikroigłami (tzw. dermapenem), który łączy dwa działania: wprowadzanie składników aktywnych i pobudzanie produkcji kolagenu.',
  'Urządzenie wykonuje w skórze tysiące mikrokanałów na kontrolowanej głębokości. Przez nie wnika dobrany preparat, a mikrouszkodzenia uruchamiają naturalny proces naprawczy skóry, w którym powstaje nowy kolagen i elastyna.',
  ARRAY['rozszerzone pory', 'blizny potrądzikowe', 'nierówna faktura i koloryt', 'przebarwienia', 'utrata jędrności i drobne zmarszczki']::text[], 'Gdy zależy Ci na poprawie struktury skóry, a nie tylko na nawilżeniu. Serię najlepiej wykonać jesienią i zimą.',
  ARRAY['wyraźna poprawa faktury skóry', 'efekt odbudowy, który narasta przez tygodnie', 'głębokość i preparat dobierane do problemu', 'można łączyć z peelingami chemicznymi']::text[], 'Oczyszczenie, krem znieczulający, praca urządzeniem z preparatem, maska kojąca.', 'Skóra jest zaróżowiona przez 1–2 dni. Poprawa faktury i jędrności narasta przez kolejne tygodnie.', '3–6 zabiegów co 4 tygodnie.',
  60, 350, true, 11);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'mikro-tsd', 'mezoterapia', 'Mezoterapia mikroigłowa — twarz, szyja, dekolt', 'Mezoterapia mikroigłowa w wersji na trzy okolice.',
  'Mezoterapia mikroigłowa obejmująca twarz, szyję i dekolt w jednym zabiegu.',
  'Mikroigły tworzą w skórze kanały, przez które wnika preparat, i pobudzają produkcję kolagenu. Na szyi i dekolcie pracujemy płycej, bo skóra jest tam cieńsza.',
  ARRAY['utrata jędrności szyi i dekoltu', 'nierówna faktura skóry', 'przebarwienia na dekolcie', 'drobne zmarszczki na szyi']::text[], 'Gdy chcesz poprawić jakość skóry na całym obszarze, który najczęściej zdradza wiek. Najlepiej jesienią i zimą.',
  ARRAY['odbudowa skóry na trzech okolicach w jednej wizycie', 'gładsza i jędrniejsza skóra szyi', 'korzystniejsza cena niż osobne zabiegi']::text[], 'Oczyszczenie, krem znieczulający, praca urządzeniem z preparatem, maska kojąca.', 'Gładsza i jędrniejsza skóra, efekt narasta przez kilka tygodni.', '3–6 zabiegów co 4 tygodnie.',
  75, 500, true, 12);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'stym-ha', 'stymulatory', 'Stymulator z kwasem hialuronowym (np. Profhilo)', 'Intensywne nawilżenie i wyraźne ujędrnienie bez zmiany rysów twarzy.',
  'Stymulator tkankowy z bardzo wysokim stężeniem czystego kwasu hialuronowego. To nie wypełniacz: nie zmienia rysów twarzy, tylko poprawia jakość skóry.',
  'Preparat podajemy w kilku punktach po każdej stronie twarzy. W skórze rozprowadza się równomiernie, intensywnie ją nawilża i pobudza komórki do produkcji kolagenu i elastyny. Skóra stopniowo staje się gęstsza i bardziej sprężysta.',
  ARRAY['utrata jędrności i elastyczności', 'skóra wiotka, cienka, zmęczona', 'drobne zmarszczki i brak blasku', 'skóra szyi i dekoltu (po kwalifikacji)']::text[], 'Gdy skóra zaczyna tracić jędrność, zwykle po 30. roku życia, a także jako profilaktyka starzenia. Dobry wybór, jeśli chcesz wyglądać młodziej, ale nie inaczej.',
  ARRAY['naturalny efekt bez zmiany rysów', 'tylko kilka punktów podania', 'efekt utrzymujący się ok. 6 miesięcy', 'szybki powrót do codzienności']::text[], 'Konsultacja, dezynfekcja, podanie preparatu w 5 punktach po każdej stronie twarzy.', 'Efekt narasta przez kilka tygodni i utrzymuje się ok. 6 miesięcy.', '2 zabiegi co 4 tygodnie, potem zabieg podtrzymujący co ok. 6 miesięcy.',
  45, 1300, true, 13);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'stym-kolagen', 'stymulatory', 'Stymulator z kolagenem i kwasem hialuronowym (np. Karisma)', 'Kolagen i kwas hialuronowy: gęstsza, bardziej sprężysta skóra.',
  'Stymulator łączący kolagen z kwasem hialuronowym. Wspiera odbudowę skóry, która z wiekiem traci gęstość i sprężystość.',
  'Kolagen w preparacie działa jak rusztowanie, na którym skóra odbudowuje własne włókna, a kwas hialuronowy wiąże wodę i nawilża. Preparat podajemy mikroiniekcjami w okolice, które tego potrzebują.',
  ARRAY['utrata gęstości i sprężystości skóry', 'drobne zmarszczki i bruzdy', 'wiotka skóra policzków i szyi', 'skóra zmęczona i odwodniona']::text[], 'Gdy skóra traci napięcie, zwykle po 35. roku życia, albo jako uzupełnienie innych zabiegów odmładzających.',
  ARRAY['wyraźnie gęstsza i bardziej sprężysta skóra', 'naturalny efekt bez zmiany rysów', 'nawilżenie i odbudowa w jednym zabiegu']::text[], 'Konsultacja, dezynfekcja, krem znieczulający, podanie preparatu.', 'Napięcie i jakość skóry poprawiają się stopniowo przez kilka tygodni po serii.', '2–3 zabiegi co 3–4 tygodnie.',
  40, 950, true, 14);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'stym-pn', 'stymulatory', 'Polinukleotydy (np. Nucleofill, Plinest)', 'Regeneracja i odbudowa cienkiej, osłabionej skóry.',
  'Stymulator tkankowy z polinukleotydami, czyli oczyszczonymi fragmentami DNA pochodzenia naturalnego. Działa przede wszystkim regenerująco.',
  'Polinukleotydy dostarczają skórze materiału do odnowy komórek i pobudzają fibroblasty, czyli komórki produkujące kolagen. Wspierają też nawilżenie i łagodzą stany zapalne, dlatego dobrze sprawdzają się przy skórze cienkiej i osłabionej.',
  ARRAY['cienka, osłabiona skóra', 'utrata gęstości i napięcia', 'drobne zmarszczki, także wokół oczu', 'skóra zniszczona słońcem']::text[], 'Gdy skóra potrzebuje przede wszystkim regeneracji: po lecie, przy pierwszych oznakach starzenia albo jako przygotowanie do innych zabiegów odmładzających.',
  ARRAY['silne działanie regenerujące', 'gęstsza, bardziej napięta skóra', 'możliwość pracy w delikatnych okolicach (po kwalifikacji)']::text[], 'Konsultacja, dezynfekcja, krem znieczulający, podanie preparatu.', 'Skóra jest gęstsza, bardziej napięta i wypoczęta po serii zabiegów.', '3 zabiegi co 2–3 tygodnie.',
  45, 1250, true, 15);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'stym-amino', 'stymulatory', 'Biostymulator z aminokwasami (np. Sunekos, Jalupro)', 'Kwas hialuronowy i aminokwasy, z których skóra buduje kolagen.',
  'Biostymulator łączący kwas hialuronowy z kompleksem aminokwasów, czyli cegiełek, z których skóra buduje kolagen i elastynę.',
  'Kwas hialuronowy nawilża i tworzy w skórze środowisko sprzyjające odbudowie, a aminokwasy dostarczają składników do produkcji nowych włókien. Skóra odzyskuje elastyczność i równiejszy koloryt.',
  ARRAY['pierwsze oznaki starzenia', 'skóra odwodniona, szara i bez blasku', 'utrata elastyczności', 'okolica oczu (wariant dedykowany)']::text[], 'Gdy chcesz wesprzeć skórę na wczesnym etapie starzenia albo szukasz łagodniejszej alternatywy dla silniejszych stymulatorów.',
  ARRAY['naturalny efekt odświeżenia', 'lepsza elastyczność i koloryt', 'dobra tolerancja przez skórę wrażliwą']::text[], 'Konsultacja, dezynfekcja, krem znieczulający, podanie preparatu.', 'Skóra jest bardziej nawilżona, elastyczna i promienna po kilku zabiegach.', '4 zabiegi co 7–10 dni.',
  45, 900, true, 16);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'stym-ejal', 'stymulatory', 'Biorewitalizacja kwasem hialuronowym (np. Ejal 40)', 'Głębokie nawilżenie i odświeżenie zmęczonej skóry.',
  'Biorewitalizacja preparatem z wysokim stężeniem niesieciowanego kwasu hialuronowego. To zabieg dla odwodnionej, zmęczonej skóry, która straciła blask.',
  'Kwas hialuronowy podajemy mikroiniekcjami w całą okolicę zabiegową. Wiąże wodę w skórze, przywraca jej nawilżenie i pobudza fibroblasty do pracy. Nie wypełnia i nie zmienia rysów twarzy.',
  ARRAY['odwodniona, szara skóra', 'drobne zmarszczki z przesuszenia', 'utrata blasku i elastyczności', 'skóra szyi, dekoltu i dłoni']::text[], 'Po lecie i po zimie, przed ważnym wydarzeniem albo jako regularna pielęgnacja skóry, która łatwo się odwadnia.',
  ARRAY['szybko widoczne nawilżenie', 'świeży, wypoczęty wygląd skóry', 'dobry pierwszy krok, jeśli nie znasz jeszcze stymulatorów']::text[], 'Dezynfekcja, krem znieczulający, mikroiniekcje preparatu.', 'Skóra jest nawilżona i promienna po kilku dniach. Po serii efekt utrzymuje się kilka miesięcy.', '3 zabiegi co 2–3 tygodnie.',
  40, 800, true, 17);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'stym-oczy', 'stymulatory', 'Stymulator okolicy oczu (np. Jalupro Young Eye, Sunekos Eye)', 'Rozjaśnienie cieni i wygładzenie cienkiej skóry pod oczami.',
  'Stymulator tkankowy stworzony specjalnie dla cienkiej i delikatnej skóry wokół oczu.',
  'Preparat z kwasem hialuronowym, aminokwasami lub peptydami podajemy delikatnie pod oczy i w okolicę kurzych łapek. Wzmacnia cienką skórę, pobudza ją do produkcji kolagenu i poprawia nawilżenie, dzięki czemu cienie są mniej widoczne.',
  ARRAY['cienie i zasinienia pod oczami', 'cienka, pomarszczona skóra pod oczami', 'kurze łapki', 'zmęczone spojrzenie']::text[], 'Gdy kremy pod oczy przestają wystarczać, a cienie i drobne zmarszczki są widoczne nawet po wypoczynku.',
  ARRAY['wypoczęte, rozjaśnione spojrzenie', 'preparat przeznaczony do delikatnej okolicy oka', 'krótki zabieg']::text[], 'Dezynfekcja, krem znieczulający, delikatne podanie preparatu, okłady chłodzące.', 'Skóra pod oczami jest gładsza i jaśniejsza po serii. Przez kilka dni mogą być widoczne drobne siniaki.', '3–4 zabiegi co 1–3 tygodnie, zależnie od preparatu.',
  30, 550, true, 18);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'kwas-migdalowy', 'peelingi', 'Peeling kwasem migdałowym', 'Łagodny kwas, który wygładza, rozjaśnia i działa antybakteryjnie.',
  'Jeden z najłagodniejszych peelingów chemicznych. Kwas migdałowy należy do kwasów AHA i jest pozyskiwany z gorzkich migdałów.',
  'Kwas rozluźnia połączenia między martwymi komórkami naskórka, które dzięki temu łatwiej się złuszczają. Ma dużą cząsteczkę, więc wnika powoli i równomiernie i rzadko podrażnia. Działa też antybakteryjnie.',
  ARRAY['trądzik i zaskórniki', 'przebarwienia, także potrądzikowe', 'cera tłusta i mieszana', 'szara, zmęczona skóra']::text[], 'Od jesieni do wiosny. To dobry pierwszy peeling i dobry wybór dla skóry wrażliwej i naczynkowej.',
  ARRAY['łagodne działanie i małe ryzyko podrażnień', 'zwykle bez widocznego łuszczenia', 'odpowiedni dla większości typów skóry', 'wygładzona i rozjaśniona skóra']::text[], 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.', 'Gładsza, jaśniejsza i oczyszczona skóra, wyraźnie po kilku zabiegach.', '4–6 zabiegów co 7–14 dni.',
  45, 230, false, 19);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'kwas-mlekowy', 'peelingi', 'Peeling kwasem mlekowym', 'Delikatne złuszczanie połączone z nawilżeniem, także dla skóry suchej.',
  'Peeling kwasem mlekowym, jednym z najłagodniejszych kwasów AHA. Kwas mlekowy występuje naturalnie w skórze jako składnik jej warstwy nawilżającej.',
  'Kwas złuszcza martwe komórki naskórka i jednocześnie wiąże wodę w skórze. Dzięki temu wygładza i rozjaśnia, nie przesuszając. Wspiera też odbudowę bariery ochronnej skóry.',
  ARRAY['skóra sucha i odwodniona', 'szorstkość i nierówna faktura', 'drobne przebarwienia', 'szara, zmęczona skóra']::text[], 'Od jesieni do wiosny, szczególnie przy skórze suchej i wrażliwej, która źle znosi mocniejsze kwasy.',
  ARRAY['łagodny dla skóry suchej i wrażliwej', 'złuszczanie połączone z nawilżeniem', 'gładka, promienna skóra od razu po zabiegu']::text[], 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.', 'Gładka, nawilżona i rozjaśniona skóra, wyraźnie po kilku zabiegach.', '4–6 zabiegów co 7–14 dni.',
  45, 270, false, 20);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'kwas-glikolowy', 'peelingi', 'Peeling kwasem glikolowym', 'Klasyczny kwas na wygładzenie, rozjaśnienie i drobne zmarszczki.',
  'Peeling kwasem glikolowym, najmniejszym z kwasów AHA. To jeden z najczęściej stosowanych kwasów w kosmetologii.',
  'Dzięki małej cząsteczce kwas szybko i głęboko wnika w naskórek. Złuszcza martwe komórki, wyrównuje koloryt i pobudza skórę do produkcji kolagenu. Stężenie i czas działania dobieramy do tolerancji skóry.',
  ARRAY['nierówna faktura i koloryt', 'przebarwienia', 'drobne zmarszczki', 'zaskórniki i rozszerzone pory']::text[], 'Od jesieni do wiosny, przy skórze normalnej, tłustej i dojrzałej. Przy skórze bardzo wrażliwej wybieramy łagodniejszy kwas.',
  ARRAY['wyraźne wygładzenie skóry', 'działanie przeciwstarzeniowe dzięki pobudzeniu kolagenu', 'stężenie dopasowane do skóry']::text[], 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.', 'Gładsza i jaśniejsza skóra oraz mniej widoczne drobne zmarszczki po serii. Możliwe delikatne łuszczenie.', '4–6 zabiegów co 2 tygodnie.',
  45, 270, false, 21);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'kwas-azelainowy', 'peelingi', 'Peeling kwasem azelainowym', 'Kwas na trądzik, zaczerwienienia i przebarwienia, łagodny dla skóry naczynkowej.',
  'Peeling kwasem azelainowym, który działa przeciwbakteryjnie, przeciwzapalnie i rozjaśniająco.',
  'Kwas azelainowy ogranicza namnażanie bakterii odpowiedzialnych za trądzik, wycisza stany zapalne i hamuje nadmierną produkcję barwnika w skórze. Złuszcza delikatnie, dlatego dobrze sprawdza się przy skórze wrażliwej.',
  ARRAY['trądzik i zmiany zapalne', 'zaczerwienienia i skóra naczynkowa', 'przebarwienia, także potrądzikowe', 'cera ze skłonnością do trądziku różowatego (po konsultacji)']::text[], 'Od jesieni do wiosny, gdy skóra jest jednocześnie trądzikowa i wrażliwa albo naczynkowa.',
  ARRAY['działanie przeciwzapalne i rozjaśniające', 'odpowiedni dla skóry wrażliwej i naczynkowej', 'małe ryzyko podrażnień']::text[], 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.', 'Mniej zmian zapalnych i zaczerwienień oraz wyrównany koloryt po serii.', '4–6 zabiegów co 7–14 dni.',
  45, 280, false, 22);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'kwas-salicylowy', 'peelingi', 'Peeling kwasem salicylowym', 'Kwas BHA, który oczyszcza pory od środka i wycisza stany zapalne.',
  'Peeling kwasem salicylowym, czyli kwasem BHA. W przeciwieństwie do kwasów AHA rozpuszcza się w tłuszczu, dlatego wnika w ujścia porów.',
  'Kwas salicylowy przenika do wnętrza porów, rozpuszcza zalegający w nich łój i martwe komórki, a do tego działa przeciwzapalnie. Skóra jest oczyszczona, matowa i mniej skłonna do wyprysków.',
  ARRAY['zaskórniki i zatkane pory', 'trądzik', 'nadmierne przetłuszczanie się skóry', 'rozszerzone pory']::text[], 'Od jesieni do wiosny, przy cerze tłustej, mieszanej i trądzikowej. Nie stosujemy go przy uczuleniu na salicylany.',
  ARRAY['głębokie oczyszczenie porów', 'matowa skóra na dłużej', 'działanie przeciwzapalne']::text[], 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.', 'Oczyszczone pory i mniej wyprysków po kilku zabiegach. Możliwe delikatne łuszczenie.', '4–6 zabiegów co 2 tygodnie.',
  40, 280, false, 23);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'kwas-pirogronowy', 'peelingi', 'Peeling kwasem pirogronowym', 'Silniejszy kwas na pory, zaskórniki i nadmiar sebum.',
  'Peeling chemiczny kwasem pirogronowym, który działa silniej niż kwas migdałowy i szczególnie dobrze sprawdza się przy cerze tłustej.',
  'Kwas złuszcza naskórek, a jednocześnie wnika w ujścia gruczołów łojowych, oczyszcza je i ogranicza wydzielanie sebum. Pobudza też skórę do odnowy i produkcji kolagenu.',
  ARRAY['cera tłusta, z zaskórnikami', 'trądzik', 'rozszerzone pory', 'płytkie blizny potrądzikowe']::text[], 'Od jesieni do wiosny, przy cerze tłustej i trądzikowej. Nie zalecamy go przy skórze naczynkowej i bardzo wrażliwej.',
  ARRAY['skuteczne oczyszczenie porów', 'matowa, mniej przetłuszczająca się skóra', 'wygładzenie płytkich blizn']::text[], 'Demakijaż i oczyszczenie, nałożenie kwasu, neutralizacja, maska kojąca i krem z filtrem.', 'Oczyszczone pory i wyrównana faktura skóry po serii. Przez kilka dni możliwe delikatne łuszczenie.', '4–6 zabiegów co 2 tygodnie.',
  45, 260, false, 24);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'mezopeeling', 'peelingi', 'Mezopeeling', 'Profesjonalny peeling łączący kilka kwasów, dobrany do konkretnego problemu.',
  'Profesjonalny peeling łączący kilka kwasów ze składnikami aktywnymi w jednym preparacie. Każdy wariant jest przeznaczony do innego problemu skóry.',
  'Kwasy złuszczają naskórek i ułatwiają wnikanie składników aktywnych, np. rozjaśniających, przeciwtrądzikowych lub odmładzających. Wariant i stężenie dobieramy po ocenie skóry.',
  ARRAY['przebarwienia i melasma (w serii)', 'trądzik i zaskórniki', 'szara, zmęczona skóra', 'pierwsze oznaki starzenia']::text[], 'Gdy potrzebujesz zabiegu celowanego w konkretny problem. Najlepiej jesienią i zimą.',
  ARRAY['preparat dopasowany do problemu skóry', 'złuszczanie i pielęgnacja w jednym zabiegu', 'widoczne odświeżenie skóry']::text[], 'Demakijaż i oczyszczenie, nałożenie peelingu, neutralizacja, maska i krem z filtrem.', 'Rozjaśniona, odświeżona skóra, wyraźny efekt po serii.', '3–6 zabiegów co 2–3 tygodnie.',
  50, 300, false, 25);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'peeling-retinolowy', 'peelingi', 'Peeling retinolowy (yellow peel)', 'Odnowa skóry z retinolem: przebarwienia, zmarszczki i nierówny koloryt.',
  'Peeling z wysokim stężeniem retinolu, nazywany żółtym od koloru preparatu. To jeden z najskuteczniejszych zabiegów odmładzających i rozjaśniających.',
  'Preparat nakładamy w gabinecie, a zmywasz go w domu po kilku godzinach, zgodnie z naszymi zaleceniami. Retinol przyspiesza odnowę komórek, pobudza produkcję kolagenu i rozjaśnia przebarwienia. Przez kilka dni po zabiegu skóra złuszcza się drobnymi płatkami.',
  ARRAY['przebarwienia i melasma', 'zmarszczki i utrata jędrności', 'nierówny koloryt i faktura skóry', 'blizny potrądzikowe i rozszerzone pory']::text[], 'Od jesieni do wczesnej wiosny, gdy słońce jest słabe. Warto zaplanować kilka spokojniejszych dni, bo łuszczenie jest widoczne. Nie wykonujemy go w ciąży ani podczas karmienia piersią.',
  ARRAY['silne działanie odmładzające i rozjaśniające', 'krótka wizyta w gabinecie', 'efekt widoczny już po jednym zabiegu']::text[], 'Oczyszczenie i odtłuszczenie skóry, nałożenie preparatu, zalecenia do zmycia w domu.', 'Po zakończeniu łuszczenia skóra jest gładsza, jaśniejsza i bardziej jednolita. Efekt pogłębia się z każdym zabiegiem.', '2–4 zabiegi co 3–4 tygodnie.',
  30, 400, true, 26);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'prx-twarz', 'peelingi', 'Peeling PRX-T33 — twarz', 'Biorewitalizacja bez igły: napięta, rozświetlona skóra od razu po zabiegu.',
  'Peeling łączący 33% kwas trójchlorooctowy (TCA) z nadtlenkiem wodoru i kwasem kojowym. Nazywany jest biorewitalizacją bez igły.',
  'Preparat wmasowujemy w skórę w kilku warstwach. TCA działa w głębszych warstwach skóry i pobudza produkcję kolagenu, a dzięki nadtlenkowi wodoru naskórek prawie się nie złuszcza. Skóra jest napięta i rozświetlona od razu po zabiegu.',
  ARRAY['utrata jędrności i napięcia', 'blizny potrądzikowe', 'rozszerzone pory', 'szara skóra bez blasku']::text[], 'Przed ważnym wyjściem, gdy skóra ma wyglądać świeżo od razu, albo w serii jako zabieg odmładzający. Można go wykonywać przez cały rok, pod warunkiem codziennego stosowania kremu z filtrem.',
  ARRAY['efekt widoczny od razu', 'bez igieł i zwykle bez widocznego łuszczenia', 'zabieg możliwy przez cały rok', 'szybki powrót do codzienności']::text[], 'Oczyszczenie, wmasowanie preparatu w kilku warstwach, zmycie, krem kojący z filtrem.', 'Napięta, rozświetlona skóra od razu po zabiegu, efekt odbudowy narasta po serii.', '4–5 zabiegów co tydzień.',
  40, 400, false, 27);
INSERT INTO treatments (id, category_id, name, short_description, what_is, how_it_works, helps_with, when_to_use, benefits, procedure, results, recommended_series, duration_min, price, price_is_from, sort_order) VALUES (
  'prx-tsd', 'peelingi', 'Peeling PRX-T33 — twarz, szyja, dekolt', 'PRX-T33 w wersji na trzy okolice.',
  'Peeling PRX-T33 obejmujący twarz, szyję i dekolt w jednym zabiegu.',
  'Ten sam preparat z 33% TCA, nadtlenkiem wodoru i kwasem kojowym wmasowujemy na większym obszarze. Pobudza produkcję kolagenu bez wyraźnego złuszczania naskórka.',
  ARRAY['utrata jędrności szyi i dekoltu', 'przebarwienia na dekolcie', 'drobne zmarszczki', 'szara skóra bez blasku']::text[], 'Gdy chcesz odświeżyć i ujędrnić skórę na całym obszarze, np. przed wydarzeniem, przy którym dekolt jest odsłonięty. Możliwy przez cały rok, z kremem z filtrem.',
  ARRAY['efekt na trzech okolicach w jednej wizycie', 'bez igieł i bez przerwy w codzienności', 'zabieg możliwy przez cały rok']::text[], 'Oczyszczenie, wmasowanie preparatu w kilku warstwach, zmycie, krem kojący z filtrem.', 'Napięta, rozświetlona skóra, efekt narasta po serii.', '4–5 zabiegów co tydzień.',
  50, 500, false, 28);

-- Godziny pracy (1 = poniedziałek … 7 = niedziela)
INSERT INTO working_hours (iso_weekday, opens_at, closes_at) VALUES (1, '9:00', '19:00');
INSERT INTO working_hours (iso_weekday, opens_at, closes_at) VALUES (2, '9:00', '19:00');
INSERT INTO working_hours (iso_weekday, opens_at, closes_at) VALUES (3, '11:00', '20:00');
INSERT INTO working_hours (iso_weekday, opens_at, closes_at) VALUES (4, '9:00', '19:00');
INSERT INTO working_hours (iso_weekday, opens_at, closes_at) VALUES (5, '9:00', '17:00');
INSERT INTO working_hours (iso_weekday, opens_at, closes_at) VALUES (6, '9:00', '14:00');
INSERT INTO working_hours (iso_weekday, opens_at, closes_at) VALUES (7, NULL, NULL);

-- Dni ustawowo wolne
INSERT INTO days_off (day, reason) VALUES ('2026-11-11', 'Narodowe Święto Niepodległości');
INSERT INTO days_off (day, reason) VALUES ('2026-12-24', 'Wigilia');
INSERT INTO days_off (day, reason) VALUES ('2026-12-25', 'Boże Narodzenie');
INSERT INTO days_off (day, reason) VALUES ('2026-12-26', 'Drugi dzień świąt');
INSERT INTO days_off (day, reason) VALUES ('2027-01-01', 'Nowy Rok');
INSERT INTO days_off (day, reason) VALUES ('2027-01-06', 'Trzech Króli');
INSERT INTO days_off (day, reason) VALUES ('2027-03-28', 'Wielkanoc');
INSERT INTO days_off (day, reason) VALUES ('2027-03-29', 'Wielkanoc');
INSERT INTO days_off (day, reason) VALUES ('2027-05-01', 'Święto Pracy');
INSERT INTO days_off (day, reason) VALUES ('2027-05-03', 'Święto Konstytucji 3 Maja');

-- Promocje
INSERT INTO promotions (id, kind, name, description, percent, members_only, applies_to_all, valid_from, valid_to) VALUES ('powitalna', 'first_visit', 'Zniżka powitalna', '10% zniżki na pierwszy zabieg po założeniu konta.', 10, true, true, '2026-01-01', '2099-12-31');
INSERT INTO promotions (id, kind, name, description, percent, members_only, applies_to_all, valid_from, valid_to) VALUES ('swieta-2026', 'seasonal', 'Świąteczna pielęgnacja', '15% taniej na mezoterapię i stymulatory tkankowe dla zarejestrowanych klientek.', 15, true, false, '2026-12-01', '2026-12-23');
INSERT INTO promotion_categories (promotion_id, category_id) VALUES ('swieta-2026', 'mezoterapia');
INSERT INTO promotion_categories (promotion_id, category_id) VALUES ('swieta-2026', 'stymulatory');
INSERT INTO promotions (id, kind, name, description, percent, members_only, applies_to_all, valid_from, valid_to) VALUES ('urodziny', 'birthday', 'Prezent urodzinowy', '10% zniżki na dowolny zabieg w miesiącu Twoich urodzin.', 10, true, true, '2026-01-01', '2027-12-31');

-- Konta do panelu (hasła ustawiamy przy podłączaniu logowania)
INSERT INTO admins (email, full_name, role) VALUES ('kontakt@justynamanka.pl', 'Justyna Mańka', 'owner');
INSERT INTO admins (email, full_name, role) VALUES ('martbrod99@gmail.com', 'Martyna Brodowska', 'admin');

-- PRZYKŁAD: klientki testowe (adresy @example.com). Usuń przed startem strony.
INSERT INTO clients (id, first_name, last_name, email, phone, birth_month, has_account, password_hash) VALUES ('a0000000-0000-4000-8000-000000000001', 'Anna', 'Kowalczyk', 'anna.kowalczyk@example.com', '+48 601 224 318', 3, true, 'test-tylko-przyklad');
INSERT INTO consents (client_id, type, granted, source, document_version) VALUES ('a0000000-0000-4000-8000-000000000001', 'terms', true, 'registration', 'regulamin-2026-11'), ('a0000000-0000-4000-8000-000000000001', 'privacy', true, 'registration', 'polityka-2026-11'), ('a0000000-0000-4000-8000-000000000001', 'marketing_sms', true, 'registration', NULL), ('a0000000-0000-4000-8000-000000000001', 'marketing_email', true, 'registration', NULL);
INSERT INTO clients (id, first_name, last_name, email, phone, birth_month, has_account, password_hash) VALUES ('a0000000-0000-4000-8000-000000000002', 'Marta', 'Wiśniewska', 'marta.w@example.com', '+48 512 908 447', NULL, true, 'test-tylko-przyklad');
INSERT INTO consents (client_id, type, granted, source, document_version) VALUES ('a0000000-0000-4000-8000-000000000002', 'terms', true, 'registration', 'regulamin-2026-11'), ('a0000000-0000-4000-8000-000000000002', 'privacy', true, 'registration', 'polityka-2026-11'), ('a0000000-0000-4000-8000-000000000002', 'marketing_sms', true, 'registration', NULL), ('a0000000-0000-4000-8000-000000000002', 'marketing_email', false, 'registration', NULL);
INSERT INTO clients (id, first_name, last_name, email, phone, birth_month, has_account, password_hash) VALUES ('a0000000-0000-4000-8000-000000000003', 'Karolina', 'Zielińska', 'k.zielinska@example.com', '+48 698 115 902', 12, true, 'test-tylko-przyklad');
INSERT INTO consents (client_id, type, granted, source, document_version) VALUES ('a0000000-0000-4000-8000-000000000003', 'terms', true, 'registration', 'regulamin-2026-11'), ('a0000000-0000-4000-8000-000000000003', 'privacy', true, 'registration', 'polityka-2026-11'), ('a0000000-0000-4000-8000-000000000003', 'marketing_sms', false, 'registration', NULL), ('a0000000-0000-4000-8000-000000000003', 'marketing_email', false, 'registration', NULL);
INSERT INTO clients (id, first_name, last_name, email, phone, birth_month, has_account, password_hash) VALUES ('a0000000-0000-4000-8000-000000000004', 'Joanna', 'Mazur', 'joanna.mazur@example.com', '+48 604 771 239', NULL, false, NULL);
INSERT INTO consents (client_id, type, granted, source, document_version) VALUES ('a0000000-0000-4000-8000-000000000004', 'terms', true, 'booking', 'regulamin-2026-11'), ('a0000000-0000-4000-8000-000000000004', 'privacy', true, 'booking', 'polityka-2026-11'), ('a0000000-0000-4000-8000-000000000004', 'marketing_sms', false, 'booking', NULL), ('a0000000-0000-4000-8000-000000000004', 'marketing_email', false, 'booking', NULL);

-- PRZYKŁAD: wizyty (godziny w czasie lokalnym gabinetu)
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, status, booked_via, price, promotion_id, discount_percent, lowest_price_30d) VALUES ('a0000000-0000-4000-8000-000000000001', 'pmu-brwi', ('2026-10-12 10:00'::timestamp AT TIME ZONE 'Europe/Warsaw'), ('2026-10-12 10:00'::timestamp AT TIME ZONE 'Europe/Warsaw') + interval '150 minutes', 'completed', 'account', 850, NULL, 0, NULL);
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, status, booked_via, price, promotion_id, discount_percent, lowest_price_30d) VALUES ('a0000000-0000-4000-8000-000000000003', 'konsultacja', ('2026-10-20 12:00'::timestamp AT TIME ZONE 'Europe/Warsaw'), ('2026-10-20 12:00'::timestamp AT TIME ZONE 'Europe/Warsaw') + interval '20 minutes', 'completed', 'account', 0, NULL, 0, NULL);
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, status, booked_via, price, promotion_id, discount_percent, lowest_price_30d) VALUES ('a0000000-0000-4000-8000-000000000001', 'mezo-twarz', ('2026-11-16 10:00'::timestamp AT TIME ZONE 'Europe/Warsaw'), ('2026-11-16 10:00'::timestamp AT TIME ZONE 'Europe/Warsaw') + interval '45 minutes', 'confirmed', 'account', 450, NULL, 0, NULL);
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, status, booked_via, price, promotion_id, discount_percent, lowest_price_30d) VALUES ('a0000000-0000-4000-8000-000000000002', 'pmu-brwi', ('2026-11-16 13:00'::timestamp AT TIME ZONE 'Europe/Warsaw'), ('2026-11-16 13:00'::timestamp AT TIME ZONE 'Europe/Warsaw') + interval '150 minutes', 'confirmed', 'account', 850, 'powitalna', 10, 850);
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, status, booked_via, price, promotion_id, discount_percent, lowest_price_30d) VALUES ('a0000000-0000-4000-8000-000000000003', 'kwas-migdalowy', ('2026-11-17 09:30'::timestamp AT TIME ZONE 'Europe/Warsaw'), ('2026-11-17 09:30'::timestamp AT TIME ZONE 'Europe/Warsaw') + interval '45 minutes', 'confirmed', 'account', 230, NULL, 0, NULL);
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, status, booked_via, price, promotion_id, discount_percent, lowest_price_30d) VALUES ('a0000000-0000-4000-8000-000000000004', 'mezo-glowa', ('2026-11-18 15:00'::timestamp AT TIME ZONE 'Europe/Warsaw'), ('2026-11-18 15:00'::timestamp AT TIME ZONE 'Europe/Warsaw') + interval '40 minutes', 'confirmed', 'guest', 450, NULL, 0, NULL);
INSERT INTO bookings (client_id, treatment_id, starts_at, ends_at, status, booked_via, price, promotion_id, discount_percent, lowest_price_30d) VALUES ('a0000000-0000-4000-8000-000000000001', 'stym-ha', ('2026-12-02 16:00'::timestamp AT TIME ZONE 'Europe/Warsaw'), ('2026-12-02 16:00'::timestamp AT TIME ZONE 'Europe/Warsaw') + interval '45 minutes', 'confirmed', 'account', 1300, 'swieta-2026', 15, 1300);

-- PRZYKŁAD: zmiana zgody (trafi automatycznie do consent_log)
UPDATE consents SET granted = true, source = 'profile', updated_at = now() WHERE client_id = 'a0000000-0000-4000-8000-000000000003' AND type = 'marketing_email';

COMMIT;
