# SpeseProfit con Android Studio

## Apertura sul computer attuale

1. Nella cartella SpeseProfit fai doppio clic su **Apri-Android-Studio.cmd**. Prepara i percorsi locali di SDK e Java e apre il progetto Android.
2. Attendi il completamento di **Gradle Sync**. Se Android Studio chiede di considerare attendibile il progetto, conferma soltanto per questa tua cartella.
3. Apri **Build Variants** e scegli **release** per il modulo **app**. Questa variante contiene il JavaScript e funziona senza Expo Go o server Metro.
4. Collega il telefono USB, sbloccalo, abilita Debug USB e autorizza il computer. Selezionalo nell'elenco dei dispositivi.
5. Seleziona la configurazione **app** e premi il triangolo **Run**. Android Studio compila, installa e apre l'app. La prima compilazione puo richiedere diversi minuti.

Puoi anche scegliere **Open** da Android Studio e aprire direttamente la cartella `SpeseProfit-App/android`, dopo aver eseguito `npm run prepare:studio`. Aprire soltanto la cartella principale TypeScript non equivale a importare il progetto Gradle Android.

Se Android Studio e gia aperto, il comando prepara i file ma lascia intatta la finestra esistente. Usa il progetto gia caricato oppure **File > Open > SpeseProfit-App/android > Nuova finestra**. Non sostituire un progetto che sta ancora sincronizzando Gradle.

### Errore «This method is forbidden on EDT» durante il cambio progetto

La traccia ricevuta passa da `AndroidOpenFileAction` alla chiusura del progetto e all'annullamento della sincronizzazione Gradle (`ExternalSystemResolveProjectTask.doCancel`), dove il componente dell'IDE chiama `getGradleJvmPath` sul thread dell'interfaccia. Questa eccezione riguarda quel percorso dell'IDE. Cambiare password, archivio o codice Kotlin dell'app non corregge quel passaggio.

Per riprendere:

1. Chiudi la finestra dell'errore e attendi la fine di Gradle Sync nella finestra gia aperta.
2. Se il progetto Android e gia caricato, usa quella finestra. Altrimenti apri `SpeseProfit-App/android` scegliendo **Nuova finestra**.
3. Se l'IDE continua a mostrare l'errore, salva i file, attendi la fine delle operazioni Gradle e riavvia Android Studio. Poi apri direttamente `SpeseProfit-App/android` dalla schermata iniziale.

Il comando di apertura rileva un'istanza Android Studio gia in esecuzione e mostra queste istruzioni invece di avviare un cambio automatico del progetto. Non chiude processi e non cancella cache, archivio o firma. La soluzione va confermata nell'interfaccia sul computer: la build Gradle completa e gia stata verificata, ma non dimostra la correzione di un errore interno dell'IDE.

