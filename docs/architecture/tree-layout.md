# Tree layout

The family tree is a layered DAG laid out with a **column branch contract** per connected component.

1. `projectFamilyGraph` emits person nodes, union nodes, and `person → union` / `union → child` edges.
2. `computeTreeLayout` assigns generations, then runs **column branch layout** on each disconnected component.
3. Person `y` is `generation * (PERSON_H + ROW_GAP)`.
4. Person `x` comes from a single post-order pass:
   - Build a `Branch` forest (`buildBranchForest`).
   - `layoutColumnForest`: pack each branch subtree bottom-up, separate cousin columns with `FAMILY_GAP` at every generation, center parents over their own children.
   - `applyJoinParentPlacement`: cross-family join rows (scenarios 1–8) override generic centering where needed.
   - Union dots sit at the parent midpoint, halfway between the parent row and the child row.
5. Disconnected components are shelf-packed with `COMPONENT_GAP`.

Layout is **async** (worker when available), keyed by a structural fingerprint so display-only draft edits patch card labels without re-running layout.

Drawing stays in `FamilyCanvas` (person cards, union dots, bezier stems/bonds).

Constants: `PERSON_W=208`, `PERSON_H=92`, `NODE_GAP=44`, `SIBLING_GAP=36`, `FAMILY_GAP=100`, `ROW_GAP=112`.
