/**
 * Beloningswinkel / Reward Shop - what a child's coins are actually for.
 *
 * Five collections: "characters" (equip one to show next to your name in
 * the sidebar), "stickers" and "special gifts" (pure collectibles), "colour
 * themes" (equip one to recolour the app) - all unlocked with the coins every
 * correct answer already pays out - and "treasures", which are never for
 * sale and only turn up in the daily treasure chest (quests.js). Coins never
 * expire, get capped, or reset (addScore() and grantBonusCoins() in
 * state.js), so the balance shown here is everything a child has ever earned
 * from answers, quests and chests, minus whatever they've spent. The whole
 * page doubles as the "collection to
 * show a parent": the intro line says so, and every locked card stays
 * visible - dimmed, with either its price or the real reason it is still
 * locked - rather than being hidden, so the *size* of the collection is
 * always in view, not just what's already been unlocked.
 */
import { t, tMd } from "../i18n.js";
import { el, raw, clear, append } from "../dom.js";
import { state } from "../state.js";
import {
  REWARD_DEFS,
  canAfford,
  canBeGoal,
  canUnlock,
  equipReward,
  goalInfo,
  isEquippable,
  isEquipped,
  isUnlocked,
  lockReason,
  toggleGoal,
  unlockReward,
} from "../rewards.js";
import { announceNewBadges } from "../gameflow.js";
import { pageHeader } from "../ui.js";
import { getGameIllustration } from "../illustrations.js";
import { bigCelebration, confetti, toast } from "../fx.js";
import * as sound from "../sound.js";

const CATEGORIES = [
  { key: "avatar", headingKey: "rewards.characters_heading", icon: "🧑" },
  { key: "sticker", headingKey: "rewards.stickers_heading", icon: "⭐" },
  { key: "gift", headingKey: "rewards.gifts_heading", icon: "🎁" },
  { key: "theme", headingKey: "rewards.themes_heading", icon: "🎨", hintKey: "rewards.theme_hint" },
  { key: "treasure", headingKey: "rewards.treasures_heading", icon: "🧰", hintKey: "rewards.treasure_hint" },
];

