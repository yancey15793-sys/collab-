# AI Pipeline

Groq est un **moteur de synthèse**, jamais la source de vérité. Contrat défini
en Phase 0 (`packages/ai`), implémentation en Phase 6.

## Pipeline de synthèse

```
structured data (Story + timeline + articles + entités)
  ↓ context builder (packages/ai — construit un contexte minimal et daté)
  ↓ Groq (prompt versionné, sortie JSON forcée)
  ↓ structured JSON
  ↓ validation Zod (aiSummaryContentSchema)
  ↓ persist (AI_SUMMARY, model + promptVersion)
  ↓ render (UI)
```

Toute réponse Groq qui échoue la validation Zod est **rejetée** (pas de
fallback silencieux vers du texte libre non structuré) ; l'erreur est
journalisée (`AiSynthesisError`) et l'UI affiche un état "synthèse
indisponible" plutôt qu'une fausse synthèse (règle §50 : ne jamais simuler une
intelligence inexistante).

## Sortie structurée

```ts
interface AiSummaryContent {
  headline: string;
  summary: string;
  keyPoints: string[];
  whatChanged: string | null;
  claims: Array<{
    text: string;
    confidence: 'CONFIRMED' | 'REPORTED' | 'UNCERTAIN' | 'DISPUTED';
    sourceArticleIds: string[];
  }>;
  sources: string[];
}
```

Chaque affirmation (`claim`) porte son niveau de certitude et ses articles
sources — l'IA ne doit jamais transformer une hypothèse en fait (règle §24).

## Prompts versionnés

`PROMPT_VERSION` (ex: `"story-summary-v1"`) stocké avec chaque `AI_SUMMARY`,
aux côtés de `model`. Permet de régénérer une synthèse avec un nouveau prompt
sans perdre l'historique, et sert de **clé de cache** : une synthèse
`(storyId, type, promptVersion)` déjà calculée n'est jamais régénérée
(contrainte unique en base — voir `packages/db/src/schema.ts`).

## Ask

```
question utilisateur
  ↓ identifier le sujet (extraction légère d'entités/mots-clés de la question)
  ↓ rechercher les Stories pertinentes (full-text search + filtre entités/topics)
  ↓ récupérer les sources et synthèses existantes de ces Stories
  ↓ construire un contexte borné (top N Stories, résumés + métadonnées sources)
  ↓ Groq (prompt "Ask", sortie JSON forcée : réponse + citations)
  ↓ validation Zod (askResponseSchema)
  ↓ réponse tracée : citedStoryIds + citedSourceIds toujours renvoyés
```

Aucune réponse Ask n'est affichée sans au moins une citation vérifiable, sauf
réponse explicite "je ne trouve pas d'information vérifiée sur ce sujet".

## Résilience

Un échec Groq (timeout, quota, réponse invalide) ne doit jamais empêcher la
lecture des articles ou de la Story elle-même — seule la synthèse IA est
indisponible, le reste du produit (timeline, sources, articles) fonctionne
normalement.
