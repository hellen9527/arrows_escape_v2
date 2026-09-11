# 4.0 production interpretation and verification

The D1 cards are design briefs, not a claim of competitor-level human calibration. The implementation translates them into `scripts/authoring/contracts.mjs`: distinct roles, physical blocking edges, transitive physical relations, key/lock identity, strict target membership, empty exit corridors, gap/body contacts, optional regions and selected mid-level release witnesses. Every accepted layout is fixed offline data. Runtime does not reroll a board on retries or generate a new difficulty for a particular player.

## Clarifications made during production

- C059: a Q-side branch that blocks the P/Q common inner gate is shared in the complete target closure; “private” described its apparent side, not its true membership.
- C060 and all star relays: target blocking is one-way, never a mutually locked target cycle.
- C090: the board has six windows; two can remain unrelated. Required work cannot simultaneously cover all six windows.
- C097: A locks Q, preserving the Q-private prerequisite. Applying the generic A→P default would contradict that membership.
- C108: the unlocked X directly blocks P; its own predecessor Y carries A. This resolves the original sentence's ambiguous subject.
- C144 and C150: R shares the prerequisites of the locked arrows/keys, not automatically the locked arrows/keys themselves.
- C149: P carries B and opens A; A locks a Q predecessor. A must not lock P, which would create a cycle.
- C169: the two blocker bodies intersect the same forward ray of Q, even when their tips extend toward different wings.
- C178: B acts through a lock on A's predecessor. Physical and permission effects remain distinct.
- C203: a predecessor U is common to X and key B. The card does not force X itself before B.
- C235: the three incoming branches are spatially separate but all become P/Q/R prerequisites through X; they are not strict private target branches.
- C257: R sharing Q's later branch also makes that branch's earlier root shared by all three stars.
- C269/C300: target relay expands ancestors' masks. Use compatible PQ and QR sets instead of forcing all three strict pair masks into a contradictory relay.
- C286: introduce a third ordinary role W for the third pairwise set. X is a common ancestor of the three pair pivots; all three pairs and the full shared set remain present.
- C291: an internal corridor leads to the shared ancestor of two independent key branches. Key carriers may have either insertion ID order; acyclicity is checked on the combined physical and permission graph, and solutions use topological traversal. The old insertion-ID shortcut excluded valid layouts.
- C295: after P/Q finish, R's still-unremoved prerequisites can only be shared among R's remaining branches, not be predecessors of already completed P/Q.

Macro-layout names are compositions, not copied competitor coordinates. The numerical stage ranges and slack are our production candidates, not published Lessmore parameters. A preserved empty corridor is used for internal entrances; the role binds to that actual arrow. Some cards deliberately apply a familiar relation in a clearer or differently organized layout.

## Validation boundaries

Unit tests replay complete physical/key solutions, goal solutions, exact move budgets, three-heart failure, undo, hints and save migration. The separate audit re-derives physical and permission graphs from the real engine, verifies role bindings and strict masks, records selected state transitions and screens graph fingerprints for suspected duplicates. Fingerprint differences are not a proof that players experience every board as unique.

Mobile browser checks assess view bounds, touch/drag separation, stage access, tutorial return, reload, failures and marked-arrow readability at the available zoom levels. These checks cannot replace a sample of novice and experienced players on their actual phones. No retention, enjoyment, completion-rate or subjective difficulty claim is inferred from automated solving. Those measurements remain calibration work after the playable release.
