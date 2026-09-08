# Kinship label sources

Kinship math uses a locale-agnostic `KinshipDescriptor` model (`src/domain/kinship/types.ts`). Human-readable labels are produced by locale modules and `getKinshipFormatter()` in `kinship-labels.ts`.

## English (en-GB) — `kinship-labels-en.ts`

House style retained from the original implementation:

- [ISOGG Wiki — Cousin](https://isogg.org/wiki/Cousin) — cousin degree and removal
- [Family Tree Magazine](https://familytreemagazine.com/) / [Legal Genealogist](https://legalgenealogist.com/) — grand-aunt, grandniece conventions

Examples: `grandaunt`, `1st cousin once removed`, `half-brother`.

## German (de-AT) — `kinship-labels-de-AT.ts`

Standard German genealogical vocabulary:

- [RzD Forschungshilfen Heft 2 — Verwandtschaftsbezeichnungen und -grade (PDF)](https://tng.rolandgen.de/documents/RzD-Forschungshilfen%20Heft%202%20-%20Verwandtschaftsbezeichnungen%20und%20-grade%20-%204.%20Fassung.pdf) — genealogical cousin degree; removed cousins phrased by generation
- [§ 1589 BGB Verwandtschaft](https://www.haufe.de/id/norm/buergerliches-gesetzbuch-1589-verwandtschaft-HI1049155_p1589.html) — legal degree (context only)
- [genealogie.info — Verwandtschaftsbeziehung](https://www.genealogie.info/index.php/verwandtschaftsbeziehung) — Halb-, Groß-, Schwieger- prefixes
- [Wikipedia — Verwandtschaftsbeziehung](https://de.wikipedia.org/wiki/Verwandtschaftsverh%C3%A4ltnis)

Conventions:

- Direct line: Mutter/Vater, Großmutter/Großvater, Urgroßmutter…
- Collateral: Onkel/Tante, Großonkel/Großtante, Neffe/Nichte
- Cousins: **Cousin/Cousine _n_. Grades**; removed: `in der _k_. Generation`
- In-laws: Schwiegermutter, Schwager, Schwägerin, etc.

## Spanish (es-ES) — `kinship-labels-es-ES.ts`

Hispanic genealogical vocabulary; avoids Anglo calques like “primo hermano una vez eliminado”:

- [FamilySearch Wiki (es) — Parentesco; consanguinidad y afinidad](https://www.familysearch.org/es/wiki/Parentesco;_Consanguinidad_y_afinidad)
- [Genealogía Hispana — ¿Cómo designamos a nuestros parientes?](https://www.genealogiahispana.com/primeros-pasos/como-designamos-a-nuestros-parientes/)
- [Sociedad Genealógica de México — removed generations analysis](https://genealogia.org.mx/el-sistema-de-computo-de-parentesco-colateral-un-analisis-de-las-generaciones-desplazadas-removed/)

Conventions:

- Standard terms: bisabuela, tío abuelo, primo hermano, primo segundo, sobrino, etc.
- Removed cousins: descriptive phrasing (e.g. **hijo/a de mi primo hermano**) rather than literal “once removed”
- In-laws: suegro/suegra, cuñado/cuñada, yerno/nuera

## Explain-relationship UI

Sentence templates live in `tree.json` under `explain.*` (e.g. `explain.fromTo`). The kinship label is inserted as `{label}` from the locale formatter.

## Tests

- `kinship-labels-en.test.ts`
- `kinship-labels-de-AT.test.ts`
- `kinship-labels-es-ES.test.ts`

Each mirrors core cases: direct line, collateral, cousins (including at least one removed case for ES/DE), siblings, in-laws.
