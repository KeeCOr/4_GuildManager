# Recruit Scaling Design

Goal: building upgrades should make visiting mercenaries feel progressively more valuable without replacing tavern grade progression.

## Building Responsibilities

- Barracks (`병영`)
  - Primary source of recruit level.
  - Lv1/2/3/4 maps to recruit base Lv1/2/3/4.
  - Still controls arrival count and cadence.

- Training Hall (`훈련소`)
  - Secondary recruit preparation bonus.
  - Lv3 gives +1 recruit level.
  - Lv4 gives +2 recruit levels.

- Tavern (`선술집`)
  - Keeps its original role: better grade distribution.
  - Lv3+ widens recruit level range by +1 so arrivals have slight level variation.

## Current Formula

```text
baseLevel = barracksLevelToRecruitLevel[barracksLv]
trainingBonus = trainingLv >= 4 ? 2 : trainingLv >= 3 ? 1 : 0
minLevel = baseLevel + trainingBonus
maxLevel = minLevel + (tavernLv >= 3 ? 1 : 0)
```

Each arriving mercenary rolls within `minLevel..maxLevel`.

## UX Surfaces

- Building panel shows the current recruit profile.
- Arrival logs include recruit level information.
- Arrival cards already show each mercenary level.

## Balance Notes

- Higher starting level increases stats, power, hire cost, and daily wage.
- Tavern remains about grade quality, so a high-level low-grade recruit and a low-level high-grade recruit can both appear.
