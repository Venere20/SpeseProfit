package it.speseprofit.nativebridge

/** Persisted monotonic deadline; a different boot conservatively re-arms one bounded wait. */
internal object AttemptCooldown {
  data class State(val count: Int, val untilElapsed: Long, val bootId: String?)
  fun delayMillis(count: Int): Long =
    if (count < 5) 0L else (30_000L shl (count - 5).coerceAtMost(5)).coerceAtMost(900_000L)
  private fun deadline(now: Long, delay: Long) = now.coerceIn(0L, Long.MAX_VALUE - delay) + delay
  fun restore(saved: State, now: Long, bootId: String): State {
    require(bootId.isNotBlank() && now >= 0)
    val count = saved.count.coerceIn(0, 20)
    if (count < 5) return State(count, 0L, bootId)
    if (saved.bootId != bootId || saved.untilElapsed < 0L) return State(count, deadline(now, delayMillis(count)), bootId)
    return saved.copy(count = count)
  }
  fun failed(saved: State, now: Long, bootId: String): State {
    val count = (saved.count.coerceIn(0, 20) + 1).coerceAtMost(20)
    return State(count, deadline(now, delayMillis(count)), bootId)
  }
  fun allowed(state: State, now: Long) = now >= 0L && now >= state.untilElapsed
}
