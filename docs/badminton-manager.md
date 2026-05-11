# Badminton Manager — Spécification V1.1

> Ce document décrit le module Badminton Manager à implémenter en V1.1.
> En V1, le composant `BadmintonManagerStep` affiche uniquement un placeholder.
> **Aucune modification du routing ou du store n'est nécessaire pour l'implémenter.**

---

## Règles métier d'une rencontre

Une rencontre IC standard comporte **8 matchs** :

| Code  | Tableau            |
|-------|--------------------|
| SH1   | Simple Homme 1     |
| SH2   | Simple Homme 2     |
| SD1   | Simple Dame 1      |
| SD2   | Simple Dame 2      |
| DH    | Double Homme       |
| DD    | Double Dame        |
| DMx1  | Double Mixte 1     |
| DMx2  | Double Mixte 2     |

**Contraintes** :
- Un joueur peut apparaître au **maximum 2 fois** dans la compo type
- Contraintes de genre par poste (SH → homme, SD → femme, DH → 2H, DD → 2F, DMx → 1H+1F)
- **Effectif minimum** : 4H + 4F

---

## Restrictions par niveau du proposant

Déterminé par `getPlayerLevel()` dans `lib/eligibility.ts` :

| Niveau          | Équipes accessibles                    |
|-----------------|----------------------------------------|
| Départemental   | PR, D1, D2, D3, D4, D5, D6            |
| Régional+       | N2, PN, R1, R2, PR                    |

---

## Flow Badminton Manager (remplace le placeholder `BadmintonManagerStep`)

### Étape 1 : Choix de l'équipe
- Afficher uniquement les équipes cochées à l'écran 9 (ou celles autorisées par niveau)
- Si une seule équipe → sélection automatique

### Étape 2 : Constitution de l'effectif
- `<PlayerSearch />` avec filtre équipe + résolution des conflits d'affectation
- Compteur H/F en temps réel (objectif ≥ 4H + 4F)
- Appel `validateRoster()` de `lib/lineup-rules.ts`

### Étape 3 : Compo type
- 8 cases cliquables (SH1, SH2, SD1, SD2, DH, DD, DMx1, DMx2)
- Drag & drop ou tap pour affecter un joueur de l'effectif
- Validation en temps réel : `validateLineup()`
- Remplaçants (non obligatoires)

### Étape 4 : Itération sur d'autres équipes
- Retour à l'étape 1 avec les joueurs déjà affectés marqués comme indisponibles
- `getAvailablePlayersForTeam()` filtre les joueurs déjà utilisés

---

## Données stockées

```ts
// responses.bm_assignments (jsonb)
{
  "R1": {
    roster: ["uuid-1", "uuid-2", "..."],
    lineup: {
      "SH1": "uuid-1",
      "SH2": "uuid-2",
      "SD1": "uuid-3",
      "SD2": "uuid-4",
      "DH":  ["uuid-1", "uuid-2"],
      "DD":  ["uuid-3", "uuid-4"],
      "DMx1": ["uuid-1", "uuid-3"],
      "DMx2": ["uuid-2", "uuid-4"]
    }
  }
}
```

---

## Stats admin V1.1 (`/admin/bm-stats`)

Pour chaque joueur :
- Dans combien de compos il a été placé
- Dans quelles équipes
- À quels postes

Pour chaque équipe :
- Les 8 joueurs les plus souvent affectés
- Heatmap poste × joueur

---

## Fichiers à modifier en V1.1

| Fichier | Action |
|---------|--------|
| `components/flow/steps/BadmintonManagerStep.tsx` | Remplacer le placeholder par le flow complet |
| `lib/lineup-rules.ts` | Implémenter `validateRoster`, `validateLineup`, `getAvailablePlayersForTeam` |
| `app/admin/bm-stats/page.tsx` | Implémenter les stats |
| `stores/questionnaire.ts` | Typer plus précisément `BmAssignments` (déjà prévu dans le store) |

**Aucun changement de routing nécessaire** — le step `badminton-manager` est déjà dans `flowSteps`.
