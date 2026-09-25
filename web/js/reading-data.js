/**
 * The reading and language content (round 18): spelling, vocabulary and
 * short texts for reading comprehension, from groep 4 up to the end of groep
 * 8, in Dutch and English.
 *
 * This is data, kept apart from i18n-data.js on purpose. i18n-data holds the
 * app's *interface* - one string per key, the same keys in both languages.
 * This file holds *learning content*, and the two languages are not
 * translations of each other everywhere: Dutch spelling is about d/t and
 * ei/ij, English spelling about homophones and silent letters, so each
 * language has its own spelling and vocabulary lists. Only the reading texts
 * are parallel (the same story in both languages), so a class can compare.
 *
 * Every level array is indexed 0-7, matching the game levels. Rules the
 * tests (tests/web/test_reading.mjs) hold every entry to:
 *   - an answer and two wrong options, all different;
 *   - no "<" or "&" anywhere (question text is shown as HTML);
 *   - reading texts and their questions exist in both languages.
 */

// ---------------------------------------------------------------------------
// Spelling - Spellingstorm
// ---------------------------------------------------------------------------
//
// A word item is [right, wrong, wrong]. A sentence item is
// { s: sentence with ___, v: the verb it comes from (optional), a: right,
// w: [wrong, wrong] }.

export const SPELLING = {
  nl: [
    // 0 - groep 4: d or t at the end? (make the word longer: honden -> hond)
    [
      ["hond", "hont", "hondt"],
      ["brood", "broot", "broodt"],
      ["kind", "kint", "kindt"],
      ["hand", "hant", "handt"],
      ["zand", "zant", "zandt"],
      ["bord", "bort", "bordt"],
      ["paard", "paart", "paardt"],
      ["vriend", "vrient", "vriendt"],
      ["berg", "berch", "bergh"],
      ["dag", "dach", "dagh"],
      ["vlag", "vlach", "vlagh"],
      ["kast", "kasd", "kastt"],
    ],
    // 1 - groep 5: ei or ij, au or ou
    [
      ["trein", "trijn", "treyn"],
      ["klein", "klijn", "kleyn"],
      ["tijd", "teid", "tyd"],
      ["fijn", "fein", "feyn"],
      ["geit", "gijt", "geyt"],
      ["ijsje", "eisje", "ysje"],
      ["blauw", "blouw", "blaw"],
      ["koud", "kaud", "koudt"],
      ["vrouw", "vrauw", "vrou"],
      ["saus", "sous", "sauss"],
      ["kabouter", "kabauter", "kabouder"],
      ["pauw", "pouw", "paauw"],
    ],
    // 2 - groep 5/6: one letter or two? (bomen / bommen)
    [
      ["bomen", "boomen", "bommen"],
      ["lopen", "loopen", "loppen"],
      ["bakker", "baker", "bakkker"],
      ["zomer", "zommer", "zoomer"],
      ["kikker", "kiker", "kiekker"],
      ["regen", "reggen", "reegen"],
      ["appel", "apel", "aapel"],
      ["water", "watter", "waater"],
      ["sokken", "soken", "sookken"],
      ["vogel", "voggel", "voogel"],
      ["koning", "konink", "konning"],
      ["tekening", "tekenink", "tekkening"],
    ],
    // 3 - groep 6: -ig, -lijk, -heid, -tie, sch-
    [
      ["vrijheid", "vrijhijd", "vreiheid"],
      ["gelukkig", "gelukkug", "gelukig"],
      ["vriendelijk", "vriendelek", "vriendelijck"],
      ["moeilijk", "moeilek", "moeilik"],
      ["politie", "polietsie", "politsie"],
      ["vakantie", "vakansie", "vakantsie"],
      ["schrijven", "sgrijven", "schreiven"],
      ["school", "sgool", "skool"],
      ["aardig", "aardug", "aardich"],
      ["eerlijk", "eerlek", "eerlijck"],
      ["prachtig", "pragtig", "prachtug"],
      ["gezellig", "gezelig", "gezellug"],
    ],
    // 4 - groep 7: words from other languages
    [
      ["cadeau", "kado", "cadau"],
      ["bureau", "buro", "burau"],
      ["trottoir", "trotoir", "trottwar"],
      ["chocolade", "sjokolade", "chocolaade"],
      ["computer", "kompjoeter", "computter"],
      ["centrum", "sentrum", "centrem"],
      ["medicijn", "medisijn", "medicein"],
      ["garage", "garaazje", "garrage"],
      ["restaurant", "restorant", "restaurent"],
      ["horloge", "horlosje", "horlooge"],
      ["paraplu", "parapluu", "paraplue"],
      ["station", "stasion", "statsion"],
    ],
    // 5 - groep 7: verbs, present tense - d or t or dt?
    [
      { s: "Hij ___ zijn fiets mooi.", v: "vinden", a: "vindt", w: ["vind", "vint"] },
      { s: "Ik ___ het een leuk boek.", v: "vinden", a: "vind", w: ["vindt", "vint"] },
      { s: "Jij ___ steeds groter.", v: "worden", a: "wordt", w: ["word", "wort"] },
      { s: "Het ___ al donker buiten.", v: "worden", a: "wordt", w: ["word", "wort"] },
      { s: "Mijn zus ___ heel goed paard.", v: "rijden", a: "rijdt", w: ["rijd", "rijt"] },
      { s: "Ik ___ elke dag naar school.", v: "fietsen", a: "fiets", w: ["fietst", "fiest"] },
      { s: "Hij ___ van voetbal.", v: "houden", a: "houdt", w: ["houd", "hout"] },
      { s: "Ik ___ van pizza.", v: "houden", a: "houd", w: ["houdt", "hout"] },
      { s: "Zij ___ het antwoord.", v: "weten", a: "weet", w: ["weed", "weett"] },
      { s: "De juf ___ de deur.", v: "sluiten", a: "sluit", w: ["sluid", "sluitt"] },
      { s: "Ik ___ op de bus.", v: "wachten", a: "wacht", w: ["wachd", "wachtt"] },
      { s: "Zij ___ snel op de vraag.", v: "antwoorden", a: "antwoordt", w: ["antwoord", "antwoort"] },
    ],
    // 6 - groep 8: past tense and past participle ('t kofschip)
    [
      { s: "Gisteren ___ ik naar school.", v: "fietsen", a: "fietste", w: ["fietsde", "fiedste"] },
      { s: "Wij hebben de hele middag ___.", v: "spelen", a: "gespeeld", w: ["gespeelt", "gespeelde"] },
      { s: "Hij heeft zijn oma ___.", v: "bellen", a: "gebeld", w: ["gebelt", "gebeldt"] },
      { s: "Ik ___ de hele middag in de tuin.", v: "werken", a: "werkte", w: ["werkde", "werktte"] },
      { s: "Mijn broer heeft het raam ___.", v: "openen", a: "geopend", w: ["geopent", "geopendt"] },
      { s: "Zij ___ hard voor de toets.", v: "leren", a: "leerde", w: ["leerte", "leerdde"] },
      { s: "Het is eindelijk ___!", v: "lukken", a: "gelukt", w: ["gelukd", "geluckt"] },
      { s: "De hond ___ de hele nacht.", v: "blaffen", a: "blafte", w: ["blafde", "blaffte"] },
      { s: "Wij ___ samen een hut.", v: "bouwen", a: "bouwden", w: ["bouwten", "bouwde"] },
      { s: "Heb jij je tas al ___?", v: "pakken", a: "gepakt", w: ["gepakd", "gepackt"] },
      { s: "Wij zijn vorig jaar ___.", v: "verhuizen", a: "verhuisd", w: ["verhuist", "verhuizd"] },
      { s: "Opa ___ vroeger elke dag.", v: "wandelen", a: "wandelde", w: ["wandelte", "wandelden"] },
    ],
    // 7 - groep 8 top: the traps (gebeurd/gebeurt, word/wordt with "jij" after the verb)
    [
      { s: "Wat is er gisteren ___?", v: "gebeuren", a: "gebeurd", w: ["gebeurt", "gebeurdt"] },
      { s: "Wat ___ er nu?", v: "gebeuren", a: "gebeurt", w: ["gebeurd", "gebeurdt"] },
      { s: "___ jij later dokter?", v: "worden", a: "Word", w: ["Wordt", "Wort"] },
      { s: "Wanneer ___ je jarig?", v: "worden", a: "word", w: ["wordt", "wort"] },
      { s: "___ hij ook uitgenodigd?", v: "worden", a: "Wordt", w: ["Word", "Wort"] },
      { s: "___ jij dit ook zo leuk?", v: "vinden", a: "Vind", w: ["Vindt", "Vint"] },
      { s: "Zij heeft de muur rood ___.", v: "verven", a: "geverfd", w: ["geverft", "geverfdt"] },
      { s: "Het ___ ei is nog warm.", v: "koken", a: "gekookte", w: ["gekookde", "gekoocte"] },
      { s: "De ___ fiets staat buiten.", v: "repareren", a: "gerepareerde", w: ["gerepareerte", "gerepareede"] },
      { s: "Hij ___ zich in de tijd.", v: "vergissen", a: "vergist", w: ["vergis", "vergisd"] },
      { s: "Het ___ tijd om te gaan.", v: "worden", a: "wordt", w: ["word", "wort"] },
      { s: "Het werk is goed ___.", v: "beoordelen", a: "beoordeeld", w: ["beoordeelt", "beoordeelte"] },
    ],
  ],
  en: [
    // 0 - short words
    [
      ["cat", "kat", "catt"],
      ["dog", "dogg", "doog"],
      ["fish", "fich", "fissh"],
      ["frog", "frogg", "frok"],
      ["duck", "duk", "duc"],
      ["milk", "milc", "mylk"],
      ["ship", "shipp", "shyp"],
      ["hat", "hatt", "haat"],
      ["bed", "bedd", "bedt"],
      ["sun", "sunn", "sonn"],
      ["box", "boks", "boxx"],
      ["jump", "jumpp", "jomp"],
    ],
    // 1 - sounds made of two letters
    [
      ["chair", "chare", "chiar"],
      ["sheep", "sheap", "shepe"],
      ["three", "thre", "threa"],
      ["whale", "whayl", "whail"],
      ["clock", "clok", "klock"],
      ["train", "trane", "trayn"],
      ["boat", "bote", "boaht"],
      ["night", "nite", "nigt"],
      ["green", "grean", "grene"],
      ["light", "lite", "ligt"],
      ["queen", "kween", "quean"],
      ["sharp", "sharpe", "sharpp"],
    ],
    // 2 - magic e and double letters
    [
      ["cake", "cak", "caik"],
      ["bike", "bik", "biek"],
      ["home", "hom", "hoam"],
      ["little", "litle", "littel"],
      ["happy", "hapy", "happey"],
      ["rabbit", "rabit", "rabbet"],
      ["kitten", "kiten", "kittin"],
      ["sleep", "sleap", "slepe"],
      ["smile", "smil", "smiel"],
      ["summer", "sumer", "sommer"],
      ["dinner", "diner", "dinnar"],
      ["yellow", "yelow", "yello"],
    ],
    // 3 - tricky everyday words
    [
      ["because", "becuase", "becaus"],
      ["friend", "freind", "frend"],
      ["people", "peeple", "peopel"],
      ["beautiful", "beutiful", "beautifull"],
      ["school", "skool", "shcool"],
      ["said", "sed", "siad"],
      ["would", "wuold", "whould"],
      ["could", "cuold", "coud"],
      ["know", "kno", "nkow"],
      ["write", "wrtie", "wryte"],
      ["answer", "anser", "ansewr"],
      ["laugh", "laff", "lauf"],
    ],
    // 4 - -tion, -sion, -ous, -ful
    [
      ["station", "stasion", "stashun"],
      ["television", "televition", "telivision"],
      ["famous", "famouse", "faymous"],
      ["careful", "carefull", "carful"],
      ["dangerous", "dangerus", "dangrous"],
      ["question", "questoin", "quesion"],
      ["delicious", "delicous", "delishus"],
      ["wonderful", "wonderfull", "wunderful"],
      ["nation", "nashun", "natoin"],
      ["adventure", "adventcher", "adventur"],
      ["decision", "desision", "decition"],
      ["nervous", "nervus", "nervouse"],
    ],
    // 5 - words that sound the same
    [
      { s: "They left ___ bags at school.", a: "their", w: ["there", "they're"] },
      { s: "___ going to the park.", a: "They're", w: ["Their", "There"] },
      { s: "Put the box over ___.", a: "there", w: ["their", "they're"] },
      { s: "I want ___ go home.", a: "to", w: ["too", "two"] },
      { s: "She has ___ cats.", a: "two", w: ["to", "too"] },
      { s: "This soup is ___ hot.", a: "too", w: ["to", "two"] },
      { s: "___ is your coat?", a: "Where", w: ["Were", "Wear"] },
      { s: "I ___ a warm hat in winter.", a: "wear", w: ["where", "were"] },
      { s: "The dog wagged ___ tail.", a: "its", w: ["it's", "its'"] },
      { s: "___ raining again.", a: "It's", w: ["Its", "Its'"] },
      { s: "Can you ___ the music?", a: "hear", w: ["here", "heer"] },
      { s: "I ___ the answer!", a: "know", w: ["no", "now"] },
    ],
    // 6 - words that are often misspelled
    [
      ["necessary", "neccessary", "necesary"],
      ["separate", "seperate", "separete"],
      ["definitely", "definately", "definitly"],
      ["environment", "enviroment", "envirnment"],
      ["government", "goverment", "govermint"],
      ["February", "Febuary", "Febrary"],
      ["library", "libary", "liberry"],
      ["surprise", "suprise", "surprize"],
      ["different", "diffrent", "diferent"],
      ["believe", "beleive", "belive"],
      ["receive", "recieve", "receeve"],
      ["business", "buisness", "bussiness"],
    ],
    // 7 - the hardest ones
    [
      ["conscience", "concience", "consciense"],
      ["rhythm", "rythm", "rhythym"],
      ["accommodate", "accomodate", "acommodate"],
      ["embarrass", "embarass", "embaras"],
      ["occurrence", "occurence", "ocurrence"],
      ["parliament", "parliment", "parlament"],
      ["mischievous", "mischievious", "mischevous"],
      ["privilege", "priviledge", "privelege"],
      ["guarantee", "garantee", "guarentee"],
      ["questionnaire", "questionaire", "questionnair"],
      ["exaggerate", "exagerate", "exxagerate"],
      ["conscientious", "consciencious", "conscientous"],
    ],
  ],
};