export function render(container) {
  const root = el("section.kmg-rewards");
  const balance = el("div.kmg-reward-balance");
  const sections = new Map(CATEGORIES.map(({ key }) => [key, el("div", { id: `kmg-rewards-${key}` })]));

  // A row of chips that jumps to each collection - with over a hundred cards
  // the treasures and themes are otherwise a long scroll away.
  const jumpBar = el(
    "nav.kmg-reward-jump",
    { "aria-label": t("rewards.jump_label") },
    CATEGORIES.map(({ key, headingKey, icon }) =>
      el("button.kmg-chip.kmg-reward-jump-btn", {
        type: "button",
        text: `${icon} ${t(headingKey)}`,
        onClick: () => {
          sound.playTap();
          sections.get(key).scrollIntoView({ behavior: "smooth", block: "start" });
        },
      }),
    ),
  );

  function paintBalance() {
    clear(balance);
    const goal = goalInfo();
    append(
      balance,
      el("span.kmg-reward-balance-icon", { text: "🪙" }),
      el("div", {}, [
        el("div.kmg-reward-balance-value", { text: String(state.coins) }),
        el("div.kmg-reward-balance-label", { text: t("rewards.balance_label") }),
      ]),
      // What the child is saving for, right next to what they have.
      goal
        ? el("div.kmg-reward-balance-goal", {}, [
            el("span.kmg-reward-balance-goal-emoji", { text: goal.def.emoji, "aria-hidden": "true" }),
            el("div", {}, [
              el("div.kmg-reward-balance-label", { text: `${t("goal.heading")}: ${t(goal.def.nameKey)}` }),
              el("div.kmg-reward-bar", {}, [el("span.kmg-reward-bar-fill", { style: { width: `${goal.pct}%` } })]),
            ]),
          ])
        : null,
    );
  }

  function refreshAll() {
    paintBalance();
    for (const category of CATEGORIES) {
      const host = sections.get(category.key);
      clear(host);
      host.append(section(category));
    }
  }

  function section({ key: category, headingKey, hintKey }) {
    const defs = REWARD_DEFS.filter((d) => d.category === category);
    const unlockedCount = defs.filter((d) => isUnlocked(d.id)).length;
    return el("div", {}, [
      el("div.kmg-reward-section-head", {}, [
        el("h2", { text: t(headingKey) }),
        el("span.kmg-reward-progress-count", {
          text: t("rewards.progress_summary", { unlocked: unlockedCount, total: defs.length }),
        }),
      ]),
      hintKey ? el("p.kmg-caption", { text: t(hintKey) }) : null,
      el(
        "div.kmg-reward-grid",
        {},
        defs.map((def) => rewardCard(def)),
      ),
    ]);
  }

  /** The colour strip on a theme card - a preview of what equipping it does. */
  function swatch(def) {
    return el("span.kmg-reward-swatch", {
      "aria-hidden": "true",
      style: { background: `linear-gradient(90deg, ${def.swatch.join(", ")})` },
    });
  }

  /** The 🎯 pin: "this is what I'm saving up for". */
  function goalButton(def) {
    const isGoal = state.goalReward === def.id;
    return el(`button.kmg-reward-goalbtn${isGoal ? ".is-goal" : ""}`, {
      type: "button",
      text: "🎯",
      title: t(isGoal ? "goal.clear_aria" : "goal.set_aria", { name: t(def.nameKey) }),
      "aria-label": t(isGoal ? "goal.clear_aria" : "goal.set_aria", { name: t(def.nameKey) }),
      "aria-pressed": String(isGoal),
      onClick: () => {
        toggleGoal(def.id);
        sound.playTap();
        refreshAll();
      },
    });
  }

  /** The one ultra item gets a rotating 3D cube instead of a flat emoji. */
  function cubeFigure(def) {
    return el("div.kmg-reward-cube", {}, [
      el("div.kmg-reward-cube-inner", {}, [
        el("div.kmg-cube-face.kmg-cube-front", { text: def.emoji }),
        el("div.kmg-cube-face.kmg-cube-back", { text: def.emoji }),
        el("div.kmg-cube-face.kmg-cube-right"),
        el("div.kmg-cube-face.kmg-cube-left"),
        el("div.kmg-cube-face.kmg-cube-top"),
        el("div.kmg-cube-face.kmg-cube-bottom"),
      ]),
    ]);
  }

  function rewardCard(def) {
    const unlocked = isUnlocked(def.id);
    const equipped = isEquipped(def.id);
    const reason = unlocked ? null : lockReason(def.id);
    // "Can buy right now" cards are not dimmed like the rest of the locked
    // ones - they glow instead, so the shop shows at a glance what the
    // child's coins can already get them.
    const buyable = !unlocked && canUnlock(def.id);
    const isGoal = state.goalReward === def.id && !unlocked;
    const card = el(
      `div.kmg-reward-card${unlocked ? ".is-unlocked" : ".is-locked"}${buyable ? ".is-buyable" : ""}${equipped ? ".is-equipped" : ""}${def.threeD ? ".is-3d" : ""}${isGoal ? ".is-goal" : ""}${def.chestOnly ? ".is-treasure" : ""}`,
      { dataset: { reward: def.id } },
    );

    append(
      card,
      el("div.kmg-reward-cardtop", {}, [
        el(`span.kmg-reward-tier.kmg-tier-${def.tier}`, { text: t(`rewards.tier_${def.tier}`) }),
        canBeGoal(def.id) ? goalButton(def) : null,
      ]),
      isGoal ? el("span.kmg-reward-goaltag", { text: t("goal.tag") }) : null,
      buyable ? el("span.kmg-reward-buyable", { text: t("rewards.can_buy") }) : null,
    );

    if (def.threeD) {
      card.append(cubeFigure(def), el("span.kmg-reward-name", { text: t(def.nameKey) }));
      if (unlocked) card.append(el("p.kmg-reward-3d-caption", { text: t("rewards.ultra_caption") }));
    } else {
      append(
        card,
        el("span.kmg-reward-emoji", { text: def.emoji }),
        def.swatch ? swatch(def) : null,
        el("span.kmg-reward-name", { text: t(def.nameKey) }),
      );
    }

    if (unlocked && isEquippable(def.id)) {
      card.append(
        equipped
          ? el("span.kmg-reward-tag", { text: t("rewards.equipped_label") })
          : el("button.kmg-btn.kmg-btn-ghost.kmg-reward-btn", {
              type: "button",
              text: t("rewards.equip_button"),
              onClick: () => {
                equipReward(def.id);
                sound.playTap();
                refreshAll();
              },
            }),
      );
    } else if (unlocked) {
      card.append(el("span.kmg-reward-tag", { text: t("rewards.unlocked_label") }));
    } else if (reason === "chest") {
      card.append(el("p.kmg-reward-lockmsg", { text: `🧰 ${t("rewards.lock_reason_chest")}` }));
    } else if (reason === "mastery") {
      card.append(el("p.kmg-reward-lockmsg", { text: `🔒 ${t("rewards.lock_reason_mastery")}` }));
    } else if (reason === "level") {
      card.append(
        el("p.kmg-reward-lockmsg", { text: `🔒 ${t("rewards.lock_reason_level", { level: def.minLevel })}` }),
      );
    } else {
      const affordable = canAfford(def.id);
      const pct = Math.max(0, Math.min(100, Math.round((state.coins / def.cost) * 100)));
      append(
        card,
        el("div.kmg-reward-bar", {}, [el("span.kmg-reward-bar-fill", { style: { width: `${pct}%` } })]),
        // The buy button already carries the price; only say it twice when
        // what matters is how much is still missing.
        affordable ? null : el("span.kmg-reward-cost", { text: t("rewards.locked_need", { amount: def.cost - state.coins }) }),
        el("button.kmg-btn.kmg-btn-primary.kmg-reward-btn", {
          type: "button",
          disabled: !affordable,
          text: t("rewards.unlock_button", { cost: def.cost }),
          onClick: (event) => {
            if (!unlockReward(def.id)) return;
            sound.playBadge();
            const rect = event.currentTarget.getBoundingClientRect();
            const isUltra = def.tier === "ultra";
            confetti({ x: rect.left + rect.width / 2, y: rect.top, count: isUltra ? 140 : 45 });
            if (isUltra) bigCelebration();
            toast(t("rewards.unlocked_toast", { name: t(def.nameKey) }), def.emoji, 4000);
            // Buying the 10th or 30th reward is itself a badge.
            announceNewBadges();
            refreshAll();
          },
        }),
      );
    }
    return card;
  }

  root.append(
    pageHeader("rewards.title", {
      subtitleKey: "rewards.subtitle",
      emoji: "🎁",
      illustration: getGameIllustration("rewards"),
    }),
    raw("div.kmg-intro", tMd("rewards.intro")),
    balance,
    jumpBar,
    ...sections.values(),
  );

  refreshAll();
  container.append(root);
}
