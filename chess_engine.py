import chess 
import random
import signal
import time
import cProfile

class Engine:

    def __init__(self, fen):
        self.board = chess.Board()
        self.MAX_DEPTH = 60
        self.piece_values = {
            # pawn
            1:100,
            # bishop
            2:310,
            # knight
            3:300,
            # rook
            4:500,
            # queen
            5:900,
            # king
            6:99999
        }
        self.square_table = square_table = {
            1: [
                0, 0, 0, 0, 0, 0, 0, 0,
                50, 50, 50, 50, 50, 50, 50, 50,
                10, 10, 20, 30, 30, 20, 10, 10,
                5, 5, 10, 25, 25, 10, 5, 5,
                0, 0, 0, 20, 20, 0, 0, 0,
                5, -5, -10, 0, 0, -10, -5, 5,
                5, 10, 10, -20, -20, 10, 10, 5,
                0, 0, 0, 0, 0, 0, 0, 0
            ],
            2: [
                -50, -40, -30, -30, -30, -30, -40, -50,
                -40, -20, 0, 0, 0, 0, -20, -40,
                -30, 0, 10, 15, 15, 10, 0, -30,
                -30, 5, 15, 20, 20, 15, 5, -30,
                -30, 0, 15, 20, 20, 15, 0, -30,
                -30, 5, 10, 15, 15, 10, 5, -30,
                -40, -20, 0, 5, 5, 0, -20, -40,
                -50, -40, -30, -30, -30, -30, -40, -50,
            ],
            3: [
                -20, -10, -10, -10, -10, -10, -10, -20,
                -10, 0, 0, 0, 0, 0, 0, -10,
                -10, 0, 5, 10, 10, 5, 0, -10,
                -10, 5, 5, 10, 10, 5, 5, -10,
                -10, 0, 10, 10, 10, 10, 0, -10,
                -10, 10, 10, 10, 10, 10, 10, -10,
                -10, 5, 0, 0, 0, 0, 5, -10,
                -20, -10, -10, -10, -10, -10, -10, -20,
            ],
            4: [
                0, 0, 0, 0, 0, 0, 0, 0,
                5, 10, 10, 10, 10, 10, 10, 5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                -5, 0, 0, 0, 0, 0, 0, -5,
                0, 0, 0, 5, 5, 0, 0, 0
            ],
            5: [
                -20, -10, -10, -5, -5, -10, -10, -20,
                -10, 0, 0, 0, 0, 0, 0, -10,
                -10, 0, 5, 5, 5, 5, 0, -10,
                -5, 0, 5, 5, 5, 5, 0, -5,
                0, 0, 5, 5, 5, 5, 0, -5,
                -10, 5, 5, 5, 5, 5, 0, -10,
                -10, 0, 5, 0, 0, 0, 0, -10,
                -20, -10, -10, -5, -5, -10, -10, -20
            ],
            6: [
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -20, -30, -30, -40, -40, -30, -30, -20,
                -10, -20, -20, -20, -20, -20, -20, -10,
                20, 20, 0, 0, 0, 0, 20, 20,
                20, 30, 10, 0, 0, 10, 30, 20
            ]
        }
        self.board.set_fen(fen)
        self.leaves_reached = 0
        self.killer_moves = {}  # Store killer moves per depth


    def random_response(self):
        response = random.choice(list(self.board.legal_moves))
        return str(response)


    def material_eval(self):
        score = 0
        # iterate through the pieces
        for i in range(1, 7):
            score += len(self.board.pieces(i, chess.WHITE)) * self.piece_values[i]
            score -= len(self.board.pieces(i, chess.BLACK)) * self.piece_values[i]

        return score


    def position_eval(self):
        score = 0
        # iterate through the pieces
        for i in range(1, 7):
            # eval white pieces
            w_squares = self.board.pieces(i, chess.WHITE)
            score += len(w_squares) * self.piece_values[i]
            for square in w_squares:
                score += self.square_table[i][-square]

            b_squares = self.board.pieces(i, chess.BLACK)
            score -= len(b_squares) * self.piece_values[i]
            for square in b_squares:
                score -= self.square_table[i][square]

        return score



    def minimax(self, depth, move, maximiser):
        if depth == 0:
            # return move, self.material_eval()
            return move, self.position_eval()

        if maximiser:
            best_move = None
            best_score = -9999

            moves = list(self.board.legal_moves)

            for move in moves:
                self.leaves_reached += 1
                self.board.push(move)
                new_move, new_score = self.minimax(depth - 1, move, False)
                if new_score > best_score:
                    best_score, best_move = new_score, move
                self.board.pop()

            return best_move, best_score

        if not maximiser:
            best_move = None
            best_score = 9999

            moves = list(self.board.legal_moves)

            for move in moves:
                self.leaves_reached += 1
                self.board.push(move)
                new_move, new_score = self.minimax(depth - 1, move, True)
                if new_score < best_score:
                    best_score, best_move = new_score, move
                self.board.pop()

            return best_move, best_score


    def alpha_beta(self, depth_neg, depth_pos, move, alpha, beta, prev_moves, maximiser):

        move_sequence = []

        # check if we're at the final search depth
        if depth_neg == 0:
            # return move, self.material_eval()
            move_sequence.append(move)
            return move_sequence, self.position_eval()


        moves = self.order_moves_with_heuristics(depth_neg)

        # if there are no legal moves, check for checkmate / stalemate
        if not moves:
            if self.board.is_checkmate():
                if self.board.result() == "1-0":
                    move_sequence.append(move)
                    return move_sequence, 1000000
                elif self.board.result() == "0-1":
                    move_sequence.append(move)
                    return move_sequence, -1000000
            else:
                move_sequence.append(move)
                return move_sequence, 0

        # initialise best move variables. What are these used for again? I need to simplify the logic here.
        best_move = None
        best_score = -10000001 if maximiser else 10000001

        # put the last calculated best move in first place of the list. Hopefully this improves pruning.
        if prev_moves and len(prev_moves) >= depth_neg:
            if depth_neg == 4 and not self.board.turn:
                print(prev_moves[depth_neg - 1])
            if prev_moves[depth_neg - 1] in moves:
            # if prev_moves[depth_neg - 1] in self.board.legal_moves:
                # if not self.board.turn:
                #     print(prev_moves[depth_neg - 1])
                moves.insert(0, prev_moves[depth_neg - 1])


        if maximiser:
            for move in moves:
                self.leaves_reached += 1

                # get score of the new move, record what it is
                self.board.push(move)
                new_sequence, new_score = self.alpha_beta(depth_neg - 1, depth_pos + 1, move, alpha, beta, prev_moves, False)
                self.board.pop()

                # Check whether the new score is better than the best score. If so, replace the best score.
                if new_score > best_score:
                    move_sequence = new_sequence
                    best_score, best_move = new_score, move

                # Check whether the new score is better than the beta. If it is, return and break the loop.
                # Need to rethink the check against best here.
                if new_score >= beta:
                    # Store killer move for this depth
                    if depth_neg not in self.killer_moves:
                        self.killer_moves[depth_neg] = []
                    if move not in self.killer_moves[depth_neg]:
                        self.killer_moves[depth_neg].append(move)
                        # Keep only top 2 killer moves per depth
                        if len(self.killer_moves[depth_neg]) > 2:
                            self.killer_moves[depth_neg].pop(0)
                    
                    # self.check_against_best(best_move, best_score, depth_pos, True)
                    move_sequence.append(best_move)
                    return move_sequence, best_score
                # Update alpha - upper bound
                if new_score > alpha:
                    alpha = new_score
            # return the best of the results
            # self.check_against_best(best_move, best_score, depth_pos, True)
            move_sequence.append(best_move)
            return move_sequence, best_score

        if not maximiser:
            for move in moves:
                self.leaves_reached += 1

                # get score of the new move, record what it is
                self.board.push(move)
                new_sequence, new_score = self.alpha_beta(depth_neg - 1, depth_pos + 1, move, alpha, beta, prev_moves, True)
                self.board.pop()

                # Check whether the new score is better than the best score. If so, replace the best score.
                if new_score < best_score:
                    move_sequence = new_sequence
                    best_score, best_move = new_score, move

                # Check whether the new score is better than the alpha. If it is, return and break the loop
                if new_score <= alpha:
                    # Store killer move for this depth
                    if depth_neg not in self.killer_moves:
                        self.killer_moves[depth_neg] = []
                    if move not in self.killer_moves[depth_neg]:
                        self.killer_moves[depth_neg].append(move)
                        # Keep only top 2 killer moves per depth
                        if len(self.killer_moves[depth_neg]) > 2:
                            self.killer_moves[depth_neg].pop(0)
                    
                    # self.check_against_best(best_move, best_score, depth_pos, False)
                    move_sequence.append(best_move)
                    return move_sequence, best_score

                # update beta - lower bound
                if new_score < beta:
                    beta = new_score

            # return the best of the results
            # self.check_against_best(best_move, best_score, depth_pos, False)
            move_sequence.append(best_move)
            return move_sequence, best_score

    def calculate_minimax(self, depth):
        maximiser = self.board.turn
        best_move, best_score = self.minimax(depth, None, maximiser)
        if best_move is None:
            return ""
        return str(best_move)


    def calculate_ab(self, depth):
        maximiser = self.board.turn

        move_sequence, best_score = self.alpha_beta(depth, 0, None, -10000001, 10000001, None, maximiser)
        for i in range(1, len(move_sequence)):
            print("move", move_sequence[-i])
        return str(move_sequence[-1])


    def total_leaves(self):
        leaves = self.leaves_reached
        self.leaves_reached = 0
        return leaves


    def order_moves(self):
        moves = list(self.board.legal_moves)
        scores = []
        for move in moves:
            self.board.push(move)
            # scores.append(self.material_eval())
            scores.append(self.material_eval())
            self.board.pop()
        sorted_indexes = sorted(range(len(scores)), key=lambda i: scores[i], reverse=False)
        return [moves[i] for i in sorted_indexes]

    def order_moves_with_heuristics(self, depth_neg):
        """
        Order moves using MVV-LVA and killer move heuristics for better alpha-beta pruning.
        """
        moves = list(self.board.legal_moves)
        scored_moves = []
        
        # Get killer moves for current depth
        killer_moves = self.killer_moves.get(depth_neg, [])
        
        for move in moves:
            score = 0
            
            # Killer move bonus - highest priority
            if move in killer_moves:
                score = 1000000  # Very high score for killer moves
            else:
                # MVV-LVA scoring for captures
                if self.board.is_capture(move):
                    victim_piece = self.board.piece_at(move.to_square)
                    attacker_piece = self.board.piece_at(move.from_square)
                    
                    if victim_piece and attacker_piece:
                        victim_value = self.piece_values[victim_piece.piece_type]
                        attacker_value = self.piece_values[attacker_piece.piece_type]
                        # MVV-LVA: (victim_value * 10) - attacker_value
                        score = (victim_value * 10) - attacker_value
                else:
                    # Non-captures get lower priority
                    score = 0
            
            scored_moves.append((move, score))
        
        # Sort by score in descending order (highest score first)
        scored_moves.sort(key=lambda x: x[1], reverse=True)
        
        # Return only the moves in sorted order
        return [move for move, score in scored_moves]


    def iterative_deepening(self, depth):
        # depth_neg, depth_pos, move, alpha, beta, prev_moves, maximiser)
        move_list, score  = self.alpha_beta(1, 0, None, -10000001, 10000001, None, self.board.turn)
        for i in range(2, depth + 1):
            print("Iteration", i)
            move_list, score = self.alpha_beta(i, 0, None, -10000001, 10000001, move_list, self.board.turn)
        print("Depth calculated:", len(move_list))
        return str(move_list[-1])


