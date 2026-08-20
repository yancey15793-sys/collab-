# ADR-0006 — Extraction d'entités : Groq structuré avec repli heuristique

## Statut

Proposé.

## Contexte

Le brief interdit de considérer l'IA comme source de vérité (§22, §63), mais
n'interdit pas de l'utiliser comme outil d'extraction structurée (sortie
validée par Zod), ce qui est différent de "faire confiance" à une affirmation
IA sur les faits.

## Décision

Extraction d'entités nommées (Enrichment) via un appel Groq structuré
(JSON forcé, validé par Zod), avec repli automatique sur une heuristique
légère (gazetteer + détection de séquences capitalisées) si l'appel échoue,
timeout, ou retourne une sortie invalide.

## Raisons

- Un LLM est significativement plus précis qu'une heuristique regex pour la
  NER multilingue, sans dépendance à un modèle ML lourd auto-hébergé.
- Le repli garantit qu'une panne Groq (§35 — "une erreur Groq ne doit pas
  empêcher la lecture des articles") ne bloque jamais le pipeline : au pire,
  l'article reste enrichi avec des entités de moindre qualité, jamais sans
  entités du tout.
- La sortie extraite est un fait vérifiable (liste d'entités + position/texte
  source), pas une opinion ou un résumé — reste cohérent avec "l'IA n'est pas
  la source de vérité" appliqué aux _affirmations_, pas aux _outils_.

## Conséquences

- Coût et latence par article ingéré (appel Groq) — à surveiller ; possibilité
  de batcher plusieurs articles par requête en Phase 1.
- Les deux chemins (Groq / heuristique) doivent produire le même type
  `ArticleEntity[]`, testés indépendamment.
