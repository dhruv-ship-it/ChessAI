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
  - Result: 58.36% reduction in nodes explored, 46.03% speed improvement

- **Zobrist Hashing and Transposition Table Implementation**
  - Full position hashing with piece placement, side-to-move, castling rights, and en passant
  - Depth-aware transposition table for position caching
  - Proper 4-bit castling rights mask construction
  - Result: 66.95% reduction in nodes explored, 61.7% speed improvement
  - Transposition table caches 1,563+ positions at depth 4

### UI/UX Improvements
- Removed undo functionality for cleaner gameplay experience
- Enhanced move table with timing information
- Improved captured pieces display
- Added timer functionality with customizable settings
- Multiple board skin options (Arctic, Forest, Cherry, Classic)

### Engine Enhancements
- Enhanced alpha-beta pruning with iterative deepening
- Improved position evaluation with piece-square tables
- Performance monitoring and validation system
- Algorithm selection (Alpha-Beta vs Minimax)
- **Advanced Zobrist-based transposition table**
  - Position caching with depth-aware reuse
  - Consistent hash lookup and storage
  - Safe None handling and error management

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
