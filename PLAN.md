# Plan — Chess Engine Rebuild

> **ARCHIVED, 2026-10-10.** Work has moved to `D:\projects\Chess-engine`
> (repo name `Chess-engine`). That repo carries the live `PLAN.md`,
> `ENGINEERING_NOTES.md` and a `CLAUDE.md` with the decisions and ground rules.
> This repo is kept only as the audit subject — the broken engine the rebuild was
> diagnosed from. Do not develop here.

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

### What is actually carried over — not a clone

Clarified 2026-10-10. The new repo is **not** a fork or clone of this one. Concretely:

- **Piece values and piece-square tables: carried over as reference data.** These are not the
  original repo author's invention — they are Tomasz Michniewski's
  [Simplified Evaluation Function](https://www.chessprogramming.org/Simplified_Evaluation_Function),
  standard published tables from the Chess Programming Wiki. Using them is like using any
  standard constant table. (Michniewski's original purpose is a good fit here: he proposed
  that all engines under test share one simplistic evaluation so that *only search and
  efficiency* affect the result — which is exactly what the Phase 2 Elo harness measures.)
  Upgrade path later: [PeSTO's evaluation function](https://chessprogramming.org/PeSTO's_Evaluation_Function),
  which is tapered midgame/endgame.
- **The original `alpha_beta` function: not carried over.** It is written as minimax with a
  `maximiser` flag, has confused PV handling and a dubious `prev_moves` ordering hack, and
  carries the original author's own comment: *"What are these used for again? I need to
  simplify the logic here."* Clean negamax is roughly 100 lines and is written fresh.
- **Board representation, move generation and legality: `python-chess`**, as always. The
  project never implemented these.

So the amount of inherited *search code* is approximately zero. What carries over is standard
public evaluation data. This matters for how the work is described: it is an engine built on
`python-chess` using the standard Simplified Evaluation Function tables, not a modification
of someone else's engine.

### Consequence: this is a rebuild, not a repair

The four bugs in `ENGINEERING_NOTES.md` section 2.1 do not get "fixed" one by one, because
the code containing three of them is being discarded. The audit's value is **diagnostic** —
it tells us precisely what to get right the first time:

- Side-relative scores at every negamax leaf (the bug that broke the engine).
- `-MATE + ply` at mated nodes, never absolute.
- `table[square ^ 56]` for White — note this mirroring bug *was* inherited from the original
  and is the one genuine pre-existing defect.
- Tables validated as exactly 64 entries by a test, so corruption cannot recur silently.

**New repository.** Not a salvage of this one. This repo keeps committed `.swp` files, two
near-duplicate Flask apps, `index.html_orig`, stray files named `1` and `3`, no tests, no CI
and no `requirements.txt`, and its history would read "introduced bugs, then fixed my own
bugs." The engine is ported across; this repo is archived private.
**Repo name still to be chosen by the user — do not create it unprompted.**

## Are the features worth building? Yes — verified

Checked 2026-10-10, because the features being rebuilt are the same ones the agent commits
attempted. **The feature choices were correct; only the implementations were wrong.** These
are the standard, textbook components of a modern engine — iterative-deepening negamax with
alpha-beta, quiescence, a transposition table, null-move pruning and late-move reductions —
and their gains are documented:

| feature | reported gain |
|---|---|
| quiescence search | one engine went 1698 → 1937 Elo |
| transposition table (on top of the above) | 1937 → 1967 Elo |
| null-move pruning + a simple TT | ≈ +350 Elo (MinimalChess) |
| probing/storing the TT inside quiescence | +22.9 Elo |

Treat these as order-of-magnitude expectations, not targets — they are other people's engines
on other hardware. Phase 2 exists precisely so our own numbers are measured rather than
borrowed.

Comparable finished work, useful as a reference for scope and as proof this is a known-good
destination: [`MajdHail/chess-engine`](https://github.com/MajdHail/chess-engine) (Python:
alpha-beta, iterative deepening, TT, quiescence, null-move, LMR, PeSTO eval, UCI, difficulty
levels) and [`antoine-pz/pychess-engine-tipe`](https://github.com/antoine-pz/pychess-engine-tipe),
which evaluates its search optimisations via Bayeselo — i.e. the Phase 2 approach is
established practice, not something invented here.

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

**Correction, 2026-10-10.** An earlier version of this file said the narrative was "I
inherited a broken open-source engine." **That is false and must not be used.** The audit
established the opposite: the original at `38a8d68` scored 12/12 on tactics, found mate at
every depth, and had all six piece-square tables correct. It worked. The breakage was
introduced by the three agent-generated commits made in *this* repo
(`50533e5`, `5d0b77b`, `4f146de`).

The accurate history is: a working but naive alpha-beta engine, plus three standard
optimisations added on top that regressed its strength from 12/12 to 5/12.

**For the resume: do not narrate the history at all.** Resume bullets state outcomes, not
archaeology. Describe the engine as built.

**For an interview, if asked, the honest version is the stronger answer anyway:**

> "I added three standard search optimisations — move ordering, a transposition table and
> quiescence — and the engine got *weaker*. I built a perft suite and a tactical regression
> suite to find out why, and traced it to a minimax-to-negamax conversion that had kept
> absolute White-positive scores where negamax requires side-relative ones, so the engine
> would not play checkmate as White. I rebuilt the search from a clean base with the tests in
> place first, then measured each feature's contribution in Elo."

That is a *better* story than "I wrote a chess engine," because it demonstrates measurement
discipline, regression catching and root-cause analysis. Owning the regression is the point,
not a liability — shipping an optimisation that silently loses strength is an extremely
common real-world failure, and most candidates have no story about catching one.

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
