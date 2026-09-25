/**
 * Round 18: the reading and language content, the three reading games, and
 * the learning bites (Leerhapjes).
 *
 * A reading question is only as good as its data, and the data is hand
 * written, so most of these tests walk every item: an answer and distinct
 * wrong options, both languages present, nothing that would break the HTML
 * the question is shown in. Then the behaviour that matters: three questions
 * per text before moving on, words counted once per text, and a learning
 * bite paying its coins once - never for repeating it.
 *
 * Run with: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

const { setLanguage } = await import("../../web/js/i18n.js");
const { TRANSLATIONS } = await import("../../web/js/i18n.js");
const data = await import("../../web/js/reading-data.js");
const { BITES, BITE_MAP } = await import("../../web/js/bites-data.js");
const bites = await import("../../web/js/bites.js");
const state = await import("../../web/js/state.js");
const lezen = await import("../../web/js/games/lezen.js");
const woorden = await import("../../web/js/games/woorden.js");
const spelling = await import("../../web/js/games/spelling.js");

const S = state.state;
const LANGS = ["nl", "en"];
const SAFE = (text) => !/[<&]/.test(text);

function freshPlayer() {
  state.applyProfile(`__reading_${Math.random()}__`);
}

// ---------------------------------------------------------------------------
// The content itself
// ---------------------------------------------------------------------------

test("spelling: 8 levels in each language, every item one right and two different wrong spellings", () => {
  for (const lang of LANGS) {
    assert.equal(data.SPELLING[lang].length, 8, lang);
    data.SPELLING[lang].forEach((items, level) => {
      assert.ok(items.length >= 10, `${lang} level ${level} has only ${items.length} items`);
      for (const item of items) {
        const [right, wrong] = Array.isArray(item) ? [item[0], item.slice(1)] : [item.a, item.w];
        assert.equal(wrong.length, 2, JSON.stringify(item));
        assert.equal(new Set([right, ...wrong]).size, 3, `duplicate option in ${JSON.stringify(item)}`);
        for (const text of [right, ...wrong, item.s ?? ""]) assert.ok(SAFE(text), text);
        if (!Array.isArray(item)) assert.ok(item.s.includes("___"), `no gap in "${item.s}"`);
      }
    });
  }
});

test("vocabulary: 8 levels in each language, every item has its answer and distinct options", () => {
  for (const lang of LANGS) {
    assert.equal(data.VOCAB[lang].length, 8, lang);
    data.VOCAB[lang].forEach((items, level) => {
      assert.ok(items.length >= 12, `${lang} level ${level}`);
      for (const item of items) {
        assert.ok(["pic", "opp", "syn", "ctx", "odd", "mean", "idiom", "proverb"].includes(item.k), item.k);
        if (item.k === "pic") {
          assert.ok(item.x && item.a && !item.w);
          continue;
        }
        const wrongCount = item.k === "odd" ? 3 : 2;
        assert.equal(item.w.length, wrongCount, JSON.stringify(item));
        assert.equal(new Set([item.a, ...item.w]).size, wrongCount + 1, JSON.stringify(item));
        if (item.k === "ctx") assert.ok(item.x.includes("___"), item.x);
        for (const text of [item.a, ...item.w, item.x ?? ""]) assert.ok(SAFE(text), text);
      }
      // Picture words take their wrong options from each other.
      const pics = items.filter((i) => i.k === "pic").map((i) => i.a);
      assert.equal(new Set(pics).size, pics.length, `${lang} level ${level}: repeated picture word`);
    });
  }
});

test("reading texts: at least four per level from 2 to 7, each in both languages with three questions", () => {
  for (let level = 2; level <= 7; level++) {
    const texts = data.PASSAGES.filter((p) => p.level === level);
    assert.ok(texts.length >= 4, `level ${level} has ${texts.length} texts`);
    for (const passage of texts) {
      assert.equal(passage.questions.length, 3, passage.title.nl);
      for (const lang of LANGS) {
        assert.ok(passage.title[lang] && passage.text[lang], `${passage.title.nl} (${lang})`);
        assert.ok(SAFE(passage.text[lang]) && SAFE(passage.title[lang]));
        for (const question of passage.questions) {
          assert.ok(data.READING_SKILLS.includes(question.type), question.type);
          const item = question[lang];
          assert.equal(item.w.length, 2);
          assert.equal(new Set([item.a, ...item.w]).size, 3, `${lang}: ${item.q}`);
          for (const text of [item.q, item.a, ...item.w]) assert.ok(SAFE(text), text);
        }
      }
    }
  }
  // Texts get longer as the levels rise (a rough but honest check).
  const avgWords = (level) => {
    const texts = data.PASSAGES.filter((p) => p.level === level);
    return texts.reduce((sum, p) => sum + data.wordCount(p.text.nl), 0) / texts.length;
  };
  assert.ok(avgWords(7) > avgWords(2), `level 7 (${avgWords(7)}) should read longer than level 2 (${avgWords(2)})`);
});

test("every reading skill has a name and a tip in both languages", () => {
  for (const skill of data.READING_SKILLS) {
    for (const lang of LANGS) {
      assert.ok(TRANSLATIONS[lang][`lezen.skill_${skill}`], `${lang} skill_${skill}`);
      assert.ok(TRANSLATIONS[lang][`lezen.tip_${skill}`], `${lang} tip_${skill}`);
    }
  }
  for (let level = 0; level <= 7; level++) {
    for (const lang of LANGS) assert.ok(TRANSLATIONS[lang][`spelling.tip_${level}`], `${lang} spelling.tip_${level}`);
  }
});

test("wordCount counts words, not punctuation or spaces", () => {
  assert.equal(data.wordCount("Sara komt thuis uit school."), 5);
  assert.equal(data.wordCount("  ‘Yara, jij bent!’ zegt juf Esra. – "), 6);
  assert.equal(data.wordCount(""), 0);
});

// ---------------------------------------------------------------------------
// The games' generators
// ---------------------------------------------------------------------------

test("the story templates (levels 0-1) always put the right answer, and only it, in the text", () => {
  for (const lang of LANGS) {
    setLanguage(lang);
    for (const level of [0, 1]) {
      for (let i = 0; i < 300; i++) {
        const problem = lezen.generate(level);
        const inText = (option) => new RegExp(`(^|[^\\p{L}])${option}([^\\p{L}]|$)`, "u").test(problem.passage);
        assert.ok(inText(problem.answer), `"${problem.answer}" missing from "${problem.passage}"`);
        for (const option of problem.options.filter((o) => o !== problem.answer)) {
          assert.ok(!inText(option), `wrong option "${option}" also appears in "${problem.passage}"`);
        }
      }
    }
  }
  setLanguage("nl");
});

test("Leesdetective asks all three questions about one text before moving on, and counts its words once", () => {
  setLanguage("nl");
  lezen.generate(3); // settle on a level
  for (let round = 0; round < 20; round++) {
    // Drain to the start of a fresh text.
    let first = lezen.generate(3);
    while (first.index !== 0) first = lezen.generate(3);
    const second = lezen.generate(3);
    const third = lezen.generate(3);
    assert.equal(second.passage, first.passage);
    assert.equal(third.passage, first.passage);
    assert.deepEqual([first.index, second.index, third.index], [0, 1, 2]);
    assert.equal(first.words, data.wordCount(first.passage));
    assert.equal(second.words, 0);
    assert.equal(third.words, 0);
  }
  // A level change starts a new text straight away.
  lezen.generate(4);
  const fresh = lezen.generate(5);
  assert.equal(fresh.index, 0);
  assert.equal(data.PASSAGES.find((p) => p.text.nl === fresh.passage)?.level, 5);
});

test("the reading generators follow the language, at every level", () => {
  for (const lang of LANGS) {
    setLanguage(lang);
    for (let level = 2; level <= 7; level++) {
      const problem = lezen.generate(level);
      assert.ok(data.PASSAGES.some((p) => p.text[lang] === problem.passage), `${lang} level ${level}`);
    }
    for (let level = 0; level <= 7; level++) {
      const s = spelling.generate(level);
      const answers = data.SPELLING[lang][level].map((i) => (Array.isArray(i) ? i[0] : i.a));
      assert.ok(answers.includes(s.answer), `${lang} spelling level ${level}: ${s.answer}`);
      const w = woorden.generate(level);
      assert.ok(data.VOCAB[lang][level].some((i) => i.a === w.answer), `${lang} woorden level ${level}`);
    }
  }
  setLanguage("nl");
});

test("sentence-length answers are stacked one per row; single words are not", () => {
  setLanguage("nl");
  for (let i = 0; i < 200; i++) {
    const problem = lezen.generate(6);
    if (problem.options.some((o) => o.length > 18)) assert.equal(problem.columns, 1);
  }
  for (let i = 0; i < 100; i++) assert.notEqual(lezen.generate(0).columns, 1);
});

// ---------------------------------------------------------------------------
// Learning bites
// ---------------------------------------------------------------------------

test("24 learning bites, 12 maths and 12 language, groep 6-8, each complete in both languages", () => {
  assert.equal(BITES.length, 24);
  assert.equal(BITES.filter((b) => b.subject === "math").length, 12);
  assert.equal(BITES.filter((b) => b.subject === "taal").length, 12);
  assert.equal(new Set(BITES.map((b) => b.id)).size, BITES.length, "bite ids must be unique");
  for (const bite of BITES) {
    assert.ok([6, 7, 8].includes(bite.groep), bite.id);
    assert.ok(bite.emoji);
    for (const lang of LANGS) {
      const c = bite[lang];
      assert.ok(c.title && c.body && c.example, `${bite.id} ${lang}`);
      assert.equal(c.quiz.length, 3, `${bite.id} ${lang}`);
      for (const q of c.quiz) {
        assert.equal(q.w.length, 2);
        assert.equal(new Set([q.a, ...q.w]).size, 3, `${bite.id} ${lang}: ${q.q}`);
      }
      for (const text of [c.title, c.body, c.example, ...c.quiz.flatMap((q) => [q.q, q.a, ...q.w])]) {
        assert.ok(SAFE(text), `${bite.id}: ${text}`);
      }
    }
  }
});

test("the bite of the day is the same all day, and always one the child has not collected yet", () => {
  freshPlayer();
  const day = new Date(2026, 8, 25, 9);
  const later = new Date(2026, 8, 25, 21);
  assert.equal(bites.biteOfTheDay(day).id, bites.biteOfTheDay(later).id);
  for (let i = 0; i < BITES.length - 1; i++) {
    const bite = bites.biteOfTheDay(day);
    assert.equal(bites.biteStars(bite.id), 0, "never an already-collected bite while others are open");
    S.bites[bite.id] = { stars: 1, at: null };
  }
});

test("a bite pays once: a new card, a gold card and the daily bonus each only the first time", () => {
  freshPlayer();
  const day = new Date(2026, 8, 25, 12);
  const daily = bites.biteOfTheDay(day);
  const other = BITES.find((b) => b.id !== daily.id);
  const score = S.totalScore;

  // Failing (1 of 3) collects nothing and pays nothing.
  let coins = S.coins;
  let result = bites.finishBite(other.id, 1, day);
  assert.deepEqual([result.stars, result.coins, result.newCard], [0, 0, false]);
  assert.equal(S.coins, coins);

  // 2 of 3: a card and BITE_COINS (not the bite of the day, so no bonus).
  result = bites.finishBite(other.id, 2, day);
  assert.deepEqual([result.stars, result.coins, result.newCard, result.newGold], [1, bites.BITE_COINS, true, false]);

  // 3 of 3 later: upgrades to gold, pays only the gold bonus.
  result = bites.finishBite(other.id, 3, day);
  assert.deepEqual([result.stars, result.coins, result.newGold], [2, bites.GOLD_BONUS, true]);

  // Repeating it - perfectly or badly - pays nothing and never loses the gold.
  for (const right of [3, 2, 0]) {
    coins = S.coins;
    result = bites.finishBite(other.id, right, day);
    assert.equal(result.coins, 0, `repeat with ${right} right`);
    assert.equal(S.coins, coins);
    assert.equal(bites.biteStars(other.id), 2);
  }

  // The bite of the day, straight to gold: card + daily bonus + gold.
  result = bites.finishBite(daily.id, 3, day);
  assert.equal(result.coins, bites.BITE_COINS + bites.DAILY_BONUS + bites.GOLD_BONUS);
  assert.equal(bites.finishBite(daily.id, 3, day).coins, 0);

  assert.equal(S.totalScore, score, "bite coins are a gift: the score does not move");
  assert.equal(bites.collectedCount(), 2);
  assert.equal(bites.goldCount(), 2);
});

test("an unknown bite id pays nothing and records nothing", () => {
  freshPlayer();
  const coins = S.coins;
  assert.equal(bites.finishBite("no_such_bite", 3).coins, 0);
  assert.equal(S.coins, coins);
  assert.deepEqual(S.bites, {});
  assert.ok(BITE_MAP.m_breuk);
});
