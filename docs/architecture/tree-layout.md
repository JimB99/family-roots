# Tree layout

- Project people and spouse unions into layout nodes.
- ELK layered layout runs via `layout-client.ts` (sync fallback included).
- Disconnected components are packed left-to-right with a fixed gap.
- Manual offsets are stored on `Person.treeOffsetX` / `treeOffsetY`.
