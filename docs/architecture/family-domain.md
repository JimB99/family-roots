# Family domain

- `Person` and `Relationship` documents are stored in Firestore.
- `FamilyGraph` is a pure in-memory index built from people and relationships.
- Union nodes are layout-only and are never persisted.
- Connected components are diagnostics, not user-facing branches.

## Invariants

- No self-relationships
- No duplicate spouse or parent-child links
- No cross-family endpoints
- No ancestry cycles for parent-child links
- `familyId` is immutable on person and relationship updates
