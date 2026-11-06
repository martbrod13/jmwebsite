/*
 * Ankieta przed zabiegiem (nieobowiązkowa). Te same pytania widzi klientka, panel i serwer.
 * Pytania zmieniasz tutaj; identyfikatory (id) nie powinny się zmieniać, bo pod nimi zapisują się odpowiedzi.
 * detail: true — po odpowiedzi „tak” pojawia się pole na szczegóły.
 */
(function (JM) {
  JM.questionnaire = [
    { id: 'pregnancy', detail: false,
      pl: 'Czy jesteś w ciąży lub karmisz piersią?',
      en: 'Are you pregnant or breastfeeding?' },
    { id: 'chronic', detail: true,
      pl: 'Czy chorujesz przewlekle (np. cukrzyca, choroby autoimmunologiczne, tarczycy lub serca, padaczka, choroba nowotworowa)?',
      en: 'Do you have a long-term condition (e.g. diabetes, an autoimmune, thyroid or heart condition, epilepsy, cancer)?' },
    { id: 'medication', detail: true,
      pl: 'Czy przyjmujesz leki na stałe albo ostatnio (np. przeciwzakrzepowe, sterydy, antybiotyki, izotretynoinę w ostatnich 6 miesiącach)?',
      en: 'Do you take any regular or recent medication (e.g. blood thinners, steroids, antibiotics, isotretinoin in the last 6 months)?' },
    { id: 'allergy', detail: true,
      pl: 'Czy masz alergie (np. na leki znieczulające, lateks, metale, kosmetyki)?',
      en: 'Do you have any allergies (e.g. to local anaesthetics, latex, metals, cosmetics)?' },
    { id: 'skin', detail: true,
      pl: 'Czy w miejscu zabiegu masz teraz stan zapalny, ranę, trądzik w fazie zapalnej albo inną zmianę skórną?',
      en: 'Is there currently any inflammation, wound, active acne or other skin condition in the treatment area?' },
    { id: 'herpes', detail: false,
      pl: 'Czy miewasz opryszczkę?',
      en: 'Do you get cold sores?' },
    { id: 'scars', detail: false,
      pl: 'Czy masz skłonność do bliznowców albo przebarwień po urazach skóry?',
      en: 'Do you tend to get keloid scars or dark marks after skin injuries?' },
    { id: 'recent', detail: true,
      pl: 'Czy w ostatnich 4 tygodniach miałaś zabieg w tej okolicy (np. toksyna botulinowa, wypełniacz, laser, peeling, makijaż permanentny)?',
      en: 'Have you had any treatment in this area in the last 4 weeks (e.g. botulinum toxin, filler, laser, peel, permanent makeup)?' },
    { id: 'implants', detail: true,
      pl: 'Czy masz rozrusznik serca, metalowe implanty albo inne wszczepione urządzenie?',
      en: 'Do you have a pacemaker, metal implants or any other implanted device?' },
    { id: 'sun', detail: false,
      pl: 'Czy w ostatnich 2 tygodniach opalałaś się albo używałaś samoopalacza?',
      en: 'Have you sunbathed or used self-tanner in the last 2 weeks?' }
  ];
  // pole tekstowe na końcu ankiety
  JM.questionnaireOther = {
    pl: 'Czy jest coś jeszcze, o czym powinnam wiedzieć przed zabiegiem?',
    en: 'Is there anything else I should know before the treatment?'
  };
})(window.JM = window.JM || {});
