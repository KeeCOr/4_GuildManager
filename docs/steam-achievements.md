# GuildManager — Steam Achievements

## Achievement List

| API Name | Display Name | Description | Trigger Condition |
|----------|-------------|-------------|-------------------|
| FIRST_CONTRACT | 첫 번째 계약 | Complete your first mercenary contract | First contract completed |
| GUILD_FOUNDED | 길드 창설 | Establish your guild with 5 members | Roster reaches 5 |
| IRON_ROSTER | 철의 용병단 | Have all 8 roster slots filled | Full 8-member roster |
| FIRST_VICTORY | 첫 승리 | Win your first tactical battle | Win first combat mission |
| NO_CASUALTIES | 무손실 승리 | Complete a mission without losing anyone | Mission clear, 0 KIA |
| COMEBACK | 역전 | Win a battle with only 1 member standing | 1v? victory |
| VETERAN | 베테랑 | Complete 50 contracts | 50 contracts done |
| LEGENDARY | 전설의 길드 | Reach maximum guild reputation | Max rep tier |
| RICH | 황금만능 | Accumulate 10,000 gold | Gold ≥ 10,000 |
| DEBT_FREE | 무차입 경영 | Pay all wages for 10 consecutive weeks | 10 weeks no missed pay |
| SPECIALIST | 전문가 | Max out one mercenary's skill tree | Any merc fully leveled |
| DIVERSE_FORCE | 다양한 전력 | Field all 4 unit classes in one mission | 4-class party |
| EARLY_RETIREMENT | 조기 은퇴 | Win a campaign in under 20 contracts | Campaign win < 20 contracts |
| IRON_WILL | 강철 의지 | Complete a campaign on the hardest difficulty | Hard mode win |
| GUILD_MASTER | 길드 마스터 | Complete all other achievements | All achievements unlocked |

## Implementation Notes

```javascript
// Unlock example (renderer side via window.steamAchievement)
await window.steamAchievement.unlock('FIRST_CONTRACT');

// Check example
const isUnlocked = window.steamAchievement.isUnlocked('VETERAN');
```

All achievement API names must be registered in the Steamworks partner portal before use.
