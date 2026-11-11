# Intranuit réplicable

Version conservée du 3 novembre 2026 (livraison n° 2 du jour), indépendante des évolutions de l’instance d’origine.

## Ce que contient cette copie

Profils et personnages, AIP et bonus, influences Gotha/Pègre, rumeurs, PNJ, traitement conteur, dépenses, apprentissages et progressions, cycles, listes, archives et exports Excel. La suppression d’un compte bloque son accès et conserve ses dossiers pour les archives des conteurs.

Les modules Oracle/IA, intrigues et chronologie de l’Oracle, et gestion du contenu de la vitrine sont retirés des sources. Aucun appel au Worker de l’instance d’origine. Les lieux par défaut sont neutres et modifiables dans Régence → Réglages. Aucun compte ni dossier n’est préchargé.

## Installer sur GitHub Pages avec Firebase

Le guide illustré complet est fourni dans [docs/Guide-Intranuit.pdf](docs/Guide-Intranuit.pdf). Sa version HTML autonome se trouve dans [docs/guide-replication/Intranuit-presentation-et-installation.html](docs/guide-replication/Intranuit-presentation-et-installation.html).

1. Créer son projet Firebase Spark, son application Web, Authentication E-mail/Mot de passe et une base Firestore Standard (default) en mode production.
2. Publier le fichier firestore.rules fourni dans l’onglet Règles de Firestore.
3. Placer le contenu de ce dossier à la racine d’un nouveau dépôt GitHub, nommé intranuit de préférence. La branche attendue est main.
4. Dans Settings → Secrets and variables → Actions → Variables, recopier les neuf variables de .env.example, de VITE_FIREBASE_API_KEY à VITE_INSTANCE_CHRONICLE. Les deux options finales sont forcées à false par le workflow et cette compilation.
5. Dans Settings → Pages, choisir GitHub Actions. Le workflow est déjà fourni dans .github/workflows/deploy-pages.yml. Adapter base dans vite.config.js si le dépôt ne s’appelle pas intranuit.
6. Ajouter votre hôte GitHub Pages dans les domaines autorisés Authentication, sans protocole ni chemin.
7. Lancer le workflow, s’inscrire sur le site, puis nommer le premier administrateur dans Firestore : artifacts/VOTRE_VITE_APP_ID/users/UID_DU_COMPTE/profile/info, champ role = admin. Se reconnecter.
8. Renseigner ville/chronique, valider les autres comptes et effectuer la recette du guide avant ouverture.

VITE_FIREBASE_APP_ID est l’appId Firebase ; VITE_APP_ID est l’identifiant interne de la chronique. Ne pas changer ce dernier après saisie des données. Aucun secret de compte de service ni clé IA ne doit être ajouté aux variables VITE_, intégrées au navigateur. Les règles restent indispensables. Les envois de mails et l’installation sur téléphone réel restent à valider sur votre hébergement.

## Développement et vérification

Node 22 ou plus. Installer avec npm ci, copier .env.example vers .env.local, puis renseigner votre Firebase. npm run dev ouvre l’application sur http://localhost:5173/intranuit/. Cette commande utilise le Firebase configuré ; aucun jeu de démonstration n’est installé. npm run build refuse une configuration indispensable manquante. Ne pas diffuser un build de test.

npm test exécute les tests unitaires. npm run test:rules exécute les tests de sécurité sur un émulateur Firestore séparé, projet demo-intranuit et port 8085 ; Java 21 ou plus est nécessaire. Ils n’utilisent pas le Firebase de votre configuration.

La base Firebase et ses sauvegardes sont indépendantes du code GitHub. Un export Excel n’est pas une sauvegarde complète. Les comptes Firebase Auth et leur e-mail restent présents lors de la suppression dans l’application.

## Crédit et périmètre

© 2026 Swiiptz · Intranuit. Cette copie est préparée pour une autre association ; les modalités de redistribution publique restent à fixer avec l’auteur. Les PDF FCF confidentiels et les données de l’instance d’origine ne sont pas inclus.

La direction artistique et les règles du socle sont conservées. Quelques limites restent décrites dans le guide, notamment l’administration des couleurs et suppressions de conteurs sur téléphone, la validation narrative et la recette d’installation. Cette livraison ne constitue pas un déploiement.