# This is being used for testing at the moment, which is why there is so much commented code.
# Will move to a standalone testing script when I get the chance.
if __name__=="__main__":

    fen = "r2qkbr1/ppp1pppp/2n1b2n/8/8/5P2/PPPP2PP/RNB1KBNR b KQq - 0 6"

    newengine = Engine(fen)


    # squares = newengine.board.pieces(1, chess.WHITE)
    # for square in squares:
    #     print (square)
    # print(squares)

    # print(newengine.board)
    # print(newengine.order_moves())

    # print(newengine.material_eval())
    # print(newengine.lazy_eval())

    # Test WITHOUT move ordering (temporarily disable heuristics)
    print("=== PERFORMANCE COMPARISON ===")
    print("Testing WITHOUT move ordering:")
    
    # Temporarily replace order_moves_with_heuristics to return unsorted moves
    original_order_method = newengine.order_moves_with_heuristics
    newengine.order_moves_with_heuristics = lambda depth: list(newengine.board.legal_moves)
    
    start_time = time.time()
    print("Move (no ordering):", newengine.calculate_ab(4))
    leaves_without_ordering = newengine.total_leaves()
    time_without_ordering = time.time() - start_time
    print(f"Leaves explored (no ordering): {leaves_without_ordering}")
    print(f"Time taken (no ordering): {time_without_ordering:.4f}s")
    print()
    
    # Restore move ordering
    newengine.order_moves_with_heuristics = original_order_method
    
    print("Testing WITH move ordering (MVV-LVA + Killer Moves):")
    start_time = time.time()
    print("Move (with ordering):", newengine.calculate_ab(4))
    leaves_with_ordering = newengine.total_leaves()
    time_with_ordering = time.time() - start_time
    print(f"Leaves explored (with ordering): {leaves_with_ordering}")
    print(f"Time taken (with ordering): {time_with_ordering:.4f}s")
    print()
    
    # Performance improvement
    if leaves_without_ordering > 0:
        improvement = ((leaves_without_ordering - leaves_with_ordering) / leaves_without_ordering) * 100
        print(f"=== PERFORMANCE IMPROVEMENT ===")
        print(f"Leaf reduction: {improvement:.2f}% ({leaves_without_ordering - leaves_with_ordering} fewer leaves)")
        print(f"Speed improvement: {((time_without_ordering - time_with_ordering) / time_without_ordering) * 100:.2f}%")
    print()

    start_time = time.time()
    print("Iterative deepening result:", newengine.iterative_deepening(4))
    print("Leaves explored (iterative deepening):", newengine.total_leaves())
    print("Time taken (iterative deepening):", time.time() - start_time)
    
    # Show killer moves statistics
    print(f"\nKiller moves stored: {len(newengine.killer_moves)} depths")
    for depth, killers in newengine.killer_moves.items():
        print(f"  Depth {depth}: {len(killers)} killer moves")
    
    # cProfile.run('newengine.calculate(3)')
    #
    # cProfile.run('newengine.calculate_ab(3)')


    # print(newengine.board)