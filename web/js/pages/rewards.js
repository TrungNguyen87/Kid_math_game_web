/**
 * Beloningswinkel / Reward Shop - what a child's coins are actually for.
 *
 * Two collections, "characters" (equip one to show next to your name in the
 * sidebar) and "stickers" (pure collectibles), both unlocked with the coins
 * every correct answer already pays out (see addScore() in state.js). The
 * whole page doubles as the "collection to show a parent": the intro line
 * says so, and every locked card stays visible - dimmed, with its price and
 * how close the child is - rather than being hidden, so the *size* of the
 * collection is always in view, not just what's already been unlocked.
 */
import { t, tMd } from "../i18n.js";
import { el, raw, clear } from "../dom.js";
import { state } from "../state.js";
import { REWARD_DEFS, canAfford, equipAvatar, equippedAvatarId, isUnlocked, unlockReward } from "../rewards.js";
import { pageHeader } from "../ui.js";
import { getGameIllustration } from "../illustrations.js";
import { confetti, toast } from "../fx.js";
import * as sound from "../sound.js";

const CATEGORIES = [
  { key: "avatar", headingKey: "rewards.characters_heading" },
  { key: "sticker", headingKey: "rewards.stickers_heading" },
];

export function render(container) {
  const root = el("section.kmg-rewards");
  const balance = el("div.kmg-reward-balance");
  const sections = new Map(CATEGORIES.map(({ key }) => [key, el("div")]));

  function paintBalance() {
    clear(balance);
    balance.append(
      el("span.kmg-reward-balance-icon", { text: "🪙" }),
      el("div", {}, [
        el("div.kmg-reward-balance-value", { text: String(state.coins) }),
        el("div.kmg-reward-balance-label", { text: t("rewards.balance_label") }),
      ]),
    );
  }

  function refreshAll() {
    paintBalance();
    for (const { key, headingKey } of CATEGORIES) {
      const host = sections.get(key);
      clear(host);
      host.append(section(key, headingKey));
    }
  }

  function section(category, headingKey) {
    const defs = REWARD_DEFS.filter((d) => d.category === category);
    const unlockedCount = defs.filter((d) => isUnlocked(d.id)).length;
    return el("div", {}, [
      el("div.kmg-reward-section-head", {}, [
        el("h2", { text: t(headingKey) }),
        el("span.kmg-reward-progress-count", {
          text: t("rewards.progress_summary", { unlocked: unlockedCount, total: defs.length }),
        }),
      ]),
      el(
        "div.kmg-reward-grid",
        {},
        defs.map((def) => rewardCard(def)),
      ),
    ]);
  }

  function rewardCard(def) {
    const unlocked = isUnlocked(def.id);
    const equipped = def.category === "avatar" && equippedAvatarId() === def.id;
    const card = el(
      `div.kmg-reward-card${unlocked ? ".is-unlocked" : ".is-locked"}${equipped ? ".is-equipped" : ""}`,
    );

    card.append(
      el("span.kmg-reward-emoji", { text: def.emoji }),
      el("span.kmg-reward-name", { text: t(def.nameKey) }),
    );

    if (unlocked && def.category === "avatar") {
      card.append(
        equipped
          ? el("span.kmg-reward-tag", { text: t("rewards.equipped_label") })
          : el("button.kmg-btn.kmg-btn-ghost.kmg-reward-btn", {
              type: "button",
              text: t("rewards.equip_button"),
              onClick: () => {
                equipAvatar(def.id);
                sound.playTap();
                refreshAll();
              },
            }),
      );
    } else if (unlocked) {
      card.append(el("span.kmg-reward-tag", { text: t("rewards.unlocked_label") }));
    } else {
      const affordable = canAfford(def.id);
      const pct = Math.max(0, Math.min(100, Math.round((state.coins / def.cost) * 100)));
      card.append(
        el("div.kmg-reward-bar", {}, [el("span.kmg-reward-bar-fill", { style: { width: `${pct}%` } })]),
        el("span.kmg-reward-cost", {
          text: affordable ? `${def.cost} 🪙` : t("rewards.locked_need", { amount: def.cost - state.coins }),
        }),
        el("button.kmg-btn.kmg-btn-primary.kmg-reward-btn", {
          type: "button",
          disabled: !affordable,
          text: t("rewards.unlock_button", { cost: def.cost }),
          onClick: (event) => {
            if (!unlockReward(def.id)) return;
            sound.playBadge();
            const rect = event.currentTarget.getBoundingClientRect();
            confetti({ x: rect.left + rect.width / 2, y: rect.top, count: 45 });
            toast(t("rewards.unlocked_toast", { name: t(def.nameKey) }), def.emoji, 4000);
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
    ...sections.values(),
  );

  refreshAll();
  container.append(root);
}
