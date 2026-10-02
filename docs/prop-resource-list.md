# Prop Resource List

Purpose: split background props into reusable layer resources so characters can move behind or in front of furniture and room objects.

## Runtime Layer

- `src/assets/BG/props/front/scene-front-props.png`
  - Full-size transparent foreground layer aligned to `BG_Base.jpg`.
  - Render order: base background -> room/characters -> foreground props.
  - Use this when a prop should visually cover characters.

## Cutout Resources

- `src/assets/BG/props/cutouts/master_strategy_table.png`
  - Room: 길드마스터룸
  - Layer: front
  - Use: map table and front table legs.

- `src/assets/BG/props/cutouts/master_desk_cluster.png`
  - Room: 길드마스터룸
  - Layer: back/reference
  - Use: desk, candles, map area reference for future interaction points.

- `src/assets/BG/props/cutouts/training_weapon_rack.png`
  - Room: 훈련소
  - Layer: front
  - Use: weapon rack foreground occluder.

- `src/assets/BG/props/cutouts/training_archery_target.png`
  - Room: 훈련소
  - Layer: front
  - Use: target and arrow bundle foreground occluder.

- `src/assets/BG/props/cutouts/training_dummies.png`
  - Room: 훈련소
  - Layer: front
  - Use: training dummy foreground occluder.

- `src/assets/BG/props/cutouts/dining_front_tables.png`
  - Room: 식당
  - Layer: front
  - Use: tables and benches that characters can walk behind.

- `src/assets/BG/props/cutouts/dining_bar_counter.png`
  - Room: 식당
  - Layer: front
  - Use: food sales counter and shelves.

- `src/assets/BG/props/cutouts/dining_fireplace.png`
  - Room: 식당
  - Layer: front
  - Use: fireplace and nearby stool foreground.

- `src/assets/BG/props/cutouts/exterior_drawbridge.png`
  - Room: 외부
  - Layer: front
  - Use: drawbridge railing and exterior foreground.

## Metadata

- `src/assets/BG/props/props-manifest.json`
  - Contains source image size, crop coordinates, room tags, layer tags, and usage notes.
