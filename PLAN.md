# Plan — Chess Engine Rebuild

**Decided 2026-10-09.** Supersedes the roadmap in `ENGINEERING_NOTES.md` section 7.
Read `ENGINEERING_NOTES.md` first for the audit evidence behind every decision here.

## Decision

**Option 1: engine only.** No LLM/agentic layer on this project.

Rejected, deliberately: an agentic/eval layer on top of chess. The domain is saturated
(7+ comparable repos, 7+ papers — `ENGINEERING_NOTES.md` section 13), no novelty is
available, and the agentic surface is shallow (one domain, a handful of trivial tools, one
loop). It would read as forced. An AI project will be built **separately**, in a domain that
actually fits — most likely a production RAG pipeline with an eval harness and documented
failure analysis, which was the highest-signal option in the research.

## Scope: what happens to the existing code

| component | fate | reason |
|---|---|---|
| UI work (timer, board skins, captured pieces, bootstrap) | **dropped** | Not going on the resume; 1366 lines of CSS and vendored chessboard.js are dead weight |
| Agent commits `50533e5`, `5d0b77b`, `4f146de` (MVV-LVA, Zobrist/TT, quiescence) | **implementations discarded, features rebuilt from scratch against tests** | The features are essential; the implementations are broken (5/12 tactics, won't mate as White) |
| Original base at `38a8d68` (piece-square tables, eval, working search) | **restored, then fixed** | Verified correct: 12/12 tactics, finds mate at every depth, all 6 tables correct |

We do **not** revert-and-stop. Plain alpha-beta with no ordering or TT is a textbook
exercise. Move ordering, transposition tables and quiescence are the substance of the
project and get rebuilt properly.

**New repository.** Not a salvage of this one. This repo keeps committed `.swp` files, two
near-duplicate Flask apps, `index.html_orig`, stray files named `1` and `3`, no tests, no CI
and no `requirements.txt`, and its history would read "introduced bugs, then fixed my own
bugs." The engine is ported across; this repo is archived private.
**Repo name still to be chosen by the user — do not create it unprompted.**

## Phases

Each phase is independently shippable and each produces a measured number.

### Phase 0 — correctness (1 session)
- Restore the six piece-square tables from `38a8d68`.
- Fix the negamax score convention: leaf eval must be side-relative
  (`eval if turn == WHITE else -eval`).
- Fix mate scoring: always `-MATE + ply` at a mated node, never absolute. Adds mate-distance
  so shorter mates are preferred.
- Fix White's table mirroring: `table[square ^ 56]`, not `table[-square]`.
- **`perft` suite** against published node counts for standard positions (Kiwipete et al.).
  This is the canonical correctness harness and the thing that closes this class of bug for
  good.
- Tactical regression suite (mate-in-N, free material, WAC subset) under `pytest`.
- CI running the suite on every push.
- Exit criterion: perft exact, tactics 12/12.

### Phase 1 — search, rebuilt (1-2 sessions)
- MVV-LVA, killer moves, history heuristic.
- Transposition table that **stores the best move** (the main reason to have one), bounded
  with a replacement policy, correct EXACT/LOWERBOUND/UPPERBOUND flags.
- **Truly incremental Zobrist** — XOR on make/unmake, O(1) per move. This was claimed in the
  old code but never done; the hash was recomputed from scratch at every node.
- Quiescence using real capture generation (`generate_legal_captures`), plus SEE and check
  evasions.
- PVS / null-window, aspiration windows, null-move pruning, late move reductions.
- Iterative deepening done correctly.
- Fix the capture-generation hot path (23 of 42 profiled seconds).
- **Time management**: search to a millisecond budget, not a fixed depth.
- Exit criterion: depth 6-7 within a sane time budget, up from depth 4 in 12.5s.

### Phase 2 — measurement (1 session)
- Benchmark over a **position set**, never one FEN. Report nodes/sec and depth-in-1s.
- **Elo harness**: version A vs version B, N games, Elo delta **with confidence intervals**.
- Per-feature attribution: what each search feature is actually worth in Elo.
- Exit criterion: a results table where every number has a committed script that reproduces
  it.

### Phase 3 — ship (1 session)
- UCI protocol, so it runs in Cute Chess / Arena.
- Lichess bot via `lichess-bot` — a public, externally verifiable rating.
- README as product spec: architecture diagram, results table, reproduction commands.

Total: roughly 4-5 working sessions, with the user's study running in parallel.

## Resume output: 2 bullets, not 3

Honest accounting. Fix-plus-tests alone is worth **1** bullet. The full build above is worth
**2**. Three would be padding.

> **Chess Engine | Python**
> - Rebuilt the search of an open-source alpha-beta engine — negamax with PVS, MVV-LVA and
>   killer-move ordering, incrementally-updated Zobrist transposition tables, and quiescence
>   with SEE — reaching depth *N* under a *T*ms budget at *M* nodes/s, a *K*x throughput gain
>   after profiling
> - Built the correctness and measurement infrastructure: a `perft` suite validating move
>   generation to *N* nodes, a tactical regression suite in CI, and a self-play harness
>   measuring each search feature's contribution in Elo with confidence intervals; shipped as
>   a UCI engine running as a public Lichess bot

The second bullet is the differentiating one. Everyone writes the first.

**Hard rule:** every italicised placeholder is filled only from a committed script's output,
and the README number must match. No repeat of the old "~50% / ~58% / 69.33%" inconsistency
across resume, commit message and `ATTRIBUTION.md`.

## Interview narrative

> "I inherited a broken open-source engine. I built a perft and tactical test suite to
> characterise the failures, traced them to a minimax-to-negamax conversion that had kept
> absolute scores where negamax requires side-relative ones, plus corrupted piece-square
> tables. Then I rebuilt the search properly and measured each feature's Elo contribution."

This is a debugging and measurement-discipline story, which is stronger than "I wrote a chess
engine." Provenance is not normally stated on a resume; `ATTRIBUTION.md` carries it in the
repo and the question gets a straight answer if asked.

## Study list for the user (3-4 days, parallel to implementation)

All covered by the Chess Programming Wiki.

1. Minimax to alpha-beta to negamax, and **score conventions** — the bug that broke this
   engine, so worth knowing cold.
2. Why move ordering multiplies pruning; MVV-LVA, killer moves, history heuristic.
3. Zobrist hashing, incremental XOR update, and why TT entries need
   EXACT/LOWERBOUND/UPPERBOUND flags.
4. Horizon effect, quiescence, stand-pat, SEE.
5. PVS, null-move pruning, late move reductions.
6. Why `perft` validates move generation.
7. Elo: the logistic model and where confidence intervals come from.

## Ground rules

- Correctness before performance. Perft and the tactical suite must pass before any pruning
  or ordering change lands — every bug found in the audit is the kind a node-count benchmark
  will happily report as an *improvement*.
- Never quote a benchmark from a single position.
- Every resume-eligible claim needs a committed, runnable script, and the README must agree
  with it.

## Status

- [x] Audit complete (`ENGINEERING_NOTES.md`)
- [x] Market research complete (`ENGINEERING_NOTES.md` sections 9-13)
- [x] Direction decided: Option 1, engine only
- [ ] New repo named and created — **blocked on the user**
- [ ] Phase 0
- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Separate AI project (RAG + evals), scoped later