La scelta della finestra per i progetti e descritta nella [documentazione JetBrains](https://www.jetbrains.com/help/idea/system-settings.html).

Per la prima prova dell'archivio scegli **Crea archivio protetto** e usa dati fittizi; i controlli completi sul telefono restano necessari.

### Errore del compilatore C++ con `cmake_pch.hxx.pch` mancante

Se la finestra C/C++ mostra `Compiler exited with error code 1` e il registro indica `unable to read PCH file`, Android Studio sta analizzando una configurazione debug che usa intestazioni precompilate non ancora generate. Il profilo Windows in `scripts/android-project.gradle` disabilita le intestazioni precompilate soltanto per debug, tramite `CMAKE_DISABLE_PRECOMPILE_HEADERS=ON`. La configurazione release mantiene questa ottimizzazione. La prima ricompilazione debug puo richiedere piu tempo.

Dopo questa modifica esegui **File > Sync Project with Gradle Files** e attendi il completamento. Se resta una vecchia segnalazione C/C++, riapri il progetto al termine della sincronizzazione. Per avviare l'app autonoma scegli **app / release** in **Build Variants**.

L'impostazione e supportata da [CMake](https://cmake.org/cmake/help/latest/variable/CMAKE_DISABLE_PRECOMPILE_HEADERS.html) e viene applicata anche dopo la rigenerazione Expo.

Verifica del 16 ottobre: rigenerazione CMake debug di Expo, Reanimated, Worklets e app riuscita (56 task, 3 minuti e 13 secondi), inclusa compilazione della libreria Worklets. Tutte le 260 unita di compilazione generate risultano prive di riferimenti PCH; preprocessore C++ eseguito con successo su un sorgente per ciascuno dei quattro moduli. Non equivale a una nuova build completa dell'APK debug o a una verifica dell'interfaccia IDE.

## Versione personale e sviluppo

| Variante | Identita Android | Comportamento |
|---|---|---|
| release | `it.speseprofit.personal` | Firma privata locale, archivio personale, JavaScript incluso, protezioni release |
| debug | `it.speseprofit.personal.dev` | App di sviluppo separata, firma debug, richiede server Metro |

Le due installazioni hanno archivi separati. La variante di sviluppo non sostituisce quella personale. La release usa la stessa chiave di firma privata del primo APK consegnato: un aggiornamento con la stessa firma conserva l'archivio. Non disinstallare per risolvere un conflitto di firma, perche perderesti i dati locali.

Per sviluppare con la variante **debug**, avvia dalla cartella SpeseProfit:

```powershell
npm start -- --localhost
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
```

Poi premi **Run** sul modulo app/debug. Il debug JavaScript resta nel server Metro; il codice Kotlin e le risorse native sono sotto Android Studio. Per la normale prova autonoma dell'archivio preferisci la variante release.

## Configurazione preparata

- Wrapper Gradle 9.3.1 e librerie Expo/React Native fissate dal progetto.
- JDK 17 per Gradle. Android Studio conserva il proprio runtime: non serve sostituirlo.
- SDK/target Android 36, Build Tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1.
- Architettura predefinita ARM64 per il telefono. Per un emulatore x86_64 occorre cambiare `reactNativeArchitectures` in `android/gradle.properties` oppure passare `-PreactNativeArchitectures=x86_64` al comando Gradle.
- Un worker, niente parallelismo Gradle, compilazione C++ serializzata e memoria Gradle limitata. Su Windows sono applicati automaticamente Ninja locale e percorsi C++ accorciati.
- Firma privata letta solo dalla configurazione Android in `work/signing`: password e chiave non sono inserite nel codice dell'app o nella configurazione Expo pubblica.

I file locali `android/local.properties`, `android/.gradle/config.properties` e `android/.idea/gradle.xml` sono esclusi dal controllo versione. Il comando di preparazione genera i percorsi per il computer corrente. Se le impostazioni IDE esistono gia, vengono conservate.

In caso di impostazioni IDE differenti, controlla **Settings > Build, Execution, Deployment > Build Tools > Gradle**:

- **Gradle JDK:** `GRADLE_LOCAL_JAVA_HOME`, configurato sul JDK 17 locale.
- **Gradle user home:** cartella `SpeseProfit-App/work/gradle-home`, per riutilizzare le dipendenze gia scaricate.
- Distribuzione Gradle: wrapper del progetto.

Riferimento per la distinzione tra runtime IDE e JDK Gradle: [documentazione Android](https://developer.android.com/build/jdks).

## Rigenerazione e APK

Il plugin Expo `plugins/withAndroidStudio.js` applica le impostazioni Gradle e collega `scripts/android-project.gradle` e `scripts/android-app.gradle`. La configurazione sopravvive a un nuovo prebuild: le personalizzazioni vanno conservate in questi file e nei moduli sotto `modules`, non soltanto nei file Android generati.

```powershell
npm run prebuild:android
npm run prepare:studio
```

La build release prodotta da Android Studio e firmata privatamente quando la chiave locale e disponibile. L'APK si trova in `android/app/build/outputs/apk/release/app-release.apk`. Per creare anche la consegna verificata usata dal comando **Installa-SpeseProfit.cmd**, esegui:

```powershell
.\scripts\package-android.ps1
```

La procedura completa da terminale rimane:

```powershell
.\scripts\build-android.ps1 -Target standalone -Architecture arm64-v8a
```

La chiave esistente di firma non viene sovrascritta. Se chiave e credenziali sono entrambe assenti, la preparazione puo generare una nuova identita di firma, che non permette di aggiornare un'app firmata con una chiave precedente. Questo materiale serve agli aggiornamenti e non recupera password o dati dell'archivio.

## Errore di avvio JavaScript e permesso schermo (16 ottobre 2026)

La variante debug deve passare esplicitamente `useDevSupport = BuildConfig.DEBUG` a `ExpoReactHostFactory.getDefaultReactHost`. Il valore predefinito della libreria usa il BuildConfig di React Native e, con le librerie precompilate installate, risultava falso anche per la nostra app debug: cercava quindi un bundle offline assente invece di usare Metro. La modifica e applicata dal plugin Expo e sopravvive al prebuild.

Sul telefono e stato inoltre riprodotto un arresto distinto della release: l'inizializzazione di expo-screen-capture registrava il callback Android 14, ma il manifest eliminava `DETECT_SCREEN_CAPTURE`. Rimossa questa esclusione; rimangono esclusi accesso a foto e memoria condivisa. Il permesso di rilevamento viene gestito all'installazione e non autorizza a catturare lo schermo: [documentazione Android](https://developer.android.com/about/versions/14/features/screenshot-detection). Il blocco tramite FLAG_SECURE e il controllo prima di mostrare l'interfaccia restano attivi.

L'app autonoma e denominata **SpeseProfit**; le nuove build debug sono denominate **SpeseProfit Dev**. Una precedente app di sviluppo gia installata puo ancora chiamarsi **SpeseProfit** finche non viene aggiornata. Le due varianti mantengono package e archivi separati.


## Protezione delle credenziali di firma

La password locale viene migrata a Windows DPAPI senza sostituire la chiave. Usa lo stesso utente Windows in Android Studio e nelle compilazioni; non stampare l’output interno -ForSigning. Vedi [Firma locale sul PC](FIRMA_LOCALE.md). La distribuzione HTTP è disattivata: installazione tramite Installa-SpeseProfit.cmd e USB.
