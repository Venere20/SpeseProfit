package it.speseprofit.nativebridge

import java.text.Normalizer
import java.util.Locale

internal object PasswordPolicy {
  fun problem(raw: String): String? {
    val value = Normalizer.normalize(raw, Normalizer.Form.NFC)
    if (value.codePointCount(0, value.length) !in 16..128) return "Usa da 16 a 128 caratteri. Spazi ammessi."
    val comparison = value.lowercase(Locale.ROOT).trim { it.isWhitespace() || it == '\uFEFF' }
    val banned = setOf("passwordpassword", "1234567890123456", "abcdefghijklmnop", "qwertyuiopasdfghj", "questa è soltanto una demo")
    if (comparison in banned || Regex("(?s)^(.{1,8})\\1+$").matches(value)) return "Questa password è troppo prevedibile."
    return null
  }
}
