package it.speseprofit.nativebridge

import org.junit.Assert.*
import org.junit.Test

class AttemptCooldownTest {
  @Test fun deadlineUsesOnlyMonotonicTimeAndSurvivesProcessDeath() {
    val saved = AttemptCooldown.failed(AttemptCooldown.State(4, 0L, "boot-1"), 10_000L, "boot-1")
    assertEquals(5, saved.count)
    assertEquals(40_000L, saved.untilElapsed)
    // Same boot and persisted metadata, regardless of any civil-clock adjustment.
    val restored = AttemptCooldown.restore(saved.copy(), 20_000L, "boot-1")
    assertEquals(saved, restored)
    assertFalse(AttemptCooldown.allowed(restored, 39_999L))
    assertTrue(AttemptCooldown.allowed(restored, 40_000L))
  }
  @Test fun newBootAndLegacyStateRearmOnceAndPreserveCount() {
    for (saved in listOf(AttemptCooldown.State(5, 40_000L, "old"), AttemptCooldown.State(5, -1L, null))) {
      val restored = AttemptCooldown.restore(saved, 100L, "new")
      assertEquals(5, restored.count)
      assertEquals(30_100L, restored.untilElapsed)
      assertFalse(AttemptCooldown.allowed(restored, 100L))
      assertEquals(restored, AttemptCooldown.restore(restored, 5_000L, "new"))
      assertTrue(AttemptCooldown.allowed(restored, 30_100L))
    }
  }
  @Test fun fallbackProcessIdentityNeverSkipsWaitAndMaximumIsBounded() {
    val restored = AttemptCooldown.restore(AttemptCooldown.State(20, 999_999_999L, "unknown-process-1"), 50L, "unknown-process-2")
    assertEquals(900_050L, restored.untilElapsed)
    assertTrue(AttemptCooldown.allowed(restored, 900_050L))
    assertEquals(20, AttemptCooldown.failed(restored, 900_050L, "unknown-process-2").count)
    assertEquals(0L, AttemptCooldown.delayMillis(4))
    assertEquals(30_000L, AttemptCooldown.delayMillis(5))
    assertEquals(900_000L, AttemptCooldown.delayMillis(20))
  }
}
