package it.speseprofit.nativebridge

import java.util.Base64
import org.junit.Assert.*
import org.junit.Test

class PasswordPolicyTest {
  @Test fun sharedSyntheticCasesMatchUiPolicy() {
    val source = requireNotNull(javaClass.getResourceAsStream("/password-policy.tsv"))
    val lines = source.bufferedReader(Charsets.UTF_8).use { it.readLines() }
    assertTrue(lines.size >= 19)
    for (line in lines) {
      val parts = line.split('\t')
      val raw = String(Base64.getDecoder().decode(parts[0]), Charsets.UTF_8)
      assertEquals(parts[2], parts[1] == "allow", PasswordPolicy.problem(raw) == null)
    }
  }
}