// ---------------------------------------------------------------------------
// Vocabulary - Woordenschat Wizard
// ---------------------------------------------------------------------------
//
// { k: kind, x: the word/emoji/sentence asked about, a: right, w: [wrong, wrong] }
// Kinds: pic (emoji -> word), opp (opposite), syn (same meaning), ctx (word
// that fits the sentence), odd (the one that does not belong: a is the odd
// one, w holds three that do), mean (what does this word mean), idiom,
// proverb.

const pic = (x, a) => ({ k: "pic", x, a });

export const VOCAB = {
  nl: [
    // 0 - picture words
    [
      pic("🐶", "hond"), pic("🐱", "kat"), pic("🐟", "vis"), pic("🍎", "appel"),
      pic("🚲", "fiets"), pic("🏠", "huis"), pic("☀️", "zon"), pic("🌙", "maan"),
      pic("🚗", "auto"), pic("🌳", "boom"), pic("📚", "boeken"), pic("⚽", "bal"),
      pic("🐦", "vogel"), pic("🍌", "banaan"), pic("⭐", "ster"), pic("🐸", "kikker"),
    ],
    // 1 - opposites
    [
      { k: "opp", x: "groot", a: "klein", w: ["lang", "rond"] },
      { k: "opp", x: "warm", a: "koud", w: ["heet", "zacht"] },
      { k: "opp", x: "snel", a: "langzaam", w: ["vlug", "sterk"] },
      { k: "opp", x: "blij", a: "verdrietig", w: ["vrolijk", "moe"] },
      { k: "opp", x: "nat", a: "droog", w: ["schoon", "zwaar"] },
      { k: "opp", x: "vol", a: "leeg", w: ["dicht", "zwaar"] },
      { k: "opp", x: "hoog", a: "laag", w: ["breed", "ver"] },
      { k: "opp", x: "open", a: "dicht", w: ["leeg", "stil"] },
      { k: "opp", x: "begin", a: "einde", w: ["midden", "start"] },
      { k: "opp", x: "dag", a: "nacht", w: ["middag", "zon"] },
      { k: "opp", x: "boven", a: "onder", w: ["naast", "achter"] },
      { k: "opp", x: "duur", a: "goedkoop", w: ["rijk", "nieuw"] },
      { k: "opp", x: "vriend", a: "vijand", w: ["maatje", "buurman"] },
      { k: "opp", x: "winnen", a: "verliezen", w: ["spelen", "rennen"] },
    ],
    // 2 - same meaning, and the odd one out
    [
      { k: "syn", x: "blij", a: "vrolijk", w: ["boos", "bang"] },
      { k: "syn", x: "snel", a: "vlug", w: ["traag", "zwaar"] },
      { k: "syn", x: "mooi", a: "prachtig", w: ["lelijk", "groot"] },
      { k: "syn", x: "beginnen", a: "starten", w: ["stoppen", "wachten"] },
      { k: "syn", x: "moe", a: "vermoeid", w: ["wakker", "fit"] },
      { k: "syn", x: "rennen", a: "hollen", w: ["zitten", "fietsen"] },
      { k: "syn", x: "boos", a: "kwaad", w: ["lief", "blij"] },
      { k: "syn", x: "dapper", a: "moedig", w: ["bang", "laf"] },
      { k: "odd", a: "stoel", w: ["appel", "peer", "banaan"] },
      { k: "odd", a: "hamer", w: ["rood", "blauw", "geel"] },
      { k: "odd", a: "fiets", w: ["hond", "kat", "paard"] },
      { k: "odd", a: "zomer", w: ["maandag", "dinsdag", "vrijdag"] },
      { k: "odd", a: "tafel", w: ["trompet", "gitaar", "piano"] },
      { k: "odd", a: "wolk", w: ["voet", "hand", "knie"] },
    ],
    // 3 - which word fits the sentence?
    [
      { k: "ctx", x: "Het regent, dus ik neem mijn ___ mee.", a: "paraplu", w: ["zonnebril", "zwembroek"] },
      { k: "ctx", x: "De bakker ___ elke ochtend vers brood.", a: "bakt", w: ["verft", "leest"] },
      { k: "ctx", x: "Na de gymles had ik veel ___, dus ik dronk twee bekers water.", a: "dorst", w: ["honger", "slaap"] },
      { k: "ctx", x: "Een ___ vliegt van bloem naar bloem.", a: "vlinder", w: ["slak", "mol"] },
      { k: "ctx", x: "In de ___ kun je boeken lenen.", a: "bibliotheek", w: ["bakkerij", "garage"] },
      { k: "ctx", x: "Mijn broertje is ___: hij is vandaag zes geworden.", a: "jarig", w: ["ziek", "verdrietig"] },
      { k: "ctx", x: "Je moet je handen ___ voor het eten.", a: "wassen", w: ["verven", "breken"] },
      { k: "ctx", x: "De juf ___ ons een verhaal voor.", a: "leest", w: ["schrijft", "tekent"] },
      { k: "ctx", x: "Het ijs is ___ door de warme zon.", a: "gesmolten", w: ["bevroren", "gebakken"] },
      { k: "ctx", x: "Een dokter voor dieren heet een ___.", a: "dierenarts", w: ["tandarts", "kapper"] },
      { k: "ctx", x: "Om de deur open te maken heb je een ___ nodig.", a: "sleutel", w: ["lepel", "schaar"] },
      { k: "ctx", x: "We gaan met de ___ naar Parijs.", a: "trein", w: ["slee", "lift"] },
    ],
    // 4 - what does it mean? (harder words)
    [
      { k: "mean", x: "verbaasd", a: "verrast", w: ["verveeld", "verdrietig"] },
      { k: "mean", x: "moedig", a: "dapper", w: ["voorzichtig", "lui"] },
      { k: "mean", x: "beschadigd", a: "kapot", w: ["nieuw", "schoon"] },
      { k: "mean", x: "herinneren", a: "onthouden", w: ["vergeten", "verzinnen"] },
      { k: "mean", x: "enorm", a: "heel groot", w: ["heel klein", "heel oud"] },
      { k: "mean", x: "vertrekken", a: "weggaan", w: ["aankomen", "blijven"] },
      { k: "mean", x: "gluren", a: "stiekem kijken", w: ["hard roepen", "snel rennen"] },
      { k: "mean", x: "ontdekken", a: "vinden", w: ["verliezen", "verstoppen"] },
      { k: "mean", x: "angstig", a: "bang", w: ["boos", "trots"] },
      { k: "mean", x: "slordig", a: "rommelig", w: ["netjes", "stil"] },
      { k: "mean", x: "fluisteren", a: "heel zacht praten", w: ["hard zingen", "snel lopen"] },
      { k: "mean", x: "nieuwsgierig", a: "wil alles weten", w: ["wil niets weten", "is heel moe"] },
    ],
    // 5 - groep 7/8 words in a sentence
    [
      { k: "ctx", x: "Lees de vraag ___, dan maak je minder fouten.", a: "nauwkeurig", w: ["slordig", "zelden"] },
      { k: "ctx", x: "De brandweer kwam snel, want het was een ___.", a: "noodgeval", w: ["feestje", "verjaardag"] },
      { k: "ctx", x: "Hij ___ dat hij zou winnen, maar hij werd tweede.", a: "verwachtte", w: ["vergat", "verloor"] },
      { k: "ctx", x: "Door rood licht rijden is ___.", a: "verboden", w: ["verplicht", "gezellig"] },
      { k: "ctx", x: "De leerlingen gaven hun ___ over het schoolreisje: de meesten vonden het leuk.", a: "mening", w: ["adres", "huiswerk"] },
      { k: "ctx", x: "Voor de toets moet je de stof goed ___.", a: "herhalen", w: ["vergeten", "verstoppen"] },
      { k: "ctx", x: "De wetenschapper deed een ___ om te kijken of haar idee klopte.", a: "experiment", w: ["vakantie", "wedstrijd"] },
      { k: "ctx", x: "Het museum is ___ open van 10 tot 5 uur.", a: "dagelijks", w: ["nooit", "gisteren"] },
      { k: "ctx", x: "Na de ruzie bood Tim zijn ___ aan.", a: "excuses", w: ["boterham", "fiets"] },
      { k: "ctx", x: "Dit water is niet ___: je kunt het beter niet drinken.", a: "drinkbaar", w: ["zichtbaar", "draagbaar"] },
      { k: "ctx", x: "De ___ van het huis is 350.000 euro.", a: "waarde", w: ["kleur", "lengte"] },
      { k: "ctx", x: "Het was zo donker dat we het pad ___ konden zien.", a: "nauwelijks", w: ["luidruchtig", "vrolijk"] },
    ],
    // 6 - groep 8: sayings (uitdrukkingen)
    [
      { k: "idiom", x: "de kat uit de boom kijken", a: "eerst afwachten hoe iets loopt", w: ["een kat uit een boom redden", "heel snel iets beslissen"] },
      { k: "idiom", x: "met de handen in het haar zitten", a: "niet meer weten wat je moet doen", w: ["je haar aan het wassen zijn", "heel blij zijn"] },
      { k: "idiom", x: "iemand een hart onder de riem steken", a: "iemand moed geven", w: ["iemand een riem geven", "iemand laten schrikken"] },
      { k: "idiom", x: "door de mand vallen", a: "betrapt worden: je geheim komt uit", w: ["van een trap vallen", "een mand vullen"] },
      { k: "idiom", x: "iets onder de knie hebben", a: "iets goed kunnen", w: ["je knie bezeren", "iets verstoppen"] },
      { k: "idiom", x: "de spijker op de kop slaan", a: "precies het goede zeggen", w: ["iets kapotmaken", "heel boos worden"] },
      { k: "idiom", x: "in de wolken zijn", a: "heel blij zijn", w: ["in een vliegtuig zitten", "heel moe zijn"] },
      { k: "idiom", x: "iemand voor de gek houden", a: "iemand iets wijsmaken", w: ["iemand helpen", "iemand vasthouden"] },
      { k: "idiom", x: "twee vliegen in één klap slaan", a: "twee dingen tegelijk bereiken", w: ["vliegen vangen", "twee keer slaan"] },
      { k: "idiom", x: "een oogje in het zeil houden", a: "opletten", w: ["een zeilboot kopen", "je ogen dichtdoen"] },
      { k: "idiom", x: "de boot afhouden", a: "iets uitstellen of niet willen beslissen", w: ["een boot besturen", "heel hard roeien"] },
      { k: "idiom", x: "uit je slof schieten", a: "plotseling boos worden", w: ["je pantoffels uittrekken", "heel hard rennen"] },
    ],
    // 7 - groep 8 top: proverbs and hard words
    [
      { k: "proverb", x: "Wie het laatst lacht, lacht het best.", a: "Pas aan het eind zie je wie echt wint.", w: ["Lachen is gezond.", "Wie te laat komt, mag niet meelachen."] },
      { k: "proverb", x: "Oost west, thuis best.", a: "Thuis is het het fijnst.", w: ["Je moet veel reizen.", "Het oosten is mooier dan het westen."] },
      { k: "proverb", x: "Beter een half ei dan een lege dop.", a: "Een beetje is beter dan niets.", w: ["Eieren moet je altijd delen.", "Een lege dop is lichter."] },
      { k: "proverb", x: "Al doende leert men.", a: "Door iets te doen, leer je het.", w: ["Je moet eerst alles lezen.", "Leren is altijd saai."] },
      { k: "proverb", x: "Haastige spoed is zelden goed.", a: "Als je te snel werkt, maak je fouten.", w: ["Snel zijn is altijd goed.", "Wie rent, wint altijd."] },
      { k: "proverb", x: "De appel valt niet ver van de boom.", a: "Kinderen lijken vaak op hun ouders.", w: ["Appels groeien aan bomen.", "Fruit moet je snel oprapen."] },
      { k: "proverb", x: "Wie niet waagt, wie niet wint.", a: "Als je nooit iets durft, bereik je niets.", w: ["Wie vraagt, krijgt altijd.", "Gokken is verstandig."] },
      { k: "proverb", x: "Een ongeluk komt zelden alleen.", a: "Als er iets misgaat, gaat er vaak nog meer mis.", w: ["Ongelukken gebeuren nooit.", "Je moet nooit alleen zijn."] },
      { k: "mean", x: "objectief", a: "zonder je eigen gevoel, eerlijk voor iedereen", w: ["heel persoonlijk", "vol fouten"] },
      { k: "mean", x: "consequentie", a: "gevolg", w: ["begin", "vraag"] },
      { k: "mean", x: "ambitieus", a: "wil veel bereiken", w: ["heel verlegen", "altijd moe"] },
      { k: "mean", x: "tijdelijk", a: "voor een korte tijd", w: ["voor altijd", "heel vroeg"] },
      { k: "mean", x: "overtuigen", a: "iemand laten geloven dat je gelijk hebt", w: ["iemand vergeten", "iemand uitlachen"] },
      { k: "mean", x: "zorgvuldig", a: "heel precies en voorzichtig", w: ["snel en slordig", "luid en druk"] },
    ],
  ],
  en: [
    // 0 - picture words
    [
      pic("🐶", "dog"), pic("🐱", "cat"), pic("🐟", "fish"), pic("🍎", "apple"),
      pic("🚲", "bike"), pic("🏠", "house"), pic("☀️", "sun"), pic("🌙", "moon"),
      pic("🚗", "car"), pic("🌳", "tree"), pic("📚", "books"), pic("⚽", "ball"),
      pic("🐦", "bird"), pic("🍌", "banana"), pic("⭐", "star"), pic("🐸", "frog"),
    ],
    // 1 - opposites
    [
      { k: "opp", x: "big", a: "small", w: ["long", "round"] },
      { k: "opp", x: "hot", a: "cold", w: ["warm", "soft"] },
      { k: "opp", x: "fast", a: "slow", w: ["quick", "strong"] },
      { k: "opp", x: "happy", a: "sad", w: ["cheerful", "tired"] },
      { k: "opp", x: "wet", a: "dry", w: ["clean", "heavy"] },
      { k: "opp", x: "full", a: "empty", w: ["closed", "heavy"] },
      { k: "opp", x: "high", a: "low", w: ["wide", "far"] },
      { k: "opp", x: "open", a: "closed", w: ["empty", "quiet"] },
      { k: "opp", x: "start", a: "end", w: ["middle", "begin"] },
      { k: "opp", x: "day", a: "night", w: ["noon", "sun"] },
      { k: "opp", x: "above", a: "below", w: ["beside", "behind"] },
      { k: "opp", x: "expensive", a: "cheap", w: ["rich", "new"] },
      { k: "opp", x: "friend", a: "enemy", w: ["buddy", "neighbour"] },
      { k: "opp", x: "win", a: "lose", w: ["play", "run"] },
    ],
    // 2 - same meaning, and the odd one out
    [
      { k: "syn", x: "happy", a: "cheerful", w: ["angry", "scared"] },
      { k: "syn", x: "quick", a: "fast", w: ["slow", "heavy"] },
      { k: "syn", x: "pretty", a: "lovely", w: ["ugly", "big"] },
      { k: "syn", x: "begin", a: "start", w: ["stop", "wait"] },
      { k: "syn", x: "tired", a: "sleepy", w: ["awake", "fit"] },
      { k: "syn", x: "run", a: "dash", w: ["sit", "cycle"] },
      { k: "syn", x: "angry", a: "cross", w: ["kind", "glad"] },
      { k: "syn", x: "brave", a: "courageous", w: ["scared", "cowardly"] },
      { k: "odd", a: "chair", w: ["apple", "pear", "banana"] },
      { k: "odd", a: "hammer", w: ["red", "blue", "yellow"] },
      { k: "odd", a: "bike", w: ["dog", "cat", "horse"] },
      { k: "odd", a: "summer", w: ["Monday", "Tuesday", "Friday"] },
      { k: "odd", a: "table", w: ["trumpet", "guitar", "piano"] },
      { k: "odd", a: "cloud", w: ["foot", "hand", "knee"] },
    ],
    // 3 - which word fits the sentence?
    [
      { k: "ctx", x: "It is raining, so I take my ___.", a: "umbrella", w: ["sunglasses", "swimsuit"] },
      { k: "ctx", x: "The baker ___ fresh bread every morning.", a: "bakes", w: ["paints", "reads"] },
      { k: "ctx", x: "After PE I was very ___, so I drank two cups of water.", a: "thirsty", w: ["hungry", "sleepy"] },
      { k: "ctx", x: "A ___ flies from flower to flower.", a: "butterfly", w: ["snail", "mole"] },
      { k: "ctx", x: "You can borrow books at the ___.", a: "library", w: ["bakery", "garage"] },
      { k: "ctx", x: "It is my brother's ___ today: he is six!", a: "birthday", w: ["holiday", "lesson"] },
      { k: "ctx", x: "Wash your ___ before dinner.", a: "hands", w: ["shoes", "books"] },
      { k: "ctx", x: "The teacher ___ a story to us.", a: "reads", w: ["writes", "draws"] },
      { k: "ctx", x: "The ice has ___ in the warm sun.", a: "melted", w: ["frozen", "baked"] },
      { k: "ctx", x: "A doctor for animals is called a ___.", a: "vet", w: ["dentist", "hairdresser"] },
      { k: "ctx", x: "To open the door you need a ___.", a: "key", w: ["spoon", "scissors"] },
      { k: "ctx", x: "We took the ___ to Paris.", a: "train", w: ["sledge", "lift"] },
    ],
    // 4 - what does it mean? (harder words)
    [
      { k: "mean", x: "amazed", a: "surprised", w: ["bored", "sad"] },
      { k: "mean", x: "courageous", a: "brave", w: ["careful", "lazy"] },
      { k: "mean", x: "damaged", a: "broken", w: ["new", "clean"] },
      { k: "mean", x: "recall", a: "remember", w: ["forget", "invent"] },
      { k: "mean", x: "enormous", a: "very big", w: ["very small", "very old"] },
      { k: "mean", x: "depart", a: "leave", w: ["arrive", "stay"] },
      { k: "mean", x: "peek", a: "look quickly and secretly", w: ["shout loudly", "run fast"] },
      { k: "mean", x: "discover", a: "find", w: ["lose", "hide"] },
      { k: "mean", x: "anxious", a: "worried", w: ["proud", "calm"] },
      { k: "mean", x: "messy", a: "untidy", w: ["neat", "quiet"] },
      { k: "mean", x: "whisper", a: "speak very softly", w: ["sing loudly", "walk quickly"] },
      { k: "mean", x: "curious", a: "wanting to know things", w: ["not wanting to know anything", "very tired"] },
    ],
    // 5 - harder words in a sentence
    [
      { k: "ctx", x: "Read the question ___, then you make fewer mistakes.", a: "carefully", w: ["sloppily", "rarely"] },
      { k: "ctx", x: "The fire brigade came quickly because it was an ___.", a: "emergency", w: ["party", "birthday"] },
      { k: "ctx", x: "He ___ to win the race, but he came second.", a: "expected", w: ["forgot", "lost"] },
      { k: "ctx", x: "Crossing on a red light is ___.", a: "forbidden", w: ["compulsory", "cosy"] },
      { k: "ctx", x: "The pupils gave their ___ about the school trip: most of them liked it.", a: "opinion", w: ["address", "homework"] },
      { k: "ctx", x: "Before the test you should ___ the lessons.", a: "revise", w: ["forget", "hide"] },
      { k: "ctx", x: "The scientist did an ___ to check if her idea was right.", a: "experiment", w: ["holiday", "match"] },
      { k: "ctx", x: "The museum is open ___ from 10 to 5.", a: "daily", w: ["never", "yesterday"] },
      { k: "ctx", x: "After the argument Tim offered an ___.", a: "apology", w: ["sandwich", "bicycle"] },
      { k: "ctx", x: "This water is not ___: better not drink it.", a: "drinkable", w: ["visible", "portable"] },
      { k: "ctx", x: "The ___ of the house is 350,000 euros.", a: "value", w: ["colour", "length"] },
      { k: "ctx", x: "It was so dark that we could ___ see the path.", a: "hardly", w: ["loudly", "happily"] },
    ],
    // 6 - idioms
    [
      { k: "idiom", x: "break the ice", a: "help people relax when they first meet", w: ["break something frozen", "get very cold"] },
      { k: "idiom", x: "a piece of cake", a: "very easy", w: ["a dessert", "a small part of something"] },
      { k: "idiom", x: "under the weather", a: "feeling a bit ill", w: ["outside in the rain", "very happy"] },
      { k: "idiom", x: "hit the books", a: "study hard", w: ["throw books", "tidy the library"] },
      { k: "idiom", x: "let the cat out of the bag", a: "give away a secret by accident", w: ["buy a new cat", "open a present"] },
      { k: "idiom", x: "on cloud nine", a: "extremely happy", w: ["on an aeroplane", "very tired"] },
      { k: "idiom", x: "keep an eye on", a: "watch carefully", w: ["close one eye", "lose something"] },
      { k: "idiom", x: "cost an arm and a leg", a: "be very expensive", w: ["be dangerous", "be free"] },
      { k: "idiom", x: "pull someone's leg", a: "joke with someone", w: ["help someone walk", "hurt someone"] },
      { k: "idiom", x: "kill two birds with one stone", a: "get two things done at once", w: ["go hunting", "throw stones"] },
      { k: "idiom", x: "the ball is in your court", a: "it is your turn to decide", w: ["you won the match", "you lost the ball"] },
      { k: "idiom", x: "hold your horses", a: "wait a moment", w: ["ride a horse", "run very fast"] },
    ],
    // 7 - proverbs and hard words
    [
      { k: "proverb", x: "The early bird catches the worm.", a: "People who start early get the best chances.", w: ["Birds like worms.", "Getting up early is boring."] },
      { k: "proverb", x: "Don't count your chickens before they hatch.", a: "Don't be sure of something before it happens.", w: ["Chickens are hard to count.", "Eggs hatch very quickly."] },
      { k: "proverb", x: "Actions speak louder than words.", a: "What you do matters more than what you say.", w: ["Shouting is better than talking.", "Words are useless."] },
      { k: "proverb", x: "Practice makes perfect.", a: "Doing something often makes you good at it.", w: ["You never need to practise.", "Perfect people never practise."] },
      { k: "proverb", x: "More haste, less speed.", a: "Rushing makes you make mistakes.", w: ["Faster is always better.", "Speed is always dangerous."] },
      { k: "proverb", x: "The apple doesn't fall far from the tree.", a: "Children are often like their parents.", w: ["Apples grow on trees.", "Pick up fruit quickly."] },
      { k: "proverb", x: "Nothing ventured, nothing gained.", a: "If you never try, you never achieve anything.", w: ["Asking always works.", "Gambling is sensible."] },
      { k: "proverb", x: "Every cloud has a silver lining.", a: "Something good can come from a bad situation.", w: ["Clouds are made of silver.", "It always rains."] },
      { k: "mean", x: "objective", a: "fair, without your own feelings", w: ["very personal", "full of mistakes"] },
      { k: "mean", x: "consequence", a: "result", w: ["beginning", "question"] },
      { k: "mean", x: "ambitious", a: "wanting to achieve a lot", w: ["very shy", "always tired"] },
      { k: "mean", x: "temporary", a: "for a short time", w: ["forever", "very early"] },
      { k: "mean", x: "persuade", a: "make someone believe you are right", w: ["forget someone", "laugh at someone"] },
      { k: "mean", x: "meticulous", a: "very careful and precise", w: ["quick and sloppy", "loud and busy"] },
    ],
  ],
};

