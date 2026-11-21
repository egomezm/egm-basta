export interface RotPlayer {
  id: string
  join_seq: number
  connected: boolean
}

// Connected players first, then the first one at or after fromSeq in join order (wrapping).
export function pick(players: RotPlayer[], fromSeq: number, excludeId: string | null): RotPlayer | null {
  const sorted = players
    .filter((p) => p.id !== excludeId)
    .sort(
      (a, b) =>
        Number(!a.connected) - Number(!b.connected) ||
        Number(a.join_seq < fromSeq) - Number(b.join_seq < fromSeq) ||
        a.join_seq - b.join_seq,
    )
  return sorted[0] ?? null
}

// Spinner = previous stopper, stopper = next player in join order.
export function nextTurn(
  players: RotPlayer[],
  prev: { spinner_id: string | null; stopper_id: string | null } | null,
): { spinner: RotPlayer | null; stopper: RotPlayer | null } {
  let base = 1
  if (prev) {
    const stopper = players.find((p) => p.id === prev.stopper_id)
    const spinner = players.find((p) => p.id === prev.spinner_id)
    base = stopper ? stopper.join_seq : spinner ? spinner.join_seq + 1 : 1
  }
  const spinner = pick(players, base, null)
  const stopper = spinner ? pick(players, spinner.join_seq + 1, spinner.id) : null
  return { spinner, stopper }
}
