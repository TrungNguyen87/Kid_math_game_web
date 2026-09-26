/**
 * Het Sterrenpad / The Star Road (round 19) - the page.
 *
 * Three things on one page, in the order a child needs them:
 *   1. how many stars they have, and what the next reward on the road is;
 *   2. where the next stars are - the next level to master in a few games,
 *      highest first, because the higher the level the more stars it is
 *      worth (starroad.js starsForLevel());
 *   3. the road itself, a tier every few stars, each claimed with a tap;
 * and at the bottom, where every star so far came from: the log of
 * mastered levels, per game, read as a collection.
 *
 * The rules live in starroad.js; this file only draws them.
 */
import { t, tMd } from "../i18n.js";
import { el, raw, clear, append } from "../dom.js";
import { GAME_NAV } from "../nav.js";
import { setLevel } from "../state.js";
import {
  STAR_TIERS,
  claimTier,
  claimableCount,
  maxStarsPerGame,
  nextLockedTier,
  nextStarSources,
  starsPerGame,
  tierStates,
  totalStars,
} from "../starroad.js";
import { REWARD_MAP, equipReward, isEquippable } from "../rewards.js";
import { announceNewBadges } from "../gameflow.js";
import { pageHeader } from "../ui.js";
import { getGameIllustration } from "../illustrations.js";
import { bigCelebration, confetti, levelUpOverlay, toast } from "../fx.js";
import * as sound from "../sound.js";

const entryFor = (game) => GAME_NAV.find((entry) => entry.game === game);

/** What a tier gives, as "emoji name" text. */
function tierPrize(tier) {
  if (tier.reward) {
    const def = REWARD_MAP[tier.reward];
    return { emoji: def.emoji, text: t(def.nameKey) };
  }
  return { emoji: "🪙", text: t("starroad.tier_coins", { coins: tier.coins }) };
}