// ---------------------------------------------------------------------------
// Reading texts - Leesdetective
// ---------------------------------------------------------------------------
//
// Levels 0 and 1 are built from sentence templates in games/lezen.js (a
// short text about a pet, a trip), so they never run out. Levels 2-7 are
// the hand-written texts below, three questions each. `type` is the reading
// skill the question trains; the game shows its name and a tip for it:
//   who (find it in the text), order (sequence), refer (what a word like
//   "she" or "that" points to), why (cause and reason), signal (signal
//   words), word (a word's meaning from the text), main (main idea),
//   fact (fact or opinion), infer (read between the lines), purpose (why
//   the text was written / what kind of text it is).

const q = (type, nl, en) => ({ type, nl, en });

export const PASSAGES = [
  // --- level 2 (groep 5/6) -------------------------------------------------
  {
    level: 2,
    title: { nl: "De verloren sleutel", en: "The lost key" },
    text: {
      nl: "Sara komt thuis uit school. Ze zoekt in haar tas naar de sleutel, maar die is er niet. Eerst kijkt ze in haar jaszak. Daarna belt ze haar oma, die om de hoek woont. Oma komt meteen en neemt de reservesleutel mee. Sara is blij, want ze heeft het koud.",
      en: "Sara comes home from school. She looks in her bag for the key, but it isn't there. First she checks her coat pocket. Then she calls her grandma, who lives around the corner. Grandma comes straight away and brings the spare key. Sara is happy, because she is cold.",
    },
    questions: [
      q("order", { q: "Wat doet Sara eerst?", a: "Ze kijkt in haar jaszak.", w: ["Ze belt haar oma.", "Ze gaat naar de buren."] }, { q: "What does Sara do first?", a: "She checks her coat pocket.", w: ["She calls her grandma.", "She goes to the neighbours."] }),
      q("refer", { q: "‘...haar oma, die om de hoek woont.’ Wie woont om de hoek?", a: "oma", w: ["Sara", "de juf"] }, { q: "‘...her grandma, who lives around the corner.’ Who lives around the corner?", a: "Grandma", w: ["Sara", "the teacher"] }),
      q("why", { q: "Waarom is Sara blij?", a: "Ze heeft het koud en kan nu naar binnen.", w: ["Ze krijgt een cadeautje.", "School is vroeg uit."] }, { q: "Why is Sara happy?", a: "She is cold and can now go inside.", w: ["She gets a present.", "School finished early."] }),
    ],
  },
  {
    level: 2,
    title: { nl: "De bonen van Ruben", en: "Ruben's beans" },
    text: {
      nl: "In de klas van meester Tim heeft elk kind een eigen bakje met aarde. Ruben stopt er drie bonen in. Elke ochtend geeft hij ze een beetje water. Na een week ziet hij een klein groen plantje. Na twee weken zijn het er drie. Ruben neemt de plantjes mee naar huis voor zijn moeder.",
      en: "In Mr Tim's class every child has their own little tray of soil. Ruben puts three beans in it. Every morning he gives them a little water. After a week he sees a tiny green plant. After two weeks there are three. Ruben takes the plants home for his mother.",
    },
    questions: [
      q("who", { q: "Hoeveel bonen stopt Ruben in het bakje?", a: "drie", w: ["twee", "vijf"] }, { q: "How many beans does Ruben put in the tray?", a: "three", w: ["two", "five"] }),
      q("order", { q: "Wat ziet Ruben na één week?", a: "een klein groen plantje", w: ["drie plantjes", "een bloem"] }, { q: "What does Ruben see after one week?", a: "a tiny green plant", w: ["three plants", "a flower"] }),
      q("refer", { q: "‘Elke ochtend geeft hij ze een beetje water.’ Wie of wat zijn ‘ze’?", a: "de bonen", w: ["de kinderen", "de ouders"] }, { q: "‘Every morning he gives them a little water.’ Who or what are ‘them’?", a: "the beans", w: ["the children", "the parents"] }),
    ],
  },
  {
    level: 2,
    title: { nl: "De taart", en: "The cake" },
    text: {
      nl: "Morgen is Noor jarig. Ze wordt negen jaar. Vandaag bakt ze samen met haar vader een grote chocoladetaart. Papa weegt de bloem af en Noor breekt de eieren. Daarna gaat de taart een uur in de oven. Het hele huis ruikt lekker. Morgen mag Noor de taart in de klas uitdelen.",
      en: "Tomorrow is Noor's birthday. She will be nine. Today she bakes a big chocolate cake with her dad. Dad weighs the flour and Noor cracks the eggs. Then the cake goes in the oven for an hour. The whole house smells lovely. Tomorrow Noor may share the cake with her class.",
    },
    questions: [
      q("who", { q: "Hoe oud wordt Noor?", a: "negen jaar", w: ["acht jaar", "tien jaar"] }, { q: "How old will Noor be?", a: "nine", w: ["eight", "ten"] }),
      q("who", { q: "Wat doet Noor bij het bakken?", a: "Ze breekt de eieren.", w: ["Ze weegt de bloem af.", "Ze zet de oven aan."] }, { q: "What does Noor do while baking?", a: "She cracks the eggs.", w: ["She weighs the flour.", "She turns on the oven."] }),
      q("infer", { q: "Wanneer eet de klas van de taart?", a: "morgen", w: ["vandaag", "volgende week"] }, { q: "When will the class eat the cake?", a: "tomorrow", w: ["today", "next week"] }),
    ],
  },
  {
    level: 2,
    title: { nl: "Kees de kat", en: "Kees the cat" },
    text: {
      nl: "Kees is een oude rode kat. Hij slaapt het liefst in de zon op de vensterbank. Als het regent, kruipt hij onder de deken op de bank. Kees houdt niet van de stofzuiger. Zodra die aangaat, rent hij de trap op. Pas als het weer stil is, komt hij naar beneden.",
      en: "Kees is an old ginger cat. He likes sleeping in the sun on the windowsill best. When it rains, he crawls under the blanket on the sofa. Kees does not like the vacuum cleaner. As soon as it is switched on, he runs up the stairs. Only when it is quiet again does he come back down.",
    },
    questions: [
      q("who", { q: "Waar slaapt Kees als het regent?", a: "onder de deken op de bank", w: ["op de vensterbank", "in de tuin"] }, { q: "Where does Kees sleep when it rains?", a: "under the blanket on the sofa", w: ["on the windowsill", "in the garden"] }),
      q("refer", { q: "‘Zodra die aangaat...’ Wat is ‘die’?", a: "de stofzuiger", w: ["de zon", "de deken"] }, { q: "‘As soon as it is switched on...’ What is ‘it’?", a: "the vacuum cleaner", w: ["the sun", "the blanket"] }),
      q("why", { q: "Waarom rent Kees de trap op?", a: "Hij houdt niet van de stofzuiger.", w: ["Hij heeft honger.", "Het regent."] }, { q: "Why does Kees run up the stairs?", a: "He does not like the vacuum cleaner.", w: ["He is hungry.", "It is raining."] }),
    ],
  },

  // --- level 3 (groep 6) ---------------------------------------------------
  {
    level: 3,
    title: { nl: "Egels in de winter", en: "Hedgehogs in winter" },
    text: {
      nl: "In de herfst eten egels zo veel mogelijk. Ze hebben een dikke laag vet nodig, want in de winter slapen ze maandenlang. Die lange slaap heet een winterslaap. Egels zoeken daarvoor een warm plekje, bijvoorbeeld onder een hoop bladeren. Hark jij in de herfst de tuin aan? Laat dan een hoekje met bladeren liggen. Zo help je de egels de winter door.",
      en: "In autumn hedgehogs eat as much as they can. They need a thick layer of fat, because in winter they sleep for months. This long sleep is called hibernation. For it, hedgehogs look for a warm spot, for example under a pile of leaves. Are you raking the garden in autumn? Then leave one corner of leaves. That way you help the hedgehogs through the winter.",
    },
    questions: [
      q("why", { q: "Waarom eten egels in de herfst zo veel?", a: "Ze hebben vet nodig voor hun winterslaap.", w: ["Ze willen groter worden dan andere dieren.", "In de herfst is er niets anders te doen."] }, { q: "Why do hedgehogs eat so much in autumn?", a: "They need fat for their hibernation.", w: ["They want to grow bigger than other animals.", "There is nothing else to do in autumn."] }),
      q("signal", { q: "In de tekst staat het signaalwoord ‘want’. Wat komt er na ‘want’?", a: "een reden", w: ["een tegenstelling", "een voorbeeld"] }, { q: "The text uses the signal word ‘because’. What comes after ‘because’?", a: "a reason", w: ["a contrast", "an example"] }),
      q("purpose", { q: "Wat vraagt de schrijver aan de lezer?", a: "Laat een hoekje met bladeren liggen.", w: ["Geef egels melk.", "Hark alle bladeren weg."] }, { q: "What does the writer ask the reader to do?", a: "Leave one corner of leaves.", w: ["Give hedgehogs milk.", "Rake away all the leaves."] }),
    ],
  },
  {
    level: 3,
    title: { nl: "De fietstocht", en: "The bike ride" },
    text: {
      nl: "Op zaterdag gaat de familie Jansen fietsen. Het is mooi weer, maar er staat veel wind. Toch fietsen ze twintig kilometer naar het strand. Onderweg stoppen ze bij een boerderij en eten ze een ijsje. Aan het strand is het zo druk dat ze bijna geen plekje vinden. Op de terugweg hebben ze de wind in de rug. Daardoor gaat het veel sneller.",
      en: "On Saturday the Jansen family goes cycling. The weather is nice, but it is very windy. Still, they cycle twenty kilometres to the beach. On the way they stop at a farm and have an ice cream. The beach is so busy that they can hardly find a spot. On the way back they have the wind behind them. Because of that, it goes much faster.",
    },
    questions: [
      q("signal", { q: "Welk woord laat een tegenstelling zien?", a: "maar", w: ["onderweg", "zaterdag"] }, { q: "Which word shows a contrast?", a: "but", w: ["on the way", "Saturday"] }),
      q("why", { q: "Waarom gaat de terugweg sneller?", a: "Ze hebben de wind in de rug.", w: ["Ze hebben een ijsje gegeten.", "De weg terug is korter."] }, { q: "Why is the way back faster?", a: "They have the wind behind them.", w: ["They have had an ice cream.", "The way back is shorter."] }),
      q("who", { q: "Waar stoppen ze onderweg?", a: "bij een boerderij", w: ["bij het strand", "bij een winkel"] }, { q: "Where do they stop on the way?", a: "at a farm", w: ["at the beach", "at a shop"] }),
    ],
  },
  {
    level: 3,
    title: { nl: "Een brief aan de burgemeester", en: "A letter to the mayor" },
    text: {
      nl: "Beste burgemeester, ik ben Mila en ik zit in groep 6. Bij ons op het plein is de glijbaan al maanden kapot. Daarom spelen we nu vaak op straat, en dat is gevaarlijk. Wilt u de glijbaan laten maken? Dan kunnen we weer veilig spelen. Groetjes, Mila",
      en: "Dear Mayor, my name is Mila and I am in year 6. The slide in our playground has been broken for months. That is why we often play in the street now, and that is dangerous. Could you please have the slide repaired? Then we can play safely again. Best wishes, Mila",
    },
    questions: [
      q("purpose", { q: "Waarom schrijft Mila deze brief?", a: "Ze wil dat de glijbaan gemaakt wordt.", w: ["Ze wil de burgemeester uitnodigen.", "Ze wil vertellen over groep 6."] }, { q: "Why does Mila write this letter?", a: "She wants the slide to be repaired.", w: ["She wants to invite the mayor.", "She wants to talk about her class."] }),
      q("why", { q: "Wat is het gevolg van de kapotte glijbaan?", a: "De kinderen spelen op straat.", w: ["De kinderen gaan eerder naar huis.", "Het plein gaat dicht."] }, { q: "What is the result of the broken slide?", a: "The children play in the street.", w: ["The children go home earlier.", "The playground closes."] }),
      q("who", { q: "In welke groep zit Mila?", a: "groep 6", w: ["groep 5", "groep 8"] }, { q: "Which year is Mila in?", a: "year 6", w: ["year 5", "year 8"] }),
    ],
  },
  {
    level: 3,
    title: { nl: "Een papieren vliegtuig", en: "A paper plane" },
    text: {
      nl: "Pak een vel papier. Vouw het eerst in de lengte dubbel en vouw het weer open. Vouw daarna de twee bovenhoeken naar de middellijn. Vouw de nieuwe schuine kanten nog een keer naar het midden. Vouw het vliegtuig dicht langs de middellijn. Maak tot slot aan beide kanten een vleugel. Nu kun je hem laten vliegen!",
      en: "Take a sheet of paper. First fold it in half lengthways and unfold it again. Next fold the two top corners to the middle line. Fold the new slanted edges to the middle once more. Fold the plane closed along the middle line. Finally, make a wing on each side. Now you can let it fly!",
    },
    questions: [
      q("purpose", { q: "Wat voor tekst is dit?", a: "een instructie", w: ["een verhaal", "een gedicht"] }, { q: "What kind of text is this?", a: "instructions", w: ["a story", "a poem"] }),
      q("order", { q: "Wat doe je direct na het dubbelvouwen en weer openvouwen?", a: "De bovenhoeken naar de middellijn vouwen.", w: ["Een vleugel maken.", "Het vliegtuig laten vliegen."] }, { q: "What do you do straight after folding in half and unfolding?", a: "Fold the top corners to the middle line.", w: ["Make a wing.", "Let the plane fly."] }),
      q("signal", { q: "Welke woorden vertellen dat het de laatste stap is?", a: "tot slot", w: ["eerst", "daarna"] }, { q: "Which word tells you it is the last step?", a: "finally", w: ["first", "next"] }),
    ],
  },

  // --- level 4 (groep 7) ---------------------------------------------------
  {
    level: 4,
    title: { nl: "Waarom zijn flamingo's roze?", en: "Why are flamingos pink?" },
    text: {
      nl: "Flamingo's worden niet roze geboren. De jongen zijn eerst grijs of wit. Hun roze kleur komt van hun eten. Flamingo's eten kleine kreeftjes en algen. Daarin zitten rode kleurstoffen. Die kleurstoffen komen in hun veren terecht. Hoe meer van dat eten een flamingo krijgt, hoe rozer hij wordt. Ik vind flamingo's de mooiste vogels van de wereld.",
      en: "Flamingos are not born pink. The chicks are grey or white at first. Their pink colour comes from their food. Flamingos eat tiny shrimps and algae. These contain red colourings. Those colourings end up in their feathers. The more of that food a flamingo gets, the pinker it becomes. I think flamingos are the most beautiful birds in the world.",
    },
    questions: [
      q("main", { q: "Waar gaat deze tekst vooral over?", a: "Hoe flamingo's aan hun roze kleur komen.", w: ["Waar flamingo's wonen.", "Hoe flamingo's hun jongen voeren."] }, { q: "What is this text mainly about?", a: "How flamingos get their pink colour.", w: ["Where flamingos live.", "How flamingos feed their chicks."] }),
      q("fact", { q: "Welke zin is een mening?", a: "Ik vind flamingo's de mooiste vogels van de wereld.", w: ["Flamingo's eten kleine kreeftjes en algen.", "De jongen zijn eerst grijs of wit."] }, { q: "Which sentence is an opinion?", a: "I think flamingos are the most beautiful birds in the world.", w: ["Flamingos eat tiny shrimps and algae.", "The chicks are grey or white at first."] }),
      q("infer", { q: "Een flamingo in de dierentuin krijgt weinig kreeftjes. Wat gebeurt er waarschijnlijk?", a: "Hij wordt bleker.", w: ["Hij wordt rozer.", "Hij krijgt blauwe veren."] }, { q: "A flamingo in a zoo gets very few shrimps. What probably happens?", a: "It gets paler.", w: ["It gets pinker.", "It grows blue feathers."] }),
    ],
  },
  {
    level: 4,
    title: { nl: "De eerste fiets", en: "The first bicycle" },
    text: {
      nl: "Ruim tweehonderd jaar geleden bedacht de Duitser Karl Drais een loopfiets. Die had geen trappers. Je zette je af met je voeten, net als op een loopfietsje voor peuters. Later kwamen er fietsen met trappers aan het voorwiel. Het voorwiel werd steeds groter, zodat je sneller ging. Die hoge fietsen waren wel gevaarlijk. Pas toen de fietsketting werd uitgevonden, kreeg de fiets de vorm die wij nu kennen.",
      en: "More than two hundred years ago the German Karl Drais invented a running machine. It had no pedals. You pushed yourself along with your feet, just like on a toddler's balance bike. Later came bikes with pedals on the front wheel. The front wheel got bigger and bigger, so that you went faster. Those tall bikes were dangerous, though. Only when the bicycle chain was invented did the bike get the shape we know today.",
    },
    questions: [
      q("main", { q: "Wat is de beste titel voor deze tekst?", a: "Hoe de fiets veranderde", w: ["Fietsen in Duitsland", "Waarom peuters een loopfiets hebben"] }, { q: "What is the best title for this text?", a: "How the bicycle changed", w: ["Cycling in Germany", "Why toddlers have balance bikes"] }),
      q("order", { q: "Wat kwam er als eerste?", a: "een fiets zonder trappers", w: ["een fiets met een ketting", "een fiets met een groot voorwiel"] }, { q: "What came first?", a: "a bike without pedals", w: ["a bike with a chain", "a bike with a huge front wheel"] }),
      q("signal", { q: "‘...zodat je sneller ging.’ Wat vertelt ‘zodat’?", a: "een gevolg", w: ["een tegenstelling", "een tijd"] }, { q: "‘...so that you went faster.’ What does ‘so that’ tell you?", a: "a result", w: ["a contrast", "a time"] }),
    ],
  },
  {
    level: 4,
    title: { nl: "Schooltuin of speelplein?", en: "School garden or playground?" },
    text: {
      nl: "De school van Daan krijgt een nieuw stuk grond. De kinderen mogen kiezen: een schooltuin of een groter speelplein. Groep 7 houdt een stemming. Zeventien kinderen stemmen voor het speelplein en elf voor de schooltuin. Daan is teleurgesteld. Hij vindt een schooltuin veel leerzamer. Toch belooft de directeur dat er naast het plein een paar plantenbakken komen.",
      en: "Daan's school is getting a new piece of land. The children may choose: a school garden or a bigger playground. Year 7 holds a vote. Seventeen children vote for the playground and eleven for the garden. Daan is disappointed. He thinks a school garden is much more educational. Still, the head teacher promises there will be a few planters next to the playground.",
    },
    questions: [
      q("fact", { q: "Welke zin is een feit?", a: "Zeventien kinderen stemmen voor het speelplein.", w: ["Een schooltuin is veel leerzamer.", "Een speelplein is het leukst."] }, { q: "Which sentence is a fact?", a: "Seventeen children vote for the playground.", w: ["A school garden is much more educational.", "A playground is the most fun."] }),
      q("infer", { q: "Waar heeft Daan waarschijnlijk op gestemd?", a: "de schooltuin", w: ["het speelplein", "hij heeft niet gestemd"] }, { q: "What did Daan probably vote for?", a: "the school garden", w: ["the playground", "he did not vote"] }),
      q("who", { q: "Hoeveel kinderen stemden er in totaal?", a: "28", w: ["17", "11"] }, { q: "How many children voted in total?", a: "28", w: ["17", "11"] }),
    ],
  },
  {
    level: 4,
    title: { nl: "Het zwerfafvalteam", en: "The litter team" },
    text: {
      nl: "Elke woensdagmiddag gaat Lotte met haar buurmeisje afval rapen in het park. Ze hebben allebei een grijper en een emmer. In een uur vinden ze vaak wel dertig blikjes en flesjes. Sinds kort mogen ze de flesjes inleveren bij de supermarkt. Van het statiegeld kopen ze nieuwe vuilniszakken. Andere kinderen uit de buurt willen nu ook meedoen.",
      en: "Every Wednesday afternoon Lotte and the girl next door pick up litter in the park. They both have a grabber and a bucket. In one hour they often find as many as thirty cans and bottles. Recently they have been allowed to return the bottles to the supermarket. With the deposit money they buy new rubbish bags. Other children from the neighbourhood now want to join in too.",
    },
    questions: [
      q("main", { q: "Wat is de hoofdgedachte?", a: "Lotte en haar buurmeisje houden het park schoon.", w: ["In het park staan te weinig prullenbakken.", "De supermarkt verkoopt vuilniszakken."] }, { q: "What is the main idea?", a: "Lotte and her neighbour keep the park clean.", w: ["There are too few bins in the park.", "The supermarket sells rubbish bags."] }),
      q("who", { q: "Waarvan kopen ze nieuwe vuilniszakken?", a: "van het statiegeld", w: ["van hun zakgeld", "van de gemeente"] }, { q: "What do they buy new rubbish bags with?", a: "the deposit money", w: ["their pocket money", "money from the council"] }),
      q("infer", { q: "Wat laat de laatste zin zien?", a: "Hun voorbeeld maakt anderen enthousiast.", w: ["De andere kinderen zijn jaloers.", "Het park is nu helemaal schoon."] }, { q: "What does the last sentence show?", a: "Their example makes others keen to help.", w: ["The other children are jealous.", "The park is now completely clean."] }),
    ],
  },

  // --- level 5 (groep 7/8) -------------------------------------------------
  {
    level: 5,
    title: { nl: "De spreekbeurt", en: "The class talk" },
    text: {
      nl: "Yara staart naar haar kaartjes. Over vijf minuten moet ze haar spreekbeurt houden over vulkanen. Haar handen zijn klam en haar buik voelt raar. Thuis heeft ze wel tien keer geoefend, voor de spiegel en voor haar broertje. ‘Yara, jij bent!’ zegt juf Esra. Yara loopt naar voren. Als ze de eerste foto laat zien, roept iemand: ‘Wauw!’ Yara glimlacht. Haar stem wordt steeds rustiger.",
      en: "Yara stares at her cards. In five minutes she has to give her talk about volcanoes. Her hands are clammy and her tummy feels strange. At home she practised at least ten times, in front of the mirror and for her little brother. ‘Yara, your turn!’ says Miss Esra. Yara walks to the front. When she shows the first photo, someone calls out: ‘Wow!’ Yara smiles. Her voice gets calmer and calmer.",
    },
    questions: [
      q("infer", { q: "Hoe voelt Yara zich aan het begin?", a: "zenuwachtig", w: ["boos", "verveeld"] }, { q: "How does Yara feel at the start?", a: "nervous", w: ["angry", "bored"] }),
      q("infer", { q: "Waarom wordt Yara's stem rustiger?", a: "De klas reageert enthousiast, dus ze krijgt meer zelfvertrouwen.", w: ["De juf zegt dat ze moet ophouden.", "Ze heeft deze spreekbeurt al eens in de klas gehouden."] }, { q: "Why does Yara's voice get calmer?", a: "The class is enthusiastic, so she feels more confident.", w: ["The teacher tells her to stop.", "She has given this talk to the class before."] }),
      q("word", { q: "Wat betekent ‘klam’ in deze tekst?", a: "een beetje nat van het zweet", w: ["heel koud", "vies van de verf"] }, { q: "What does ‘clammy’ mean in this text?", a: "a bit damp with sweat", w: ["very cold", "dirty with paint"] }),
    ],
  },
  {
    level: 5,
    title: { nl: "Het geheim van de zolder", en: "The secret in the attic" },
    text: {
      nl: "Al weken hoort Thijs 's nachts gestommel boven zijn kamer. Zijn ouders zeggen dat het de wind is. Maar de wind maakt toch geen krassende geluiden? Op een ochtend klimt Thijs met een zaklamp de zoldertrap op. In een oude doos met truien vindt hij vier kleine, kale diertjes met gesloten oogjes. In de hoek zit een grijze moeder met een lange staart hem aan te kijken.",
      en: "For weeks Thijs has heard scuffling above his bedroom at night. His parents say it is the wind. But the wind doesn't make scratching noises, does it? One morning Thijs climbs the attic stairs with a torch. In an old box of jumpers he finds four tiny, bald animals with their eyes closed. In the corner a grey mother with a long tail sits watching him.",
    },
    questions: [
      q("infer", { q: "Welke dieren vindt Thijs waarschijnlijk?", a: "jonge muizen of ratten", w: ["jonge katjes", "jonge vogeltjes"] }, { q: "Which animals does Thijs probably find?", a: "baby mice or rats", w: ["kittens", "baby birds"] }),
      q("infer", { q: "Waarom denken zijn ouders dat het de wind is?", a: "Ze zijn zelf niet gaan kijken.", w: ["Ze hebben de diertjes al gezien.", "Het stormt elke nacht."] }, { q: "Why do his parents think it is the wind?", a: "They have not gone to look themselves.", w: ["They have already seen the animals.", "There is a storm every night."] }),
      q("refer", { q: "‘...zit een grijze moeder hem aan te kijken.’ Wie is ‘hem’?", a: "Thijs", w: ["de wind", "zijn vader"] }, { q: "‘...a grey mother sits watching him.’ Who is ‘him’?", a: "Thijs", w: ["the wind", "his father"] }),
    ],
  },
  {
    level: 5,
    title: { nl: "Opa Henk en Bram", en: "Grandpa Henk and Bram" },
    text: {
      nl: "Opa Henk woont sinds kort in een verzorgingshuis. Hij praat weinig en zit vaak alleen bij het raam. Op een dinsdag komt er een vrijwilliger langs met een grote, zachte hond: Bram. Bram legt meteen zijn kop op opa's knie. Opa begint te lachen en vertelt over de hond die hij vroeger had. Sindsdien kijkt hij elke dinsdag uit naar het bezoek. De verzorgers zien dat hij ook op andere dagen vaker met mensen praat.",
      en: "Grandpa Henk has recently moved into a care home. He talks little and often sits alone by the window. One Tuesday a volunteer comes by with a big, soft dog: Bram. Bram immediately rests his head on Grandpa's knee. Grandpa starts to laugh and talks about the dog he used to have. Since then he looks forward to the visit every Tuesday. The carers notice that he talks to people more often on other days too.",
    },
    questions: [
      q("main", { q: "Wat is de boodschap van deze tekst?", a: "Een dier kan iemand vrolijker en opener maken.", w: ["Honden horen niet in een verzorgingshuis.", "Opa Henk wil weer thuis wonen."] }, { q: "What is the message of this text?", a: "An animal can make someone happier and more open.", w: ["Dogs do not belong in a care home.", "Grandpa Henk wants to live at home again."] }),
      q("infer", { q: "Hoe voelde opa Henk zich waarschijnlijk vóór het bezoek van Bram?", a: "eenzaam", w: ["opgewonden", "trots"] }, { q: "How did Grandpa Henk probably feel before Bram's visit?", a: "lonely", w: ["excited", "proud"] }),
      q("word", { q: "Wat is een ‘vrijwilliger’?", a: "iemand die helpt zonder er geld voor te krijgen", w: ["iemand die in een verzorgingshuis woont", "een dokter voor honden"] }, { q: "What is a ‘volunteer’?", a: "someone who helps without being paid for it", w: ["someone who lives in a care home", "a doctor for dogs"] }),
    ],
  },
  {
    level: 5,
    title: { nl: "Onweer op de camping", en: "Thunder at the campsite" },
    text: {
      nl: "Het is benauwd warm in de tent. In de verte rommelt het. ‘Nog ver weg,’ zegt mama, ‘tel maar tussen de flits en de knal.’ Mees telt tot twaalf. Even later nog maar tot vier. De wind trekt aan de scheerlijnen. ‘Pak je knuffel en je schoenen,’ zegt papa rustig. Een paar minuten later zitten ze met z'n allen in de auto, terwijl de regen op het dak roffelt.",
      en: "It is stuffy and hot in the tent. In the distance there is a rumble. ‘Still far away,’ says Mum, ‘count between the flash and the bang.’ Mees counts to twelve. A little later only to four. The wind tugs at the guy ropes. ‘Grab your teddy and your shoes,’ Dad says calmly. A few minutes later they are all sitting in the car, while the rain drums on the roof.",
    },
    questions: [
      q("infer", { q: "Wat betekent het dat Mees eerst tot twaalf telt en later tot vier?", a: "Het onweer komt dichterbij.", w: ["Het onweer gaat weg.", "Mees kan niet goed tellen."] }, { q: "What does it mean that Mees first counts to twelve and later only to four?", a: "The storm is coming closer.", w: ["The storm is moving away.", "Mees cannot count very well."] }),
      q("infer", { q: "Waarom gaan ze in de auto zitten?", a: "Bij onweer is een auto veiliger dan een tent.", w: ["Ze willen naar huis rijden.", "In de tent is het te warm."] }, { q: "Why do they go and sit in the car?", a: "In a thunderstorm a car is safer than a tent.", w: ["They want to drive home.", "It is too hot in the tent."] }),
      q("word", { q: "Wat betekent ‘benauwd warm’?", a: "warm en drukkend", w: ["een beetje fris", "warm en gezellig"] }, { q: "What does ‘stuffy and hot’ mean?", a: "warm and airless", w: ["a bit chilly", "warm and cosy"] }),
    ],
  },

  // --- level 6 (groep 8) ---------------------------------------------------
  {
    level: 6,
    title: { nl: "Moet de zomervakantie korter?", en: "Should the summer holiday be shorter?" },
    text: {
      nl: "Sommige mensen willen de zomervakantie inkorten van zes naar vier weken. Zij zeggen dat kinderen in zes weken veel vergeten van wat ze hebben geleerd. Onderzoek laat zien dat vooral rekenen in de zomer terugzakt. Anderen zijn het daar niet mee eens. Zij vinden dat kinderen juist tijd nodig hebben om te spelen en uit te rusten. Bovendien kunnen gezinnen dan samen op reis. Ik denk dat vier weken te kort is, want na een druk schooljaar ben je echt moe.",
      en: "Some people want to shorten the summer holiday from six weeks to four. They say that in six weeks children forget a lot of what they have learned. Research shows that maths in particular slips back over the summer. Others disagree. They think children actually need time to play and rest. Besides, families can then travel together. I think four weeks is too short, because after a busy school year you are really tired.",
    },
    questions: [
      q("purpose", { q: "Wat is het doel van deze tekst?", a: "voor- en nadelen laten zien, met aan het eind een mening", w: ["de lezer leren rekenen", "de lezer vermaken met een grappig verhaal"] }, { q: "What is the purpose of this text?", a: "to show arguments for and against, ending with an opinion", w: ["to teach the reader maths", "to entertain the reader with a funny story"] }),
      q("fact", { q: "Welk argument gebruiken de mensen die de vakantie korter willen?", a: "Kinderen vergeten in zes weken veel van wat ze hebben geleerd.", w: ["Gezinnen kunnen dan samen op reis.", "Na een druk schooljaar ben je echt moe."] }, { q: "Which argument do the people who want a shorter holiday use?", a: "In six weeks children forget a lot of what they have learned.", w: ["Families can then travel together.", "After a busy school year you are really tired."] }),
      q("signal", { q: "Met welk signaalwoord voegt de schrijver nog een argument toe?", a: "bovendien", w: ["want", "sommige"] }, { q: "Which signal word does the writer use to add another argument?", a: "besides", w: ["because", "some"] }),
    ],
  },
  {
    level: 6,
    title: { nl: "Plasticsoep", en: "Plastic soup" },
    text: {
      nl: "Elk jaar komen er miljoenen kilo's plastic in de zee terecht. Door zon en golven valt het uit elkaar in kleine stukjes: microplastics. Vissen en vogels zien die stukjes aan voor eten. Zo komt plastic in hun maag en soms zelfs in ons eten. Wetenschappers noemen de drijvende afvalvlekken in de oceaan ook wel ‘plasticsoep’. Iedereen kan helpen door minder wegwerpplastic te gebruiken. Neem bijvoorbeeld een eigen drinkfles mee.",
      en: "Every year millions of kilos of plastic end up in the sea. Sun and waves break it into tiny pieces: microplastics. Fish and birds mistake those pieces for food. That is how plastic gets into their stomachs, and sometimes even into our food. Scientists also call the floating patches of rubbish in the ocean ‘plastic soup’. Everyone can help by using less throwaway plastic. For example, take your own water bottle.",
    },
    questions: [
      q("main", { q: "Wat is de hoofdgedachte van de tekst?", a: "Plastic in zee is schadelijk, en iedereen kan helpen dat te verminderen.", w: ["Vissen eten graag plastic.", "Microplastics worden gemaakt in fabrieken aan zee."] }, { q: "What is the main idea of the text?", a: "Plastic in the sea is harmful, and everyone can help reduce it.", w: ["Fish like eating plastic.", "Microplastics are made in factories by the sea."] }),
      q("signal", { q: "‘Zo komt plastic in hun maag.’ Welk verband geeft ‘zo’ hier aan?", a: "oorzaak en gevolg", w: ["een tegenstelling", "een opsomming"] }, { q: "‘That is how plastic gets into their stomachs.’ What link does ‘that is how’ show?", a: "cause and effect", w: ["a contrast", "a list"] }),
      q("purpose", { q: "Waarom noemt de schrijver aan het eind de drinkfles?", a: "als voorbeeld van wat jij kunt doen", w: ["om reclame te maken voor een merk", "omdat drinkflessen van plastic zijn"] }, { q: "Why does the writer mention the water bottle at the end?", a: "as an example of what you can do", w: ["to advertise a brand", "because water bottles are made of plastic"] }),
    ],
  },
  {
    level: 6,
    title: { nl: "De robot van Lucas", en: "Lucas's robot" },
    text: {
      nl: "Lucas wil dolgraag meedoen aan de uitvinderswedstrijd. Zijn eerste robot valt uit elkaar. Zijn tweede robot rijdt alleen achteruit. Zijn zus lacht hem uit, maar Lucas schroeft alles weer los en begint opnieuw. Hij leest drie boeken over motoren en vraagt raad aan de buurman, die monteur is. De avond voor de wedstrijd rijdt zijn robot eindelijk een rondje door de kamer. Lucas wint geen prijs, maar de jury noemt zijn robot ‘het knapste doorzettersproject’.",
      en: "Lucas badly wants to enter the inventors' contest. His first robot falls apart. His second robot only drives backwards. His sister laughs at him, but Lucas unscrews everything and starts again. He reads three books about motors and asks advice from the neighbour, who is a mechanic. The evening before the contest his robot finally drives a lap around the room. Lucas does not win a prize, but the judges call his robot ‘the cleverest never-give-up project’.",
    },
    questions: [
      q("infer", { q: "Welke eigenschap past het best bij Lucas?", a: "doorzetter", w: ["opschepper", "luiaard"] }, { q: "Which word describes Lucas best?", a: "determined", w: ["show-off", "lazy"] }),
      q("why", { q: "Waarom vraagt Lucas de buurman om raad?", a: "De buurman weet veel van motoren.", w: ["De buurman zit in de jury.", "De buurman verkoopt robots."] }, { q: "Why does Lucas ask the neighbour for advice?", a: "The neighbour knows a lot about motors.", w: ["The neighbour is one of the judges.", "The neighbour sells robots."] }),
      q("main", { q: "Wat wil de schrijver vooral laten zien?", a: "Doorzetten is belangrijker dan winnen.", w: ["Robots bouwen is makkelijk.", "Zussen zijn altijd gemeen."] }, { q: "What does the writer mainly want to show?", a: "Not giving up matters more than winning.", w: ["Building robots is easy.", "Sisters are always mean."] }),
    ],
  },
  {
    level: 6,
    title: { nl: "Zeehond op het strand", en: "Seal on the beach" },
    text: {
      nl: "SCHEVENINGEN – Gisterochtend vonden strandwandelaars een jonge zeehond op het strand. Het dier was mager en had een wondje aan zijn flipper. De wandelaars belden de dierenambulance. Medewerkers namen de zeehond mee naar een opvangcentrum. Daar krijgt hij vis en medicijnen. Als hij over een paar weken sterk genoeg is, wordt hij weer in zee vrijgelaten. Het opvangcentrum vraagt mensen om een zeehond op het strand nooit aan te raken.",
      en: "SCHEVENINGEN – Yesterday morning people walking on the beach found a young seal. The animal was thin and had a small wound on its flipper. The walkers called the animal ambulance. Staff took the seal to a rescue centre. There it is getting fish and medicine. When it is strong enough in a few weeks, it will be released back into the sea. The rescue centre asks people never to touch a seal on the beach.",
    },
    questions: [
      q("purpose", { q: "Wat voor tekst is dit?", a: "een nieuwsbericht", w: ["een recept", "een gedicht"] }, { q: "What kind of text is this?", a: "a news report", w: ["a recipe", "a poem"] }),
      q("order", { q: "Wat gebeurt er als de zeehond sterk genoeg is?", a: "Hij wordt weer in zee vrijgelaten.", w: ["Hij gaat naar een dierentuin.", "Hij blijft altijd in het opvangcentrum."] }, { q: "What happens when the seal is strong enough?", a: "It is released back into the sea.", w: ["It goes to a zoo.", "It stays at the rescue centre forever."] }),
      q("infer", { q: "Waarom kun je een zeehond op het strand beter niet aanraken?", a: "Het is een wild dier dat kan schrikken of bijten.", w: ["Zeehonden zijn altijd ziek.", "Dan mag je niet meer op het strand komen."] }, { q: "Why is it better not to touch a seal on the beach?", a: "It is a wild animal that may panic or bite.", w: ["Seals are always ill.", "Then you are no longer allowed on the beach."] }),
    ],
  },

  // --- level 7 (groep 8 top) -----------------------------------------------
  {
    level: 7,
    title: { nl: "Schermtijd", en: "Screen time" },
    text: {
      nl: "Veel ouders maken zich zorgen over de schermtijd van hun kinderen. Toch is niet alle schermtijd hetzelfde. Een kind dat een uur filmpjes kijkt, doet iets anders dan een kind dat een uur leert programmeren of met opa beeldbelt. Onderzoekers adviseren daarom om niet alleen naar het aantal uren te kijken, maar vooral naar wat een kind doet. Over één ding zijn ze het wel eens: een scherm vlak voor het slapengaan zorgt ervoor dat je slechter slaapt.",
      en: "Many parents worry about their children's screen time. Yet not all screen time is the same. A child who watches videos for an hour is doing something different from a child who spends an hour learning to code or video-calling Grandpa. That is why researchers advise looking not only at the number of hours, but above all at what a child is doing. They do agree on one thing: a screen just before bedtime makes you sleep worse.",
    },
    questions: [
      q("main", { q: "Wat is de belangrijkste boodschap?", a: "Het gaat vooral om wat je op een scherm doet, niet alleen om hoe lang.", w: ["Kinderen moeten helemaal geen scherm meer gebruiken.", "Programmeren is beter dan beeldbellen."] }, { q: "What is the most important message?", a: "What you do on a screen matters most, not only how long.", w: ["Children should stop using screens altogether.", "Coding is better than video-calling."] }),
      q("signal", { q: "Welk verband geeft ‘toch’ in de tweede zin aan?", a: "een tegenstelling", w: ["een oorzaak", "een opsomming"] }, { q: "What link does ‘yet’ in the second sentence show?", a: "a contrast", w: ["a cause", "a list"] }),
      q("infer", { q: "Welk advies past het best bij de laatste zin?", a: "Leg je tablet een tijdje voor het slapen weg.", w: ["Kijk 's avonds juist extra filmpjes.", "Gebruik een scherm alleen om te programmeren."] }, { q: "Which advice fits the last sentence best?", a: "Put your tablet away for a while before bed.", w: ["Watch extra videos in the evening.", "Only use a screen for coding."] }),
    ],
  },
  {
    level: 7,
    title: { nl: "De kat uit de boom", en: "Waiting and watching" },
    text: {
      nl: "Er komt een nieuw meisje in de klas: Ilse. De eerste dagen zegt ze bijna niets. In de pauze staat ze aan de rand van het plein en kijkt ze de kat uit de boom. Na een week vraagt Sem of ze mee wil voetballen. Ilse blijkt de bal keihard in de hoek te kunnen schieten. ‘Waarom zei je niet dat je zo goed was?’ vraagt Sem. Ilse haalt haar schouders op. ‘Ik wilde eerst weten hoe jullie waren.’",
      en: "A new girl joins the class: Ilse. The first days she hardly says a word. At break she stands at the edge of the playground, waiting to see which way the wind blows. After a week Sem asks if she wants to play football. Ilse turns out to be able to shoot the ball hard into the corner. ‘Why didn't you say you were so good?’ asks Sem. Ilse shrugs. ‘I wanted to find out what you were like first.’",
    },
    questions: [
      q("word", { q: "Wat betekent ‘de kat uit de boom kijken’?", a: "eerst rustig afwachten hoe iets loopt", w: ["een kat uit een boom redden", "heel brutaal doen"] }, { q: "What does ‘waiting to see which way the wind blows’ mean?", a: "calmly waiting to see how things turn out", w: ["checking the weather forecast", "being very cheeky"] }),
      q("infer", { q: "Waarom zei Ilse de eerste dagen bijna niets?", a: "Ze wilde eerst de klas leren kennen.", w: ["Ze sprak geen Nederlands.", "Ze was boos op Sem."] }, { q: "Why did Ilse hardly speak in the first days?", a: "She wanted to get to know the class first.", w: ["She could not speak the language.", "She was angry with Sem."] }),
      q("main", { q: "Wat zegt dit verhaal over eerste indrukken?", a: "Je leert iemand pas echt kennen als je hem een kans geeft.", w: ["Stille kinderen kunnen niet voetballen.", "Nieuwe kinderen willen nooit meedoen."] }, { q: "What does this story say about first impressions?", a: "You only really get to know someone if you give them a chance.", w: ["Quiet children cannot play football.", "New children never want to join in."] }),
    ],
  },
  {
    level: 7,
    title: { nl: "Waarom de zee zout is", en: "Why the sea is salty" },
    text: {
      nl: "Regenwater is bijna niet zout. Toch is de zee dat wel. Hoe kan dat? Als regen over land stroomt, lost het een heel klein beetje zout op uit stenen en de bodem. Rivieren voeren dat zout mee naar zee. In zee verdampt het water door de zon, maar het zout blijft achter. Dat gaat al miljoenen jaren zo door. Daardoor is de zee langzaam steeds zouter geworden. Er zijn ook meren zonder afvoer naar zee, zoals de Dode Zee. Die zijn nog zouter.",
      en: "Rainwater is hardly salty at all. Yet the sea is. How can that be? When rain flows over land, it dissolves a tiny bit of salt from rocks and soil. Rivers carry that salt to the sea. In the sea the water evaporates because of the sun, but the salt stays behind. This has been going on for millions of years. As a result, the sea has slowly become saltier and saltier. There are also lakes with no outlet to the sea, such as the Dead Sea. They are even saltier.",
    },
    questions: [
      q("order", { q: "Welke volgorde klopt?", a: "regen lost zout op → rivier voert het mee → water verdampt, zout blijft", w: ["water verdampt → regen lost zout op → rivier voert het mee", "rivier voert zout mee → regen lost zout op → zout verdampt"] }, { q: "Which order is right?", a: "rain dissolves salt → river carries it → water evaporates, salt stays", w: ["water evaporates → rain dissolves salt → river carries it", "river carries salt → rain dissolves salt → salt evaporates"] }),
      q("infer", { q: "Waarom is de Dode Zee nog zouter?", a: "Er stroomt geen water weg, dus het zout hoopt zich op.", w: ["Er valt daar zoute regen.", "Er wonen geen vissen die het zout opeten."] }, { q: "Why is the Dead Sea even saltier?", a: "No water flows out, so the salt builds up.", w: ["Salty rain falls there.", "There are no fish to eat the salt."] }),
      q("word", { q: "Wat betekent ‘verdampen’?", a: "van water in waterdamp veranderen", w: ["bevriezen tot ijs", "in de grond zakken"] }, { q: "What does ‘evaporate’ mean?", a: "turn from water into water vapour", w: ["freeze into ice", "sink into the ground"] }),
    ],
  },
  {
    level: 7,
    title: { nl: "Kamp Avontuur", en: "Camp Adventure" },
    text: {
      nl: "Ben jij tussen de 9 en 12 jaar en hou je van avontuur? Kom dan naar Kamp Avontuur! Een week lang bouw je hutten, zoek je dierensporen en slaap je onder de sterren. Ervaren leiding zorgt voor jouw veiligheid. ‘Het was de beste week van mijn leven!’ – Fleur, 11 jaar. Schrijf je vóór 1 mei in en krijg gratis een zaklamp. Let op: vol is vol!",
      en: "Are you between 9 and 12 and do you love adventure? Then come to Camp Adventure! For a whole week you build dens, track animals and sleep under the stars. Experienced leaders keep you safe. ‘It was the best week of my life!’ – Fleur, age 11. Sign up before 1 May and get a free torch. Note: when it's full, it's full!",
    },
    questions: [
      q("purpose", { q: "Wat is het doel van deze tekst?", a: "de lezer overhalen om zich in te schrijven", w: ["de lezer uitleggen hoe je sporen zoekt", "de lezer een spannend verhaal vertellen"] }, { q: "What is the purpose of this text?", a: "to persuade the reader to sign up", w: ["to explain how to track animals", "to tell the reader an exciting story"] }),
      q("purpose", { q: "Waarom staat de uitspraak van Fleur in de tekst?", a: "Om te laten zien dat andere kinderen het kamp geweldig vonden.", w: ["Omdat Fleur de leiding van het kamp is.", "Omdat Fleur de zaklampen verkoopt."] }, { q: "Why is Fleur's quote in the text?", a: "To show that other children loved the camp.", w: ["Because Fleur runs the camp.", "Because Fleur sells the torches."] }),
      q("infer", { q: "Waarom staat er ‘vol is vol’?", a: "Zodat je je snel inschrijft.", w: ["Omdat het kamp al vol is.", "Omdat de tenten te klein zijn."] }, { q: "Why does it say ‘when it's full, it's full’?", a: "So that you sign up quickly.", w: ["Because the camp is already full.", "Because the tents are too small."] }),
    ],
  },
];

