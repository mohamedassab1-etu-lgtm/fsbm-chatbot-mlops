Voici une documentation technique exhaustive et détaillée pour le frontend web du projet (dossier `website/`). Ce document couvre l'architecture, la base de données, les routes d'API internes, les composants React, et la logique métier (Hooks) de l'application Next.js.

---

# Documentation Technique : Frontend (Next.js) - Assistant Conversationnel FSBM

## Table des Matières

1. [Vue d'Ensemble et Stack Technologique](https://www.google.com/search?q=%25231-vue-densemble-et-stack-technologique&utm_source=gemini)
2. [Modélisation des Données (Prisma ORM)](https://www.google.com/search?q=%25232-mod%25C3%25A9lisation-des-donn%25C3%25A9es-prisma-orm&utm_source=gemini)
3. [Architecture de l'API Interne (Routes Next.js)](https://www.google.com/search?q=%25233-architecture-de-lapi-interne-routes-nextjs&utm_source=gemini)
4. [Logique Métier et Hooks Personnalisés](https://www.google.com/search?q=%25234-logique-m%25C3%25A9tier-et-hooks-personnalis%25C3%25A9s&utm_source=gemini)
5. [Pages et Interface Utilisateur (UI)](https://www.google.com/search?q=%25235-pages-et-interface-utilisateur-ui&utm_source=gemini)
6. [Composants Clés](https://www.google.com/search?q=%25236-composants-cl%25C3%25A9s&utm_source=gemini)
7. [Gestion Globale de l'État (Contextes)](https://www.google.com/search?q=%25237-gestion-globale-de-l%25C3%25A9tat-contextes&utm_source=gemini)

---

## 1. Vue d'Ensemble et Stack Technologique

Le sous-projet `website` contient l'interface utilisateur de l'Assistant Conversationnel FSBM. Il est conçu pour offrir une expérience fluide, en temps réel et multimodale (texte et voix) aux étudiants.

* **Framework Core :** Next.js (App Router `src/app`)
* **Langage :** TypeScript strict
* **Styling :** Tailwind CSS (`globals.css` avec support natif du mode sombre)
* **Base de Données & ORM :** MySQL/MariaDB avec Prisma (`@prisma/client`, `@prisma/adapter-mariadb`)
* **Authentification :** NextAuth.js (v4) avec Google OAuth
* **Synthèse Vocale (TTS) :** `msedge-tts` (Microsoft Edge Neural Voices)
* **Reconnaissance Vocale (STT) :** Web Speech API native du navigateur
* **Streaming :** Server-Sent Events (SSE) pour l'affichage token-par-token.

---

## 2. Modélisation des Données (Prisma ORM)

La base de données est gérée par Prisma (`schema.prisma`). Elle stocke non seulement les sessions utilisateurs, mais aussi l'historique complet des discussions pour le RAG.

### Modèles Principaux :

* **`User`** : Étendu par NextAuth. Contient l'email, le nom, l'avatar, mais aussi les préférences de l'application (`theme` par défaut à "system", `voice` par défaut à "male").
* **`Conversation`** : Représente une session de chat. Liée à un utilisateur. Possède un `title` (généré par l'IA), un booléen `isPinned` pour épingler les favoris, et des timestamps de mise à jour.
* **`Message`** : Lié à une conversation. Stocke le `text`, l'expéditeur (`sender`: "user" ou "bot"), les retours utilisateurs (`feedback`: "like"/"dislike"), et un état `isStopped` (si l'utilisateur a interrompu la génération).
* **`Report`** : Table de collecte pour le MLOps. Stocke les signalements de bugs (ex: "Wrong answer"), le texte explicatif de l'utilisateur, et relie l'incident au message et à la conversation exacts.

---

## 3. Architecture de l'API Interne (Routes Next.js)

Le frontend expose sa propre API REST sous `src/app/api/` pour dialoguer avec Prisma et jouer le rôle de proxy (BFF - Backend For Frontend) avec le moteur Python LLM.

### 3.1. Authentification (`/api/auth/[...nextauth]`)

* **Provider :** Google.
* **Logique Métier :** Lors de la connexion, le callback `session` vérifie si l'email se termine par `@etu.univh2c.ma`. Si oui, un flag `isStudent = true` est injecté dans la session pour afficher le badge étudiant officiel sur l'interface.
* **Proxy Dynamique :** Un wrapper personnalisé intercepte la requête pour forcer le `NEXTAUTH_URL` dynamiquement via les headers `x-forwarded-host`, ce qui permet au système de fonctionner derrière des proxys (comme Ngrok) sans casser la redirection OAuth.

### 3.2. Moteur de Chat (`/api/chat`)

* **Rôle :** Proxy de streaming. Reçoit la question du front et la transfère au backend Python (`http://backend:8000/api/chat`).
* **Streaming :** Ne met pas la réponse en mémoire tampon. Transfère le `ReadableStream` du backend Python directement au navigateur client avec le header `text/event-stream`, permettant l'effet machine à écrire (SSE).

### 3.3. Gestion des Conversations (`/api/conversations/*`)

Endpoints CRUD pour la gestion de l'historique :

* **GET `/api/conversations` :** Récupère la liste des chats de l'utilisateur avec pagination (`skip`, `take`), triés par épinglage (`isPinned`) puis par date (`updatedAt`).
* **GET `/api/conversations/[id]` :** Charge une conversation et ses messages (paginés, avec inversion de l'ordre pour un affichage chronologique dans l'UI).
* **PATCH `/api/conversations/[id]` :** Renomme la conversation ou modifie son statut épinglé.
* **PATCH `/api/conversations/[id]/messages/[messageId]` :** Met à jour un message spécifique (utilisé pour enregistrer les "likes", les "dislikes", ou quand l'utilisateur "édite" son prompt).

### 3.4. Recherche Avancée (`/api/search`)

* **Rôle :** Moteur de recherche plein texte sécurisé.
* **Logique de Score :** Parcourt les titres de conversations et le contenu des messages. Ajoute +2 points si le mot clé est dans le titre, et +1 par message correspondant.
* **Snippets :** Calcule dynamiquement un extrait de texte (snippet) encadrant le mot-clé trouvé (± 40 caractères) pour l'afficher dans les résultats de recherche.

### 3.5. Synthèse Vocale (`/api/tts`)

* **Rôle :** Convertit le texte du LLM en fichier MP3 côté serveur. Force le runtime `nodejs`.
* **Prétraitement (`normalizeForSpeech`) :** Utilise des expressions régulières (Regex) puissantes pour "nettoyer" le texte avant la synthèse :
* Les adresses emails sont épelées (ex: `@` devient `arobase`, `.` devient `point`).
* Les abréviations (Pr., Dr., Mlle.) sont expansées (Professeur, Docteur) pour que l'IA ne fasse pas de pause anormale sur les points finaux.


* **Voix Neuronales :** Sélectionne dynamiquement `fr-FR-RemyMultilingualNeural` (homme) ou `fr-FR-DeniseNeural` (femme) selon les préférences utilisateur. Bufferise le fichier complet avant de l'envoyer au frontend.

---

## 4. Logique Métier et Hooks Personnalisés

Dossier `src/hooks/`.

### 4.1. `useChat.ts`

Cœur de la logique conversationnelle et du dialogue avec l'API.

* **Gestion du Streaming :** Utilise `fetch` pour lire le flux `/api/chat`. Décode l'UTF-8 via `TextDecoder`, parse les fragments JSON (SSE) et concatène le texte dans l'état React pour animer les bulles.
* **Annulation (AbortController) :** Le bouton `Stop` déclenche un `abort()`, ce qui coupe la connexion HTTP. Le hook envoie ensuite silencieusement une requête PATCH pour taguer le message en base de données avec `isStopped: true`.
* **Régénération (`regenerateMessage`) :** Si l'utilisateur clique sur "Redo", le hook efface le contenu du bot en BDD, relance la requête au LLM avec le prompt précédent, et met à jour l'ID du message avec le nouveau retourné par la base.
* **Génération de Titre :** Tourne en tâche de fond (`generateUniqueTitle`). Évite les doublons en passant une liste d'exceptions (`exception_titles`) au backend Python si le titre généré existe déjà.

### 4.2. `useAudioPlayer.ts`

Gère la lecture des MP3 générés par `/api/tts`.

* **Cache :** Utilise un `Map` (URL.createObjectURL) pour éviter de rappeler l'API TTS si l'utilisateur réécoute le même message avec la même voix.
* **Waveform Animation :** Intercepte la sortie audio via l'API Web Audio (`AudioContext`, `AnalyserNode`), calcule la moyenne des fréquences sur 7 bandes, et met à jour l'état à 60 FPS (via `requestAnimationFrame`) pour animer les barres visuelles.
* **Contrôles :** Expose les fonctions `playFromUrl`, `toggleSpeechPause`, `seekSpeech` (pour la barre de progression spatiale) et `closeSpeech`.

### 4.3. `useSpeechRecognition.ts`

Gère le micro (Speech-To-Text).

* Utilise l'API native `webkitSpeechRecognition`.
* Mode continu et résultats intermédiaires activés. Passe les mots en direct au `ChatInput` pour que l'utilisateur voie ce qu'il dicte avant la validation finale.

---

## 5. Pages et Interface Utilisateur (UI)

Dossier `src/app/`.

### 5.1. Landing Page (`page.tsx`)

* Page d'accueil publique.
* **Contenu :** Affiche une héro-section dynamique, les logos de la FSBM, les informations de contact extraites des données de la faculté (doyen, téléphone, mail, départements).
* **Authentification :** Bouton conditionnel "Sign in" (Google) qui se transforme en avatar utilisateur cliquable (Sign out) une fois connecté.

### 5.2. Interface de Chat (`chat/[[...chatId]]/page.tsx`)

* Le cœur de l'application. Layout en grille divisé entre la `Sidebar` (gauche) et le conteneur principal des messages (droite).
* **Auto-Scroll Intelligent :**
* La référence `shouldAutoScrollRef` est évaluée au scroll.
* Si l'utilisateur remonte manuellement pour lire l'historique, l'autoscroll est désactivé.
* Lors d'un changement de conversation, le scroll se positionne automatiquement sur le *dernier message envoyé par l'utilisateur*, laissant le message de l'IA bien visible en dessous.


* **Gestion des modales :** Orchestre l'ouverture des menus contextuels (More, Edit, Report).

### 5.3. Interface de Recherche (`search/page.tsx`)

* Implémente une recherche avec un délai (Debounce de 300ms) pour ne pas surcharger l'API pendant la frappe.
* Surligne dynamiquement les correspondances textuelles via le sous-composant `HighlightMatch` (découpage du string via Regex insensible à la casse).

---

## 6. Composants Clés

Dossier `src/components/`.

### 6.1. `MessageBubble.tsx`

Un composant extrêmement riche visuellement et fonctionnellement :

* Affiche un style différent selon l'expéditeur (bulles grises pour l'utilisateur, texte aligné à gauche pour le bot).
* **Édition :** Contient un `textarea` caché qui se déploie si l'utilisateur clique sur le bouton "Edit prompt". Permet de modifier un vieux message et de forcer une regénération.
* **Barre d'Action :** Apparaît au survol (hover) du message. Contient : Copier, Écouter, Like, Dislike, Refaire (Redo), Signaler (Report).
* **Indicateurs :** Affiche un loader clignotant ("Thinking...") lorsque la requête est en cours, un badge rouge "Reported" si l'utilisateur a signalé le message, et un séparateur "You stopped this response" si la génération a été interrompue.

### 6.2. `ChatInput.tsx`

* **Auto-resize :** Utilise un élément `<span>` caché pour calculer la largeur et la hauteur réelles du texte, ce qui permet à la zone de texte de grandir avec le contenu (jusqu'à 246px de hauteur maximale).
* **Historique des Prompts :** Intercepte les touches `ArrowUp` et `ArrowDown`. Si la zone de texte est vide, il navigue dans le tableau `userMessages`, affiche une prévisualisation grisée et permet d'insérer le texte en appuyant sur `Tab`.
* **Microphone :** Affiche une "pilule" flottante (UI) avec le canvas du waveform du micro et le texte intercepté (`interimTranscript`) pendant la dictée.

### 6.3. `Sidebar.tsx`

* Composant de navigation (tiroir coulissant).
* **Settings Modal :** Modale interne gérant les préférences stockées en BDD (Thème: System/Light/Dark, Voice: Male/Female) via requêtes PATCH à `/api/settings`.
* **Gestion des Listes :** Gère la liste infinie des conversations (Lazy loading au scroll bas), les actions de renommage avec validations (empêche de renommer avec un nom déjà existant) et le système d'épinglage.

### 6.4. `ReportModal.tsx`

* Composant UI affiché par-dessus le chat.
* Fournit une liste de tags de diagnostic rapides (`"Wrong answer"`, `"Information not exists"`) et un champ texte de 500 caractères. Met à jour l'UI en direct (`markAsReported`) dès la soumission réussie.

---

## 7. Gestion Globale de l'État (Contextes)

Dossier `src/context/`.

* **`ThemeContext.tsx` :**
* Gère l'application de la classe CSS `dark` sur l'élément `<html>`.
* Écoute les changements natifs du système d'exploitation via `window.matchMedia('(prefers-color-scheme: dark)')` si réglé sur "system".
* Synchronise silencieusement le choix de l'utilisateur avec la base de données Prisma pour que le thème persiste entre les appareils.


* **`SidebarContext.tsx` :**
* Gère l'état d'ouverture/fermeture de la barre latérale (`isSidebarOpen`) afin que le composant `ChatInput` puisse ajuster sa largeur dynamiquement pour rester parfaitement centré dans l'espace disponible.
