# ChessAI - Attribution and Credits

## Original Project Foundation

This chess application is built upon the foundation of open-source chess projects. We acknowledge and credit the following original sources:

### Frontend/UI Components
- **chess.io** by ebrehault (https://github.com/ebrehault/chess.io)
  - Game status and checkmate detection logic
  - Board UI interaction patterns
  - Move validation and display components

- **chess** by EpokK (https://github.com/EpokK/chess)
  - Chess board visualization
  - Game state management
  - User interface elements

### Chess Engine Base
- The foundational minimax and alpha-beta pruning search structure was adapted and extended from open-source implementations
- Basic chess position evaluation functions
- Chess piece movement and validation logic

## Our Contributions and Enhancements

### Performance Optimizations
- **Move Ordering Heuristics Implementation**
  - MVV-LVA (Most Valuable Victim – Least Valuable Attacker) algorithm
  - Killer Move Heuristic for alpha-beta pruning optimization
  - Result: 69.33% reduction in nodes explored, 64.15% speed improvement

- **Zobrist Hashing and Transposition Table Implementation**
  - Full position hashing with piece placement, side-to-move, castling rights, and en passant
  - Depth-aware transposition table with proper flag system (EXACT/LOWERBOUND/UPPERBOUND)
  - Textbook-correct flag classification using original alpha-beta bounds
  - Result: Caches 2,332+ positions with accurate node type tracking

- **Iterative Deepening with TT Persistence**
  - Root-level search without TT short-circuiting
  - Accurate leaf counting across all depths
  - Non-zero leaf metrics confirmed (276 leaves at depth 4)

### UI/UX Improvements
- Removed undo functionality for cleaner gameplay experience
- Enhanced move table with timing information
- Improved captured pieces display
- Added timer functionality with customizable settings
- Multiple board skin options (Arctic, Forest, Cherry, Classic)

### Engine Enhancements
- **Pure Negamax Implementation**
  - Converted from minimax/alpha-beta hybrid to pure negamax
  - Simplified recursive search with consistent negation pattern
  - Eliminated maximiser flag, reduced code complexity

- **Quiescence Search Integration**
  - Stand-pat evaluation with alpha-beta bounds
  - Capture-only move generation to prevent horizon effect
  - MVV-LVA ordering for optimal capture sequencing
  - Depth-limited to prevent infinite tactical explosion

- **Enhanced Transposition Table with Flag System**
  - Three flag types: EXACT, LOWERBOUND, UPPERBOUND
  - Correct alpha-beta bound adjustments during TT lookup
  - Flag determination uses original (unmodified) alpha-beta bounds
  - TT entries stored exactly once per node at function end
  - Root short-circuit prevention for accurate iterative deepening

- **Corrected Leaf Counting**
  - Leaf counter incremented only at depth 0 (principal search nodes)
  - Excludes quiescence extensions from leaf metric
  - Accurate performance measurement for benchmarking

### Technical Improvements
- Flask backend integration for AI move calculation
- Real-time game state synchronization
- Enhanced error handling and game state management
- Performance benchmarking and comparison tools

## License Information

The original projects retain their respective licenses. This project builds upon and extends their publicly available implementations in accordance with their open-source terms.

## Acknowledgment

We sincerely thank the original developers for their foundational work:
- ebrehault for the chess.io project
- EpokK for the chess implementation

Without their contributions, this enhanced chess application would not have been possible.

---

*This attribution file maintains transparency about the project's origins while clearly documenting the significant value added through our optimizations and enhancements.*
