# Midnight Vault II

[![make.fun bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/competitions/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/cihuy13/midnight-vault-heist-v2/rank.svg)](https://make.fun/competitions/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/cihuy13/midnight-vault-heist-v2/reward.svg)](https://make.fun/competitions/best-heist-game-20261122-0559)

A top-down museum heist game for the [make.fun "Make the best heist game" bounty](https://make.fun/competitions/best-heist-game-20261122-0559).

You are Raka, a thief in a dark museum after closing time. Cross three
galleries — Gallery, Vault Hall, Grand Vault — grab the loot, read the
guards' vision cones and the sweeping cameras, crack the vault, and slip
out the EXIT before the alarm peaks.

- **Guards with vision cones** — patrol, investigate the last place they
  saw you, and chase when the alarm is high. Getting caught ends the run.
- **Cameras** — sweeping teal cones that raise the alarm when they see you.
- **Alarm meter** — CALM / UNEASY / SUSPICIOUS / ALARMED, always on screen.
- **Tools, bought between levels** — Smoke Bomb, Coin Toss, Lockpick,
  Sneakers. Every tool costs coins you stole.
- **Three levels, one getaway** — the Crown Sapphire waits behind the vault
  ring in the Grand Vault.

## Play

Serve it locally and open it in a desktop browser:

```sh
node serve.ts
# http://localhost:8080
```

Move with WASD or the arrow keys. Hold **E** next to a vault door to crack
it. Press **1/2/3** to use tools, **Shift** to sneak faster, **R** to retry
a level after being caught.
