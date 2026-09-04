# Tree layout

The family tree is a layered DAG laid out with ELK, then snapped to generation rows.

1. `projectFamilyGraph` emits person nodes, union nodes, and `person → union` / `union → child` edges.
2. `computeTreeLayout` assigns generations, then runs ELK **layered** on each disconnected component.
3. The ELK graph uses one node per person or **marriage chain** (spouses on the same generation share a container so they stay adjacent). Edges go from parent containers to child containers. Union dots are not ELK nodes.
4. After ELK returns x-coordinates:
   - Person `y` snaps to `generation * (PERSON_H + ROW_GAP)`.
   - Unions sit at the parent-midpoint, halfway between the parent row and the child row.
   - Pedigree-safe post-process (`packPedigreeRows`) orients couples toward natal siblings, nudges isolated parents, tightens natal holes that do not crush cousin spacing, and inserts `FAMILY_GAP` between cousin groups when their descendant sets do not overlap.
   - Globally empty x-bands collapse to `FAMILY_GAP`.
5. Disconnected components are shelf-packed with `COMPONENT_GAP`.

Layout is **async** (`elkjs` Promise). `TreeWorkspace` runs it in a web worker when available, keyed by a structural fingerprint so display-only draft edits patch card labels without re-running ELK. Interactive editing uses lower ELK thoroughness; export uses full quality.

Drawing stays in `FamilyCanvas` (person cards, union dots, bezier stems/bonds). ELK is not used for edge routing.

Constants: `PERSON_W=208`, `PERSON_H=92`, `NODE_GAP=44`, `SIBLING_GAP=36`, `FAMILY_GAP=100`, `ROW_GAP=112`.
