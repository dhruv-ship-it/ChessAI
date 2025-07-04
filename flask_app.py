from flask import Flask, render_template
from chess_engine import *

app = Flask(__name__)

@app.route('/')
def index():
    return render_template("index.html")


@app.route('/move/<int:depth>/<algo>/<path:fen>/')
def get_move(depth, algo, fen):
    print(depth, algo)
    print("Calculating...")
    engine = Engine(fen)
    move = ""
    if algo == "minimax":
        move = engine.calculate_minimax(depth - 1)
    else:
        move = engine.iterative_deepening(depth - 1)
    print("Move found!", move)
    print()
    return move


@app.route('/test/<string:tester>')
def test_get(tester):
    return tester


if __name__ == '__main__':
    app.run(debug=True)