# Mises à jour d’Intranuit réplicable

Ce document liste ce qui change d’une livraison à l’autre et explique comment mettre à jour une installation existante. La plus récente est en haut.

## Mettre à jour une installation existante

Vos données (comptes, dossiers, archives) restent dans votre base Firebase : une mise à jour ne remplace que le code du site.

1. **Sauvegarder** votre dépôt actuel, par exemple en téléchargeant son contenu depuis GitHub (bouton « Code » puis « Download ZIP »).
2. **Remplacer les fichiers** de votre dépôt par ceux de la nouvelle livraison, sauf ce qui vous est propre : `.env.local` s’il existe sur votre poste, et `base` dans `vite.config.js` si votre dépôt ne s’appelle pas `intranuit`. Les variables GitHub (Settings → Secrets and variables → Actions) ne changent pas.
3. **Règles Firestore** : à republier seulement si la section de la livraison l’indique (onglet Règles de Firestore, coller le contenu de `firestore.rules`, Publier).
4. **Publier** : envoyer les fichiers sur la branche `main`. Le workflow GitHub Pages reconstruit et met le site en ligne.
5. **Vérifier** : se connecter en joueur et en conteur, ouvrir un dossier d’un cycle passé et les archives. Recharger la page avec Ctrl + F5 si l’ancienne version reste affichée.

Aucune livraison listée ici ne demande de migration de données ni de nouvelle variable.

---

## 13 novembre 2026

**Règles Firestore : inchangées.** Aucune migration, aucune nouvelle variable.

**Atout Parangon (Ventrue) et lieutenant**
- Profil : case « Parangon » pour un personnage Ventrue, et fiche du lieutenant (nom, Ressources, Havre, Troupeau, une influence Gotha ou Pègre jusqu’à 3, une spécialité par point).
- Formulaire d’influences : « +1 action (Parangon) » affiché dans chaque influence que le personnage possède, et un bloc d’actions pour le lieutenant, avec ses propres spécialités.
- Les actions du lieutenant sont rangées dans le dossier du joueur, marquées « Lieutenant · nom » côté conteur et côté joueur ; le résumé du lieutenant est copié sur le dossier (les conteurs ne lisent pas les profils).
- Rumeurs : les usages du lieutenant sont cachés à son propre joueur, et son nom est masqué pour les autres.
- Le soutien gagne un champ facultatif « Influence soutenue ».

**Traces des actions ciblées dans les rumeurs**
- Une attaque, une obstruction, un soutien ou une défense apparaît par ce qu’il a visé (domaine de rumeurs obstrué ou « les 15 domaines », activité, influence soutenue ou attaquée), jamais par son auteur.
- Sans relecture d’un conteur, seuls les choix de listes sont diffusés, jamais un texte écrit par le joueur.

**Limites connues** : l’export Excel et le panneau de résolution ne distinguent pas encore les actions du lieutenant de celles du personnage joueur.

**Guide** : profil (atouts d’influence) et rumeurs (actions ciblées, lieutenant) mis à jour, HTML et PDF.

## 3 novembre 2026, livraison n° 2

**Règles Firestore : inchangées.**

- Les traces de rumeurs ne contiennent plus jamais le nom de l’action : le nom d’une action du catalogue trahissait le niveau de l’influence, que la règle ne révèle pas. Sans relecture, la formule neutre « Usage de l’influence » est diffusée.
- Les traces déjà relues et les tableaux déjà diffusés ne changent pas.

## 3 novembre 2026

**Règles Firestore : inchangées.**

- Période des rumeurs : le mois de la rumeur et les **deux mois joués** précédents. Un mois sans cycle (aucun dossier d’influence) ne compte pas. Exemple : octobre sauté, une rumeur de novembre couvre août, septembre et novembre.
- Les rumeurs de conteur s’appliquent si leur période recoupe un de ces mois.
- Texte du formulaire joueur et guide mis à jour.

## 31 octobre 2026

Première livraison réplicable.
