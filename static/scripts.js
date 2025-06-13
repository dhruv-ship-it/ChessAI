var board,
  game = new Chess(),
  statusEl = $('#status'),
  fenEl = $('#fen'),
  pgnEl = $('#pgn');


// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
  if (game.game_over() === true ||
      (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
};

var onDrop = function(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });

  // illegal move
  if (move === null) return 'snapback';

  updateStatus();
  getResponseMove();
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
    board.position(game.fen());
};

// Utility: Map FEN piece letter to image filename
function getPieceImg(piece) {
    var base = '/static/libs/chessboard/img/chesspieces/wikipedia/';
    var color = (piece === piece.toUpperCase()) ? 'w' : 'b';
    var pieceLetter = piece.toUpperCase();
    return base + color + pieceLetter + '.png';
}

// Display captured pieces: defeated black pieces at white side (bottom), defeated white pieces at black side (top)
function displayCapturedRows() {
    var history = game.history({ verbose: true });
    var whiteCaptured = [];
    var blackCaptured = [];

    history.forEach(function(move) {
        if (move.captured) {
            if (move.color === 'w') {
                // White captured black piece
                blackCaptured.push(move.captured);
            } else {
                // Black captured white piece
                whiteCaptured.push(move.captured.toUpperCase());
            }
        }
    });

    // Render captured white pieces (defeated white, show at top/black side)
    var $capturedBlack = $('#captured-black');
    $capturedBlack.empty();
    whiteCaptured.forEach(function(piece) {
        $capturedBlack.append(
            '<img class="captured-piece-img" src="' + getPieceImg(piece) + '" alt="' + piece + '">'
        );
    });

    // Render captured black pieces (defeated black, show at bottom/white side)
    var $capturedWhite = $('#captured-white');
    $capturedWhite.empty();
    blackCaptured.forEach(function(piece) {
        $capturedWhite.append(
            '<img class="captured-piece-img" src="' + getPieceImg(piece) + '" alt="' + piece + '">'
        );
    });
}

var updateStatus = function() {
  var status = '';

  var moveColor = 'White';
  if (game.turn() === 'b') {
    moveColor = 'Black';
  }

  // Remove previous king-in-check highlight unless checkmate (handled below)
  if (!game.in_checkmate()) {
    $('.king-in-check').removeClass('king-in-check');
  }

  // checkmate?
  if (game.in_checkmate() === true) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';

    // Highlight the checkmated king permanently
    var turn = game.turn();
    var boardObj = board.position();
    var kingSquare = null;
    for (var sq in boardObj) {
      if (
        (turn === 'w' && boardObj[sq] === 'wK') ||
        (turn === 'b' && boardObj[sq] === 'bK')
      ) {
        kingSquare = sq;
        break;
      }
    }
    if (kingSquare) {
      $('.square-' + kingSquare).addClass('king-in-check');
    }
  }

  // draw?
  else if (game.in_draw() === true) {
    status = 'Game over, drawn position';
  }

  // game still on
  else {
    status = moveColor + ' to move';

    // check?
    if (game.in_check() === true) {
      status += ', ' + moveColor + ' is in check';

      // Highlight the king in check
      var turn = game.turn();
      var boardObj = board.position();
      var kingSquare = null;
      for (var sq in boardObj) {
        if (
          (turn === 'w' && boardObj[sq] === 'wK') ||
          (turn === 'b' && boardObj[sq] === 'bK')
        ) {
          kingSquare = sq;
          break;
        }
      }
      if (kingSquare) {
        $('.square-' + kingSquare).addClass('king-in-check');
      }
    }
  }

  setStatus(status);
  getLastCapture();
  createTable();
  updateScroll();
  displayCapturedRows();

  statusEl.html(status);
  fenEl.html(game.fen());
  pgnEl.html(game.pgn());
};

var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};

var randomResponse = function() {
    fen = game.fen()
    $.get($SCRIPT_ROOT + "/move/" + fen, function(data) {
        game.move(data, {sloppy: true});
        // board.position(game.fen());
        updateStatus();
    })
}

var getResponseMove = function() {
    var e = document.getElementById("sel1");
    var depth = e.options[e.selectedIndex].value;
    fen = game.fen()
    $.get($SCRIPT_ROOT + "/move/" + depth + "/" + fen, function(data) {
        game.move(data, {sloppy: true});
        updateStatus();
        // This is terrible and I should feel bad. Find some way to fix this properly.
        // The animations would stutter when moves were returned too quick, so I added a 100ms delay before the animation
        setTimeout(function(){ board.position(game.fen()); }, 100);
    })
}


// did this based on a stackoverflow answer
// http://stackoverflow.com/questions/29493624/cant-display-board-whereas-the-id-is-same-when-i-use-chessboard-js
setTimeout(function() {
    board = ChessBoard('board', cfg);
    // updateStatus();
}, 0);


var setPGN = function() {
  var table = document.getElementById("pgn");
  var pgn = game.pgn().split(" ");
  var move = pgn[pgn.length - 1];
}

var createTable = function() {

    var pgn = game.pgn().split(" ");
    var data = [];

    for (i = 0; i < pgn.length; i += 3) {
        var index = i / 3;
        data[index] = {};
        for (j = 0; j < 3; j++) {
            var label = "";
            if (j === 0) {
                label = "moveNumber";
            } else if (j === 1) {
                label = "whiteMove";
            } else if (j === 2) {
                label = "blackMove";
            }
            if (pgn.length > i + j) {
                data[index][label] = pgn[i + j];
            } else {
                data[index][label] = "";
            }
        }
    }

    $('#pgn tr').not(':first').remove();
    var html = '';
    for (var i = 0; i < data.length; i++) {
        html += '<tr><td>' + data[i].moveNumber + '</td><td>'
        + data[i].whiteMove + '</td><td>'
        + data[i].blackMove + '</td></tr>';
    }

    $('#pgn tr').first().after(html);
}

var updateScroll = function() {
    $('#moveTable').scrollTop($('#moveTable')[0].scrollHeight);
}

var setStatus = function(status) {
  document.getElementById("status").innerHTML = status;
}

var takeBack = function() {
    game.undo();
    if (game.turn() != "w") {
        game.undo();
    }
    board.position(game.fen());
    updateStatus();
}

var newGame = function() {
    game.reset();
    board.start();
    $('.king-in-check').removeClass('king-in-check');
    $('#captured-white').empty();
    $('#captured-black').empty();
    updateStatus();
}

var getCapturedPieces = function() {
    var history = game.history({ verbose: true });
    for (var i = 0; i < history.length; i++) {
        if ("captured" in history[i]) {
            console.log(history[i]["captured"]);
        }
    }
}

var getLastCapture = function() {
    var history = game.history({ verbose: true });
    var index = history.length - 1;

    if (history[index] != undefined && "captured" in history[index]) {
        console.log(history[index]["captured"]);
    }
}