/** Reading skills, in the order the levels meet them - see i18n "lezen.skill_*". */
export const READING_SKILLS = ["who", "order", "refer", "why", "signal", "word", "main", "fact", "infer", "purpose"];

/** How many words a text has (for the "words read" counter). */
export function wordCount(text) {
  return String(text).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// ---------------------------------------------------------------------------
// Story templates - Leesdetective levels 0 and 1
// ---------------------------------------------------------------------------
//
// Short texts assembled from parts, so the youngest readers never run out.
// Every question's wrong options come from the same list as its answer, so
// they are always plausible but never also right.

export const STORY_PARTS = {
  nl: {
    names: ["Sara", "Daan", "Noor", "Sem", "Lotte", "Mo", "Fleur", "Tim"],
    pets: ["kat", "hond", "konijn", "cavia", "vis", "schildpad"],
    colors: ["zwart", "wit", "bruin", "grijs", "rood", "geel"],
    petNames: ["Pip", "Bobbie", "Snuf", "Luna", "Kiki", "Max"],
    pet: {
      text: "{name} heeft een {pet}. De {pet} is {color}. Hij heet {petName}. {name} speelt elke dag met {petName}.",
      questions: [
        ["names", "name", "Wie heeft een {pet}?"],
        ["colors", "color", "Welke kleur heeft de {pet}?"],
        ["petNames", "petName", "Hoe heet de {pet}?"],
      ],
    },
    days: ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"],
    companions: ["opa", "oma", "tante Els", "oom Ben"],
    places: ["het zwembad", "de dierentuin", "de bibliotheek", "het bos", "de markt", "het strand"],
    activities: [
      "zwemmen ze in het diepe bad",
      "kijken ze naar de olifanten",
      "lenen ze drie boeken",
      "zoeken ze paddenstoelen",
      "kopen ze appels en kaas",
      "bouwen ze een zandkasteel",
    ],
    foods: ["een ijsje", "pannenkoeken", "patat", "een broodje kaas", "soep"],
    trip: {
      text: "Op {day} gaat {name} met {companion} naar {place}. Daar {activity}. Na afloop eten ze {food}. Het is een fijne dag!",
      questions: [
        ["days", "day", "Op welke dag gaat {name} op pad?"],
        ["companions", "companion", "Met wie gaat {name} mee?"],
        ["places", "place", "Waar gaan ze naartoe?"],
        ["foods", "food", "Wat eten ze na afloop?"],
      ],
    },
  },
  en: {
    names: ["Sara", "Daan", "Noor", "Sam", "Lucy", "Mo", "Freya", "Tim"],
    pets: ["cat", "dog", "rabbit", "guinea pig", "fish", "tortoise"],
    colors: ["black", "white", "brown", "grey", "red", "yellow"],
    petNames: ["Pip", "Bobby", "Sniff", "Luna", "Kiki", "Max"],
    pet: {
      text: "{name} has a {pet}. The {pet} is {color}. It is called {petName}. {name} plays with {petName} every day.",
      questions: [
        ["names", "name", "Who has a {pet}?"],
        ["colors", "color", "What colour is the {pet}?"],
        ["petNames", "petName", "What is the {pet} called?"],
      ],
    },
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    companions: ["Grandpa", "Grandma", "Aunt Ellie", "Uncle Ben"],
    places: ["the swimming pool", "the zoo", "the library", "the woods", "the market", "the beach"],
    activities: [
      "they swim in the deep pool",
      "they watch the elephants",
      "they borrow three books",
      "they look for mushrooms",
      "they buy apples and cheese",
      "they build a sandcastle",
    ],
    foods: ["an ice cream", "pancakes", "chips", "a cheese sandwich", "soup"],
    trip: {
      text: "On {day} {name} goes to {place} with {companion}. There {activity}. Afterwards they eat {food}. What a lovely day!",
      questions: [
        ["days", "day", "On which day does {name} go out?"],
        ["companions", "companion", "Who does {name} go with?"],
        ["places", "place", "Where do they go?"],
        ["foods", "food", "What do they eat afterwards?"],
      ],
    },
  },
};
