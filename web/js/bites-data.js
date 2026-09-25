/**
 * Leerhapjes / Learning Bites (round 18): one-minute lessons.
 *
 * Micro-learning in the literal sense: one idea per bite, explained in three
 * or four sentences with one worked example, then three quick questions to
 * check it landed. A bite passed with 2 of 3 right becomes a card in the
 * child's album; 3 of 3 makes it a gold card.
 *
 * Twelve maths bites and twelve language/reading bites, from groep 6 to
 * groep 8. The maths is the same in both languages; some language bites are
 * about each language's own rules (Dutch d/t and 't kofschip, English
 * their/there and -ed), under the same id, so a child's album means the same
 * thing whichever language they read it in.
 *
 * Shape of a bite:
 *   { id, subject: "math"|"taal", groep, emoji,
 *     nl: { title, body, example, quiz: [{ q, a, w: [wrong, wrong] }] x3 },
 *     en: { ...the same } }
 * body is markdown (bold only); nothing may contain "<" or "&".
 */

export const BITES = [
  // --- Rekenen / maths ------------------------------------------------------
  {
    id: "m_tafel9",
    subject: "math",
    groep: 6,
    emoji: "✖️",
    nl: {
      title: "De truc voor de tafel van 9",
      body: "Negen is bijna tien. Reken daarom eerst **keer 10**, en haal er dan **één keer het getal** af.",
      example: "9 × 7 = 10 × 7 − 7 = 70 − 7 = 63",
      quiz: [
        { q: "Hoeveel is 9 × 6?", a: "54", w: ["45", "56"] },
        { q: "Hoeveel is 9 × 8?", a: "72", w: ["81", "64"] },
        { q: "Welke som hoort bij de truc voor 9 × 4?", a: "40 − 4", w: ["40 + 4", "36 − 4"] },
      ],
    },
    en: {
      title: "The trick for the 9 times table",
      body: "Nine is nearly ten. So first multiply **by 10**, then take away **the number once**.",
      example: "9 × 7 = 10 × 7 − 7 = 70 − 7 = 63",
      quiz: [
        { q: "What is 9 × 6?", a: "54", w: ["45", "56"] },
        { q: "What is 9 × 8?", a: "72", w: ["81", "64"] },
        { q: "Which sum goes with the trick for 9 × 4?", a: "40 − 4", w: ["40 + 4", "36 − 4"] },
      ],
    },
  },
  {
    id: "m_breuk",
    subject: "math",
    groep: 6,
    emoji: "🍕",
    nl: {
      title: "Wat is een breuk?",
      body: "Een breuk is een **deel van een geheel**. De **noemer** (onder) zegt in hoeveel gelijke stukken het geheel is verdeeld. De **teller** (boven) zegt hoeveel stukken je hebt.",
      example: "3/4: de pizza is in 4 stukken gesneden en jij hebt er 3.",
      quiz: [
        { q: "Wat is de noemer van 3/4?", a: "4", w: ["3", "7"] },
        { q: "Welke breuk is het grootst?", a: "1/2", w: ["1/3", "1/4"] },
        { q: "Een pizza heeft 8 stukken en je eet er 3. Welke breuk heb je gegeten?", a: "3/8", w: ["8/3", "5/8"] },
      ],
    },
    en: {
      title: "What is a fraction?",
      body: "A fraction is **part of a whole**. The **denominator** (bottom) says how many equal pieces the whole is cut into. The **numerator** (top) says how many pieces you have.",
      example: "3/4: the pizza is cut into 4 pieces and you have 3 of them.",
      quiz: [
        { q: "What is the denominator of 3/4?", a: "4", w: ["3", "7"] },
        { q: "Which fraction is the biggest?", a: "1/2", w: ["1/3", "1/4"] },
        { q: "A pizza has 8 slices and you eat 3. What fraction did you eat?", a: "3/8", w: ["8/3", "5/8"] },
      ],
    },
  },
  {
    id: "m_komma",
    subject: "math",
    groep: 6,
    emoji: "🔟",
    nl: {
      title: "Kommagetallen",
      body: "Het cijfer direct **achter de komma** telt de **tienden**, het cijfer daarna de **honderdsten**. Keer 10 schuift elk cijfer één plek naar links.",
      example: "0,5 = 5 tienden = een half. 3,4 × 10 = 34.",
      quiz: [
        { q: "Hoeveel is 3,4 × 10?", a: "34", w: ["3,40", "340"] },
        { q: "Welk getal is het grootst?", a: "0,7", w: ["0,65", "0,07"] },
        { q: "Hoeveel is 0,25 als breuk?", a: "een kwart", w: ["een half", "een tiende"] },
      ],
    },
    en: {
      title: "Decimals",
      body: "The digit right **after the decimal point** counts **tenths**, the one after that **hundredths**. Times 10 moves every digit one place to the left.",
      example: "0.5 = 5 tenths = a half. 3.4 × 10 = 34.",
      quiz: [
        { q: "What is 3.4 × 10?", a: "34", w: ["3.40", "340"] },
        { q: "Which number is the biggest?", a: "0.7", w: ["0.65", "0.07"] },
        { q: "What is 0.25 as a fraction?", a: "a quarter", w: ["a half", "a tenth"] },
      ],
    },
  },
  {
    id: "m_omtrek",
    subject: "math",
    groep: 6,
    emoji: "📐",
    nl: {
      title: "Omtrek of oppervlakte?",
      body: "De **omtrek** is de lengte van de rand: alle zijden bij elkaar opgeteld. De **oppervlakte** is hoeveel ruimte er binnenin zit: lengte × breedte, in cm².",
      example: "Een rechthoek van 5 bij 3 cm: omtrek 5 + 3 + 5 + 3 = 16 cm, oppervlakte 5 × 3 = 15 cm².",
      quiz: [
        { q: "Wat is de omtrek van een rechthoek van 6 bij 2 cm?", a: "16 cm", w: ["12 cm", "8 cm"] },
        { q: "Wat is de oppervlakte van een rechthoek van 6 bij 2 cm?", a: "12 cm²", w: ["16 cm²", "8 cm²"] },
        { q: "Oppervlakte meet je in...", a: "cm²", w: ["cm", "cm³"] },
      ],
    },
    en: {
      title: "Perimeter or area?",
      body: "The **perimeter** is the length of the edge: all the sides added up. The **area** is how much space there is inside: length × width, in cm².",
      example: "A 5 by 3 cm rectangle: perimeter 5 + 3 + 5 + 3 = 16 cm, area 5 × 3 = 15 cm².",
      quiz: [
        { q: "What is the perimeter of a 6 by 2 cm rectangle?", a: "16 cm", w: ["12 cm", "8 cm"] },
        { q: "What is the area of a 6 by 2 cm rectangle?", a: "12 cm²", w: ["16 cm²", "8 cm²"] },
        { q: "You measure area in...", a: "cm²", w: ["cm", "cm³"] },
      ],
    },
  },
  {
    id: "m_gelijknamig",
    subject: "math",
    groep: 7,
    emoji: "➕",
    nl: {
      title: "Breuken optellen met een gelijke noemer",
      body: "Je kunt alleen breuken optellen als de **noemers gelijk** zijn. Zijn ze dat niet? Vermenigvuldig teller én noemer met hetzelfde getal tot ze gelijk zijn.",
      example: "1/2 + 1/4 = 2/4 + 1/4 = 3/4",
      quiz: [
        { q: "1/2 = ?/4", a: "2", w: ["1", "4"] },
        { q: "Hoeveel is 1/3 + 1/6?", a: "3/6", w: ["2/9", "2/6"] },
        { q: "2/3 = ?/12", a: "8", w: ["6", "4"] },
      ],
    },
    en: {
      title: "Adding fractions with the same denominator",
      body: "You can only add fractions when the **denominators are the same**. Not the same? Multiply the top and bottom by the same number until they are.",
      example: "1/2 + 1/4 = 2/4 + 1/4 = 3/4",
      quiz: [
        { q: "1/2 = ?/4", a: "2", w: ["1", "4"] },
        { q: "What is 1/3 + 1/6?", a: "3/6", w: ["2/9", "2/6"] },
        { q: "2/3 = ?/12", a: "8", w: ["6", "4"] },
      ],
    },
  },
  {
    id: "m_procent",
    subject: "math",
    groep: 7,
    emoji: "💯",
    nl: {
      title: "Procent betekent ‘per honderd’",
      body: "25% is 25 van de 100, dus een kwart. **10%** vind je door **te delen door 10**. Van 10% kun je alles maken: 20% is twee keer zoveel, 5% de helft.",
      example: "10% van 80 = 8, dus 20% van 80 = 16 en 5% van 80 = 4.",
      quiz: [
        { q: "Hoeveel is 50% van 60?", a: "30", w: ["50", "6"] },
        { q: "Hoeveel is 10% van 250?", a: "25", w: ["10", "240"] },
        { q: "25% is hetzelfde als...", a: "1/4", w: ["1/25", "1/2"] },
      ],
    },
    en: {
      title: "Percent means ‘per hundred’",
      body: "25% is 25 out of 100, so a quarter. You find **10%** by **dividing by 10**. From 10% you can build anything: 20% is twice as much, 5% is half of it.",
      example: "10% of 80 = 8, so 20% of 80 = 16 and 5% of 80 = 4.",
      quiz: [
        { q: "What is 50% of 60?", a: "30", w: ["50", "6"] },
        { q: "What is 10% of 250?", a: "25", w: ["10", "240"] },
        { q: "25% is the same as...", a: "1/4", w: ["1/25", "1/2"] },
      ],
    },
  },
  {
    id: "m_schaal",
    subject: "math",
    groep: 7,
    emoji: "🗺️",
    nl: {
      title: "Schaal op een kaart",
      body: "Schaal **1 : 1000** betekent: **1 cm op de kaart is 1000 cm in het echt**. 1000 cm = 10 m. Reken dus eerst uit hoeveel cm het is, en zet het dan om naar m of km.",
      example: "Schaal 1 : 1000, 4 cm op de kaart = 4000 cm = 40 m.",
      quiz: [
        { q: "Schaal 1 : 100. 5 cm op de kaart is in het echt...", a: "5 m", w: ["50 m", "500 m"] },
        { q: "Schaal 1 : 50 000. 2 cm op de kaart is in het echt...", a: "1 km", w: ["100 m", "10 km"] },
        { q: "Wat betekent schaal 1 : 200?", a: "1 cm op de kaart is 200 cm echt", w: ["200 cm op de kaart is 1 cm echt", "de kaart is 200 cm groot"] },
      ],
    },
    en: {
      title: "Scale on a map",
      body: "Scale **1 : 1000** means: **1 cm on the map is 1000 cm in real life**. 1000 cm = 10 m. So first work out how many cm it is, then change it into m or km.",
      example: "Scale 1 : 1000, 4 cm on the map = 4000 cm = 40 m.",
      quiz: [
        { q: "Scale 1 : 100. 5 cm on the map is, in real life...", a: "5 m", w: ["50 m", "500 m"] },
        { q: "Scale 1 : 50,000. 2 cm on the map is, in real life...", a: "1 km", w: ["100 m", "10 km"] },
        { q: "What does scale 1 : 200 mean?", a: "1 cm on the map is 200 cm for real", w: ["200 cm on the map is 1 cm for real", "the map is 200 cm big"] },
      ],
    },
  },
  {
    id: "m_snelheid",
    subject: "math",
    groep: 7,
    emoji: "🚗",
    nl: {
      title: "Snelheid",
      body: "**km/u** betekent: hoeveel kilometer je in **één uur** aflegt. **Afstand = snelheid × tijd.** Een half uur is de helft van de afstand van een heel uur.",
      example: "60 km/u, 2 uur rijden: 60 × 2 = 120 km.",
      quiz: [
        { q: "Je rijdt 2 uur met 60 km/u. Hoe ver kom je?", a: "120 km", w: ["30 km", "62 km"] },
        { q: "Je rijdt 150 km in 3 uur. Hoe snel ging je?", a: "50 km/u", w: ["450 km/u", "153 km/u"] },
        { q: "Je rijdt een half uur met 80 km/u. Hoe ver kom je?", a: "40 km", w: ["80 km", "160 km"] },
      ],
    },
    en: {
      title: "Speed",
      body: "**km/h** means how many kilometres you travel in **one hour**. **Distance = speed × time.** Half an hour covers half the distance of a whole hour.",
      example: "60 km/h, driving for 2 hours: 60 × 2 = 120 km.",
      quiz: [
        { q: "You drive for 2 hours at 60 km/h. How far do you get?", a: "120 km", w: ["30 km", "62 km"] },
        { q: "You drive 150 km in 3 hours. How fast did you go?", a: "50 km/h", w: ["450 km/h", "153 km/h"] },
        { q: "You drive for half an hour at 80 km/h. How far do you get?", a: "40 km", w: ["80 km", "160 km"] },
      ],
    },
  },
  {
    id: "m_volgorde",
    subject: "math",
    groep: 8,
    emoji: "🧮",
    nl: {
      title: "De volgorde van bewerkingen",
      body: "Onthoud: **Hoe Moeten Wij Van De Onderkant Afkomen?** Eerst **H**aakjes, dan **M**achtsverheffen en **W**orteltrekken, dan **V**ermenigvuldigen en **D**elen, en als laatste **O**ptellen en **A**ftrekken.",
      example: "2 + 3 × 4 = 2 + 12 = 14, maar (2 + 3) × 4 = 5 × 4 = 20.",
      quiz: [
        { q: "Hoeveel is 2 + 3 × 4?", a: "14", w: ["20", "24"] },
        { q: "Hoeveel is (2 + 3) × 4?", a: "20", w: ["14", "9"] },
        { q: "Hoeveel is 10 − 6 : 2?", a: "7", w: ["2", "8"] },
      ],
    },
    en: {
      title: "The order of operations",
      body: "Remember **BODMAS**: **B**rackets first, then **O**rders (powers and roots), then **D**ivision and **M**ultiplication, and last **A**ddition and **S**ubtraction.",
      example: "2 + 3 × 4 = 2 + 12 = 14, but (2 + 3) × 4 = 5 × 4 = 20.",
      quiz: [
        { q: "What is 2 + 3 × 4?", a: "14", w: ["20", "24"] },
        { q: "What is (2 + 3) × 4?", a: "20", w: ["14", "9"] },
        { q: "What is 10 − 6 ÷ 2?", a: "7", w: ["2", "8"] },
      ],
    },
  },
  {
    id: "m_inhoud",
    subject: "math",
    groep: 8,
    emoji: "🧊",
    nl: {
      title: "Inhoud en liters",
      body: "Een kubus van 10 × 10 × 10 cm heeft een inhoud van 1000 cm³ = **1 dm³ = 1 liter**. En **1 cm³ = 1 ml**. Zo kun je elke bak omrekenen naar liters.",
      example: "Een bak van 20 × 10 × 10 cm = 2000 cm³ = 2 liter.",
      quiz: [
        { q: "2 dm³ = ... liter", a: "2", w: ["20", "200"] },
        { q: "1000 cm³ is hetzelfde als...", a: "1 liter", w: ["10 liter", "100 liter"] },
        { q: "Hoeveel ml is 1 cm³?", a: "1 ml", w: ["10 ml", "1000 ml"] },
      ],
    },
    en: {
      title: "Volume and litres",
      body: "A 10 × 10 × 10 cm cube holds 1000 cm³ = **1 dm³ = 1 litre**. And **1 cm³ = 1 ml**. That way you can turn any box into litres.",
      example: "A 20 × 10 × 10 cm box = 2000 cm³ = 2 litres.",
      quiz: [
        { q: "2 dm³ = ... litres", a: "2", w: ["20", "200"] },
        { q: "1000 cm³ is the same as...", a: "1 litre", w: ["10 litres", "100 litres"] },
        { q: "How many ml is 1 cm³?", a: "1 ml", w: ["10 ml", "1000 ml"] },
      ],
    },
  },
  {
    id: "m_cirkel",
    subject: "math",
    groep: 8,
    emoji: "⭕",
    nl: {
      title: "De cirkel",
      body: "De **middellijn** is twee keer de **straal**. **Omtrek = 3,14 × middellijn.** **Oppervlakte = 3,14 × straal × straal.** Dat getal 3,14 heet pi (π).",
      example: "Straal 5 cm: middellijn 10 cm, omtrek 3,14 × 10 = 31,4 cm.",
      quiz: [
        { q: "De straal is 5 cm. Hoe lang is de middellijn?", a: "10 cm", w: ["2,5 cm", "25 cm"] },
        { q: "De middellijn is 10 cm. Wat is de omtrek?", a: "31,4 cm", w: ["314 cm", "3,14 cm"] },
        { q: "Welke formule hoort bij de oppervlakte?", a: "3,14 × straal × straal", w: ["3,14 × middellijn", "2 × straal"] },
      ],
    },
    en: {
      title: "The circle",
      body: "The **diameter** is twice the **radius**. **Circumference = 3.14 × diameter.** **Area = 3.14 × radius × radius.** That number 3.14 is called pi (π).",
      example: "Radius 5 cm: diameter 10 cm, circumference 3.14 × 10 = 31.4 cm.",
      quiz: [
        { q: "The radius is 5 cm. How long is the diameter?", a: "10 cm", w: ["2.5 cm", "25 cm"] },
        { q: "The diameter is 10 cm. What is the circumference?", a: "31.4 cm", w: ["314 cm", "3.14 cm"] },
        { q: "Which formula gives the area?", a: "3.14 × radius × radius", w: ["3.14 × diameter", "2 × radius"] },
      ],
    },
  },
  {
    id: "m_negatief",
    subject: "math",
    groep: 8,
    emoji: "🌡️",
    nl: {
      title: "Negatieve getallen",
      body: "Denk aan een **getallenlijn** of een thermometer: plus is naar rechts (warmer), min is naar links (kouder). Bij keer: **min keer min is plus**, min keer plus is min.",
      example: "−3 + 5 = 2 (vijf stappen naar rechts vanaf −3). −2 × −6 = 12.",
      quiz: [
        { q: "Hoeveel is −3 + 5?", a: "2", w: ["−8", "8"] },
        { q: "Hoeveel is −4 − 3?", a: "−7", w: ["−1", "7"] },
        { q: "Hoeveel is −2 × −6?", a: "12", w: ["−12", "−8"] },
      ],
    },
    en: {
      title: "Negative numbers",
      body: "Think of a **number line** or a thermometer: plus goes right (warmer), minus goes left (colder). When multiplying: **minus times minus is plus**, minus times plus is minus.",
      example: "−3 + 5 = 2 (five steps right from −3). −2 × −6 = 12.",
      quiz: [
        { q: "What is −3 + 5?", a: "2", w: ["−8", "8"] },
        { q: "What is −4 − 3?", a: "−7", w: ["−1", "7"] },
        { q: "What is −2 × −6?", a: "12", w: ["−12", "−8"] },
      ],
    },
  },

  // --- Taal & lezen / language and reading ------------------------------------
  {
    id: "t_voorspellen",
    subject: "taal",
    groep: 6,
    emoji: "🔮",
    nl: {
      title: "Voorspellen voor je leest",
      body: "Bekijk vóór het lezen de **titel en de plaatjes** en vraag je af: waar zal dit over gaan? Tijdens het lezen check je of je voorspelling klopt. Zo lees je actiever en begrijp je meer.",
      example: "Titel: ‘Het geheim van de zolder’. Voorspelling: iemand vindt iets spannends op zolder.",
      quiz: [
        { q: "Wat doe je vóór het lezen?", a: "de titel en plaatjes bekijken", w: ["meteen de laatste zin lezen", "de tekst overslaan"] },
        { q: "Waarom voorspellen?", a: "Dan begrijp je de tekst beter.", w: ["Dan hoef je niet te lezen.", "Dan ben je sneller klaar."] },
        { q: "Je voorspelling klopt niet. Wat nu?", a: "Geen probleem: pas je idee aan.", w: ["Stoppen met lezen.", "Opnieuw beginnen bij de titel."] },
      ],
    },
    en: {
      title: "Predict before you read",
      body: "Before reading, look at the **title and the pictures** and ask yourself: what will this be about? While reading, check whether your prediction was right. That way you read more actively and understand more.",
      example: "Title: ‘The secret in the attic’. Prediction: someone finds something exciting in the attic.",
      quiz: [
        { q: "What do you do before reading?", a: "look at the title and pictures", w: ["read the last sentence first", "skip the text"] },
        { q: "Why make a prediction?", a: "You understand the text better.", w: ["You don't have to read.", "You finish sooner."] },
        { q: "Your prediction was wrong. What now?", a: "No problem: change your idea.", w: ["Stop reading.", "Start again at the title."] },
      ],
    },
  },
  {
    id: "t_woordraden",
    subject: "taal",
    groep: 6,
    emoji: "🧩",
    nl: {
      title: "Moeilijk woord? Kijk om je heen",
      body: "Ken je een woord niet, lees dan **de zin ervoor en erna**. Vaak verklappen die wat het woord betekent. Je hoeft dus niet meteen te stoppen of een woordenboek te pakken.",
      example: "‘De reus was gigantisch: hij paste niet door de deur.’ → gigantisch = heel groot.",
      quiz: [
        { q: "‘Het meisje was verbijsterd: haar mond viel open van verbazing.’ Verbijsterd betekent...", a: "heel verbaasd", w: ["heel moe", "heel boos"] },
        { q: "‘Het water was ijskoud: Tim kreeg er kippenvel van.’ IJskoud betekent...", a: "heel koud", w: ["een beetje warm", "heel vies"] },
        { q: "Wat doe je eerst bij een onbekend woord?", a: "de zinnen eromheen lezen", w: ["stoppen met lezen", "het woord overslaan en vergeten"] },
      ],
    },
    en: {
      title: "A hard word? Look around it",
      body: "If you don't know a word, read **the sentence before and after it**. They often give away what the word means. So you don't have to stop or grab a dictionary straight away.",
      example: "‘The giant was enormous: he did not fit through the door.’ → enormous = very big.",
      quiz: [
        { q: "‘The girl was astonished: her mouth fell open in surprise.’ Astonished means...", a: "very surprised", w: ["very tired", "very angry"] },
        { q: "‘The water was freezing: it gave Tim goosebumps.’ Freezing means...", a: "very cold", w: ["a bit warm", "very dirty"] },
        { q: "What do you do first with a word you don't know?", a: "read the sentences around it", w: ["stop reading", "skip it and forget it"] },
      ],
    },
  },
  {
    id: "t_hoofdletters",
    subject: "taal",
    groep: 6,
    emoji: "🔠",
    nl: {
      title: "Hoofdletters en leestekens",
      body: "Een zin begint met een **hoofdletter** en eindigt met een punt, vraagteken of uitroepteken. **Namen** van mensen, plaatsen en landen krijgen ook altijd een hoofdletter.",
      example: "Mijn vriendin Lisa woont in Utrecht. Waar woon jij?",
      quiz: [
        { q: "Welke zin is goed geschreven?", a: "Mijn vriendin Lisa woont in Utrecht.", w: ["mijn vriendin lisa woont in utrecht.", "Mijn Vriendin Lisa Woont In Utrecht."] },
        { q: "Welk teken hoort achter ‘Hoe laat is het’?", a: "?", w: ["!", ","] },
        { q: "Welk woord krijgt altijd een hoofdletter?", a: "Amsterdam", w: ["fiets", "school"] },
      ],
    },
    en: {
      title: "Capital letters and punctuation",
      body: "A sentence starts with a **capital letter** and ends with a full stop, question mark or exclamation mark. **Names** of people, places, countries and days always get a capital too.",
      example: "My friend Lisa lives in London. Where do you live?",
      quiz: [
        { q: "Which sentence is written correctly?", a: "My friend Lisa lives in London.", w: ["my friend lisa lives in london.", "My Friend Lisa Lives In London."] },
        { q: "Which mark goes after ‘What time is it’?", a: "?", w: ["!", ","] },
        { q: "Which word always has a capital letter?", a: "Monday", w: ["bike", "school"] },
      ],
    },
  },
  {
    id: "t_verwijswoord",
    subject: "taal",
    groep: 6,
    emoji: "👉",
    nl: {
      title: "Verwijswoorden",
      body: "Woorden als **hij, zij, ze, het, die en dat** verwijzen naar iets wat al eerder genoemd is. Snap je een zin niet? Zoek dan waar het verwijswoord naar terugwijst.",
      example: "‘Oma bakt koekjes. Die ruiken heerlijk.’ → die = de koekjes.",
      quiz: [
        { q: "‘Tim heeft een fiets. Hij is knalrood.’ Wat is ‘hij’?", a: "de fiets", w: ["Tim", "de juf"] },
        { q: "‘Lisa en Sam spelen buiten. Zij hebben een bal.’ Wie zijn ‘zij’?", a: "Lisa en Sam", w: ["alleen Lisa", "de bal"] },
        { q: "‘Papa koopt appels. Die zijn lekker zoet.’ Wat is ‘die’?", a: "de appels", w: ["papa", "de winkel"] },
      ],
    },
    en: {
      title: "Pointing words",
      body: "Words like **he, she, they, it and that** point back to something already mentioned. Don't understand a sentence? Find what the pointing word points back to.",
      example: "‘Gran bakes biscuits. They smell lovely.’ → they = the biscuits.",
      quiz: [
        { q: "‘Tim has a bike. It is bright red.’ What is ‘it’?", a: "the bike", w: ["Tim", "the teacher"] },
        { q: "‘Lisa and Sam play outside. They have a ball.’ Who are ‘they’?", a: "Lisa and Sam", w: ["only Lisa", "the ball"] },
        { q: "‘Dad buys apples. They are nice and sweet.’ What are ‘they’?", a: "the apples", w: ["Dad", "the shop"] },
      ],
    },
  },
  {
    id: "t_signaalwoord",
    subject: "taal",
    groep: 7,
    emoji: "🚦",
    nl: {
      title: "Signaalwoorden",
      body: "Signaalwoorden laten zien hoe zinnen bij elkaar horen. **maar, toch** = tegenstelling. **want, omdat** = reden. **dus, daardoor** = gevolg. **eerst, daarna** = volgorde.",
      example: "‘Het regent, dus ik neem een paraplu mee.’ → dus = gevolg.",
      quiz: [
        { q: "‘Het regent, ... ik neem een paraplu mee.’", a: "dus", w: ["maar", "want"] },
        { q: "‘Ik speel binnen, ... het regent.’", a: "want", w: ["dus", "maar"] },
        { q: "‘Het is koud, ... de zon schijnt.’", a: "maar", w: ["dus", "want"] },
      ],
    },
    en: {
      title: "Signal words",
      body: "Signal words show how sentences fit together. **but, yet** = contrast. **because, since** = reason. **so, as a result** = effect. **first, then** = order.",
      example: "‘It is raining, so I take an umbrella.’ → so = effect.",
      quiz: [
        { q: "‘It is raining, ... I take an umbrella.’", a: "so", w: ["but", "because"] },
        { q: "‘I play inside ... it is raining.’", a: "because", w: ["so", "but"] },
        { q: "‘It is cold, ... the sun is shining.’", a: "but", w: ["so", "because"] },
      ],
    },
  },
  {
    id: "t_hoofdgedachte",
    subject: "taal",
    groep: 7,
    emoji: "🎯",
    nl: {
      title: "De hoofdgedachte",
      body: "De hoofdgedachte is **waar de hele tekst over gaat**, in één zin. Vaak staat hij in de **eerste of laatste alinea**. Een detail is maar een klein stukje van de tekst.",
      example: "Tekst over waarom groente gezond is → hoofdgedachte: ‘Groente is goed voor je lichaam.’",
      quiz: [
        { q: "De hoofdgedachte is...", a: "waar de hele tekst over gaat", w: ["het langste woord", "altijd de titel"] },
        { q: "Waar staat de hoofdgedachte vaak?", a: "in de eerste of laatste alinea", w: ["midden in een woord", "onder een plaatje"] },
        { q: "Een tekst legt uit waarom je groente moet eten. Wat is de hoofdgedachte?", a: "Groente is gezond.", w: ["Wortels zijn oranje.", "Je kunt groente kopen."] },
      ],
    },
    en: {
      title: "The main idea",
      body: "The main idea is **what the whole text is about**, in one sentence. It is often in the **first or last paragraph**. A detail is only a small part of the text.",
      example: "A text about why vegetables are healthy → main idea: ‘Vegetables are good for your body.’",
      quiz: [
        { q: "The main idea is...", a: "what the whole text is about", w: ["the longest word", "always the title"] },
        { q: "Where is the main idea often found?", a: "in the first or last paragraph", w: ["in the middle of a word", "under a picture"] },
        { q: "A text explains why you should eat vegetables. What is the main idea?", a: "Vegetables are healthy.", w: ["Carrots are orange.", "You can buy vegetables."] },
      ],
    },
  },
  {
    id: "t_feitmening",
    subject: "taal",
    groep: 7,
    emoji: "⚖️",
    nl: {
      title: "Feit of mening?",
      body: "Een **feit** is waar en kun je controleren. Een **mening** is wat iemand vindt; een ander kan het er niet mee eens zijn. Woorden als **vind, leukst, mooist en stom** verraden vaak een mening.",
      example: "Feit: ‘Een voetbalteam heeft elf spelers.’ Mening: ‘Voetbal is de leukste sport.’",
      quiz: [
        { q: "Welke zin is een mening?", a: "Voetbal is de leukste sport.", w: ["Een voetbalteam heeft elf spelers.", "Een wedstrijd duurt negentig minuten."] },
        { q: "Welke zin is een feit?", a: "Water kookt bij 100 graden.", w: ["Thee is lekkerder dan koffie.", "De winter is het mooiste seizoen."] },
        { q: "Welk woord verraadt vaak een mening?", a: "vind", w: ["is", "heeft"] },
      ],
    },
    en: {
      title: "Fact or opinion?",
      body: "A **fact** is true and can be checked. An **opinion** is what someone thinks; someone else may disagree. Words like **think, best, most beautiful and silly** often give an opinion away.",
      example: "Fact: ‘A football team has eleven players.’ Opinion: ‘Football is the best sport.’",
      quiz: [
        { q: "Which sentence is an opinion?", a: "Football is the best sport.", w: ["A football team has eleven players.", "A match lasts ninety minutes."] },
        { q: "Which sentence is a fact?", a: "Water boils at 100 degrees.", w: ["Tea is nicer than coffee.", "Winter is the most beautiful season."] },
        { q: "Which word often gives away an opinion?", a: "think", w: ["is", "has"] },
      ],
    },
  },
  {
    id: "t_dt",
    subject: "taal",
    groep: 7,
    emoji: "✏️",
    nl: {
      title: "d, t of dt?",
      body: "**Ik** = alleen de stam (ik vind). **Hij, zij, het** = stam **+ t** (hij vindt). **Jij** = stam + t, behalve als jij **áchter** het werkwoord staat (jij vindt, maar: vind jij?).",
      example: "worden → ik word, hij wordt, jij wordt, word jij?",
      quiz: [
        { q: "Hij ... het een mooi boek. (vinden)", a: "vindt", w: ["vind", "vint"] },
        { q: "Ik ... elf jaar. (worden)", a: "word", w: ["wordt", "wort"] },
        { q: "... jij ook uitgenodigd? (worden)", a: "Word", w: ["Wordt", "Wort"] },
      ],
    },
    en: {
      title: "their, there or they're?",
      body: "**their** = belonging to them (their bags). **there** = a place (over there). **they're** = they are (they're late). Swap in ‘they are’: if it still makes sense, write they're.",
      example: "They're putting their bags over there.",
      quiz: [
        { q: "... going to the park.", a: "They're", w: ["Their", "There"] },
        { q: "The children ate ... lunch.", a: "their", w: ["there", "they're"] },
        { q: "Put the box over ...", a: "there", w: ["their", "they're"] },
      ],
    },
  },
  {
    id: "t_kofschip",
    subject: "taal",
    groep: 8,
    emoji: "⛵",
    nl: {
      title: "’t kofschip",
      body: "Verleden tijd van een zwak werkwoord: kijk naar de **laatste letter van de stam**. Zit die in **’t kofschip** (t, k, f, s, ch, p)? Dan **-te** en **-t** (fietste, gefietst). Anders **-de** en **-d** (speelde, gespeeld).",
      example: "bellen → stam bel → l zit niet in ’t kofschip → belde, gebeld.",
      quiz: [
        { q: "Gisteren ... ik naar school. (fietsen)", a: "fietste", w: ["fietsde", "fiedste"] },
        { q: "Ik heb oma ... (bellen)", a: "gebeld", w: ["gebelt", "gebeldt"] },
        { q: "Welke letters horen bij ’t kofschip?", a: "t, k, f, s, ch, p", w: ["d, b, g, v, z", "a, e, i, o, u"] },
      ],
    },
    en: {
      title: "The past tense with -ed",
      body: "Most verbs add **-ed** for the past (jump → jumped). Ends in **e**? Just add **-d** (bake → baked). Consonant + **y**? Change it to **-ied** (carry → carried). Short word ending in one vowel + consonant? **Double** it (stop → stopped).",
      example: "Yesterday I baked a cake, carried it home and stopped at Gran's.",
      quiz: [
        { q: "stop → ...", a: "stopped", w: ["stoped", "stopt"] },
        { q: "carry → ...", a: "carried", w: ["carryed", "carred"] },
        { q: "bake → ...", a: "baked", w: ["bakeed", "bakt"] },
      ],
    },
  },
  {
    id: "t_tekstdoel",
    subject: "taal",
    groep: 8,
    emoji: "📰",
    nl: {
      title: "Waarom is een tekst geschreven?",
      body: "Elke tekst heeft een doel. Een schrijver wil je **informeren** (nieuws, weetjes), **overtuigen** (reclame, mening), **iets leren doen** (recept, handleiding) of **vermaken** (verhaal, grap).",
      example: "Reclame voor een kamp → overtuigen. Een recept voor pannenkoeken → iets leren doen.",
      quiz: [
        { q: "Een recept wil je vooral...", a: "iets leren doen", w: ["overtuigen", "vermaken"] },
        { q: "Een reclame wil je vooral...", a: "overhalen", w: ["informeren over de natuur", "laten lachen om een grap"] },
        { q: "Een grappig verhaal wil je vooral...", a: "vermaken", w: ["iets verkopen", "leren koken"] },
      ],
    },
    en: {
      title: "Why was a text written?",
      body: "Every text has a purpose. A writer wants to **inform** you (news, facts), **persuade** you (adverts, opinions), **teach you to do something** (recipes, instructions) or **entertain** you (stories, jokes).",
      example: "An advert for a camp → persuade. A pancake recipe → teach you to do something.",
      quiz: [
        { q: "A recipe mainly wants to...", a: "teach you to do something", w: ["persuade you", "entertain you"] },
        { q: "An advert mainly wants to...", a: "persuade you", w: ["inform you about nature", "make you laugh at a joke"] },
        { q: "A funny story mainly wants to...", a: "entertain you", w: ["sell you something", "teach you to cook"] },
      ],
    },
  },
  {
    id: "t_uitdrukking",
    subject: "taal",
    groep: 8,
    emoji: "🐈",
    nl: {
      title: "Uitdrukkingen",
      body: "Een uitdrukking bedoel je **niet letterlijk**. ‘De kat uit de boom kijken’ gaat niet over katten: het betekent **eerst afwachten** hoe iets loopt. Vraag je af: wat wordt er eigenlijk bedoeld?",
      example: "‘Ze is in de wolken’ = ze is heel blij.",
      quiz: [
        { q: "‘Hij zit met de handen in het haar.’ Dat betekent...", a: "hij weet niet wat hij moet doen", w: ["hij wast zijn haar", "hij is heel blij"] },
        { q: "‘Iets onder de knie hebben’ betekent...", a: "iets goed kunnen", w: ["je knie bezeren", "iets verstoppen"] },
        { q: "Een uitdrukking bedoel je...", a: "niet letterlijk", w: ["precies letterlijk", "alleen als grap"] },
      ],
    },
    en: {
      title: "Idioms",
      body: "An idiom is **not meant literally**. ‘Break the ice’ has nothing to do with ice: it means **helping people relax** when they first meet. Ask yourself: what is actually meant?",
      example: "‘She is on cloud nine’ = she is extremely happy.",
      quiz: [
        { q: "‘That test was a piece of cake.’ It was...", a: "very easy", w: ["very tasty", "very long"] },
        { q: "‘Hold your horses!’ means...", a: "wait a moment", w: ["ride faster", "feed the horses"] },
        { q: "An idiom is meant...", a: "not literally", w: ["exactly literally", "only as a joke"] },
      ],
    },
  },
  {
    id: "t_samenvatten",
    subject: "taal",
    groep: 8,
    emoji: "📝",
    nl: {
      title: "Samenvatten",
      body: "Een samenvatting is **kort** en in **je eigen woorden**. Je schrijft alleen de **hoofdzaken** op: wie, wat, waar, wanneer en waarom. Details en voorbeelden laat je weg.",
      example: "Lang verhaal over een verloren sleutel → ‘Sara vergeet haar sleutel en oma helpt haar.’",
      quiz: [
        { q: "Wat hoort NIET in een samenvatting?", a: "kleine details en voorbeelden", w: ["de hoofdgedachte", "de belangrijkste gebeurtenissen"] },
        { q: "Een goede samenvatting is...", a: "kort en in je eigen woorden", w: ["langer dan de tekst", "precies overgeschreven"] },
        { q: "Waar begin je mee?", a: "de tekst goed lezen en de kern zoeken", w: ["meteen gaan schrijven", "de plaatjes tellen"] },
      ],
    },
    en: {
      title: "Summarising",
      body: "A summary is **short** and in **your own words**. You only write down the **main points**: who, what, where, when and why. Leave out details and examples.",
      example: "A long story about a lost key → ‘Sara forgets her key and Grandma helps her.’",
      quiz: [
        { q: "What does NOT belong in a summary?", a: "small details and examples", w: ["the main idea", "the most important events"] },
        { q: "A good summary is...", a: "short and in your own words", w: ["longer than the text", "copied word for word"] },
        { q: "What do you start with?", a: "reading carefully and finding the key point", w: ["writing straight away", "counting the pictures"] },
      ],
    },
  },
];

export const BITE_MAP = Object.fromEntries(BITES.map((bite) => [bite.id, bite]));