export function render(container) {
  const root = el("section.kmg-starroad");
  const summary = el("div");
  const sources = el("div");
  const road = el("ol.kmg-starroad-track");
  const history = el("div");

  function paintSummary() {
    clear(summary);
    const stars = totalStars();
    const next = nextLockedTier(stars);
    const previous = [...STAR_TIERS].reverse().find((tier) => tier.stars <= stars)?.stars ?? 0;
    const pct = next ? Math.round((100 * (stars - previous)) / (next.stars - previous)) : 100;
    const ready = claimableCount(stars);
    const prize = next ? tierPrize(next) : null;
    append(
      summary,
      el("div.kmg-card.kmg-starroad-summary", {}, [
        el("div.kmg-starroad-total", {}, [
          el("span.kmg-starroad-bigstar", { text: "🌟", "aria-hidden": "true" }),
          el("div", {}, [
            el("div.kmg-starroad-count", { text: String(stars) }),
            el("div.kmg-caption", { text: t("starroad.stars_label") }),
          ]),
        ]),
        el("div.kmg-starroad-next", {}, [
          next
            ? el("p", {}, [
                t("starroad.next_reward", { stars: next.stars, more: next.stars - stars }),
                " ",
                el("strong", { text: `${prize.emoji} ${prize.text}` }),
              ])
            : el("p", { text: t("starroad.road_done") }),
          el("div.kmg-progress-bar", { role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 }, [
            el("div.kmg-progress-fill", { style: { width: `${pct}%` } }),
          ]),
          ready ? el("p.kmg-starroad-ready", { text: `🎁 ${t("starroad.ready_count", { count: ready })}` }) : null,
        ]),
      ]),
    );
  }

  function paintSources() {
    clear(sources);
    const list = nextStarSources();
    if (!list.length) return;
    sources.append(
      el("h2", { text: t("starroad.where_heading") }),
      el(
        "div.kmg-starroad-sources",
        {},
        list.map((source) => {
          const entry = entryFor(source.game);
          return el(
            "a.kmg-card.kmg-starroad-source",
            {
              href: `#/${entry.path}`,
              onClick: () => {
                // Straight onto the level worth the stars, not the mastered one below it.
                if (source.moveUp) setLevel(source.game, source.level);
                sound.playTap();
              },
            },
            [
              el("span.kmg-starroad-source-icon", { text: entry.icon, "aria-hidden": "true" }),
              el("span.kmg-starroad-source-text", {}, [
                el("strong", { text: t(`nav.${source.game}`) }),
                el("span", { text: t("starroad.source_line", { level: source.level }) }),
              ]),
              el("span.kmg-starroad-source-stars", { text: `+${"⭐".repeat(source.stars)}` }),
            ],
          );
        }),
      ),
    );
  }

  function claim(tier, button) {
    const result = claimTier(tier.stars);
    if (!result) return;
    const rect = button.getBoundingClientRect();
    confetti({ x: rect.left + rect.width / 2, y: rect.top, count: 90 });
    bigCelebration();
    sound.playFanfare();
    const prize = tierPrize(tier);
    if (result.rewardId && isEquippable(result.rewardId)) equipReward(result.rewardId);
    const message = result.rewardId ? t("starroad.claimed_reward", { reward: prize.text }) : t("starroad.claimed_coins", { coins: result.coins });
    levelUpOverlay(t("starroad.claimed_title"), message, prize.emoji);
    toast(message, prize.emoji, 4500);
    announceNewBadges();
    paintAll();
  }

  function paintRoad() {
    clear(road);
    for (const [index, tier] of tierStates().entries()) {
      const prize = tierPrize(tier);
      const stars = totalStars();
      road.append(
        el(`li.kmg-starroad-tier.is-${tier.status}${index % 2 ? ".is-right" : ""}`, { dataset: { stars: tier.stars } }, [
          el("span.kmg-starroad-node", { text: `${tier.stars}⭐` }),
          el("div.kmg-starroad-prize", {}, [
            el("span.kmg-starroad-prize-emoji", { text: prize.emoji, "aria-hidden": "true" }),
            el("span.kmg-starroad-prize-name", { text: prize.text }),
            tier.status === "claimed"
              ? el("span.kmg-starroad-tag", { text: `✅ ${t("starroad.claimed_label")}` })
              : tier.status === "ready"
                ? el("button.kmg-btn.kmg-btn-primary.kmg-starroad-claim", {
                    type: "button",
                    text: t("starroad.claim_button"),
                    onClick: (event) => claim(tier, event.currentTarget),
                  })
                : el("span.kmg-starroad-tag", { text: t("starroad.locked_more", { more: tier.stars - stars }) }),
          ]),
        ]),
      );
    }
  }

  function paintHistory() {
    clear(history);
    const rows = starsPerGame().filter((row) => row.stars > 0);
    const max = maxStarsPerGame();
    history.append(el("h2", { text: t("starroad.history_heading") }));
    if (!rows.length) {
      history.append(el("p.kmg-caption", { text: t("starroad.history_none") }));
      return;
    }
    const table = el("table.kmg-table.kmg-starroad-history");
    table.append(
      el("thead", {}, [
        el("tr", {}, [
          el("th", { text: t("starroad.col_game") }),
          el("th", { text: t("starroad.col_levels") }),
          el("th", { text: t("starroad.col_stars") }),
        ]),
      ]),
    );
    const body = el("tbody");
    for (const row of rows) {
      const entry = entryFor(row.game);
      body.append(
        el("tr", {}, [
          el("td", { text: `${entry?.icon ?? ""} ${t(`nav.${row.game}`)}` }),
          el("td", { text: row.levels.join(", ") }),
          el("td", { text: `${row.stars} / ${max} ⭐` }),
        ]),
      );
    }
    table.append(body);
    history.append(el("div.kmg-table-scroll", {}, [table]));
  }

  function paintAll() {
    paintSummary();
    paintSources();
    paintRoad();
    paintHistory();
  }

  append(
    root,
    pageHeader("starroad.title", {
      subtitleKey: "starroad.subtitle",
      emoji: "🌟",
      illustration: getGameIllustration("sterrenpad"),
    }),
    raw("div.kmg-intro", tMd("starroad.intro")),
    el("div.kmg-starroad-values", { "aria-label": t("starroad.values_label") }, [
      el("span.kmg-chip", { text: t("starroad.value_line", { levels: "0–1", stars: "⭐" }) }),
      el("span.kmg-chip", { text: t("starroad.value_line", { levels: "2–3", stars: "⭐⭐" }) }),
      el("span.kmg-chip", { text: t("starroad.value_line", { levels: "4–5", stars: "⭐⭐⭐" }) }),
      el("span.kmg-chip", { text: t("starroad.value_line", { levels: "6 🎓", stars: "⭐⭐⭐⭐" }) }),
      el("span.kmg-chip.is-muted", { text: t("starroad.value_replay") }),
    ]),
    summary,
    sources,
    el("h2", { text: t("starroad.road_heading") }),
    road,
    history,
  );
  paintAll();
  container.append(root);
}
