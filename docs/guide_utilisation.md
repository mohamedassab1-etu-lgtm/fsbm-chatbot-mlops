# Guide d'Utilisation : Assistant Conversationnel FSBM

L'Assistant Conversationnel FSBM est une plateforme intelligente conçue pour aider les étudiants et le personnel à naviguer dans les données académiques et administratives de la Faculté des Sciences Ben M'Sik.

## 1. Accès et Authentification

Pour accéder à l'assistant, naviguez vers l'URL de l'application (ex: `http://localhost:3000` en local).

* **Connexion :** Cliquez sur le bouton "Sign in" situé en haut à droite ou dans la barre latérale. L'authentification utilise exclusivement votre compte Google (Google OAuth).


* **Privilèges Étudiants :** Si vous vous connectez avec une adresse institutionnelle officielle se terminant par `@etu.univh2c.ma`, l'interface vous reconnaîtra comme étudiant légitime et un badge bleu "FSBM Student" apparaîtra sur votre avatar.



## 2. L'Interface Principale

L'interface web se divise en deux zones principales : le panneau latéral (Sidebar) et la zone de chat.

* **Panneau latéral (Sidebar) :** Permet de démarrer une "New chat", de rechercher dans vos anciennes conversations ("Search chats"), et d'accéder aux paramètres ("Settings"). Vous y trouverez également l'historique de vos sessions récentes.


* **Gestion des Conversations :** En cliquant sur les trois petits points `...` à côté d'une conversation dans l'historique, vous pouvez l'épingler (Pin) en haut de la liste, la renommer, ou la supprimer définitivement.


* **Paramètres :** Le menu Settings vous permet de basculer l'interface en mode Clair, Sombre ou Système, et de choisir la voix de lecture de l'IA (Masculine ou Féminine).



## 3. Discuter avec l'IA

La zone de saisie se trouve en bas de l'écran. Vous pouvez poser des questions en français, en anglais ou en arabe.

* **Saisie Textuelle :** Tapez votre question et appuyez sur Entrée. Le bouton "Stop" (carré noir) apparaît pendant la génération ; vous pouvez cliquer dessus à tout moment pour interrompre la réponse de l'IA si elle ne correspond pas à vos attentes.


* **Saisie Vocale (Dictée) :** Cliquez sur l'icône du microphone. Le système captera votre voix en affichant une animation d'ondes sonores (waveform) rouge, et transcrira vos paroles en texte. Cliquez à nouveau sur le micro pour arrêter la dictée et envoyer la question.


* **Navigation dans l'historique des prompts :** Si la zone de texte est vide, appuyez sur la flèche du haut (`↑`) de votre clavier pour faire défiler vos questions précédentes. Appuyez sur `Tab` pour insérer le texte sélectionné.



## 4. Actions sur les Messages

Chaque message (bulles utilisateur et IA) dispose de fonctionnalités interactives qui apparaissent au survol de la souris.

**Côté Utilisateur :**

* **Copier :** Copie le texte de votre question dans le presse-papiers.


* **Éditer (Edit prompt) :** Ouvre une zone de texte pour modifier votre question. En cliquant sur "Update", l'IA annulera la réponse précédente et en générera une nouvelle basée sur votre texte modifié.



**Côté Bot (IA) :**

* **Écouter (Listen) :** Cliquez sur l'icône "Play" (triangle) dans le menu "More" pour déclencher la synthèse vocale. Une barre de lecture apparaîtra : vous pourrez mettre en pause, avancer/reculer sur la barre de progression, ou télécharger le fichier `.mp3` généré. L'IA prononcera correctement les abréviations complexes et les adresses e-mails.


* **Évaluer (Like/Dislike) :** Utilisez le pouce en l'air ou le pouce vers le bas pour indiquer si la réponse était pertinente ou non.


* **Refaire (Redo) :** Cliquez sur l'icône de rafraîchissement pour forcer l'IA à regénérer entièrement une réponse à votre dernière question.


* **Signaler (Report) :** Si la réponse contient une erreur flagrante (hallucination) ou si les données semblent manquantes, cliquez sur le bouton "Report". Une fenêtre s'ouvrira vous permettant de cocher la raison (ex: "Wrong answer", "Information not exists") et d'ajouter un commentaire. Ces données sont transmises à l'équipe technique pour améliorer le système.



## 5. Recherche Avancée (Smart Search)

En cliquant sur "Search chats" dans le menu de gauche, vous accédez à l'interface de recherche plein texte.

* Tapez n'importe quel mot-clé (ex: "Professeur Bentaib" ou "Scolarité").


* Le système analysera instantanément tous vos historiques. Les résultats vous montreront à la fois le titre de la conversation concernée et un court extrait du message exact où le mot-clé a été utilisé, avec les termes recherchés surlignés en gras.
