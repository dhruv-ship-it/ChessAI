var board,
  game = new Chess(),
  statusEl = $('#status'),
  fenEl = $('#fen'),
  pgnEl = $('#pgn');


// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
  // Prevent move if timeout/game ended
  if (timerEnded) {
    return false;
  }
  if (game.game_over() === true ||
      (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
};

var onDrop = function(source, target) {
  // Prevent move if timeout/game ended
  if (timerEnded) {
    return 'snapback';
  }
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });

  // illegal move
  if (move === null) return 'snapback';

  // Start timer only after white's first move
  if (!timerStarted) {
      if (move.color === 'w') {
          timerStarted = true;
          startTimerFor('b');
          // Start game timer on first white move
          startGameTimer();
      }
  } else {
      // Normal timer switching
      startTimerFor(game.turn());
  }

  // Do NOT call updateStatus() here!
  // updateStatus();
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

// Timer logic
var timerSeconds = 60;
var timerWhite = timerSeconds;
var timerBlack = timerSeconds;
var timerInterval = null;
var timerActive = null; // 'w' or 'b'
var timerEnded = false;
var timerStarted = false; // <-- NEW: track if timer has started

function resetTimers(seconds) {
    timerWhite = seconds;
    timerBlack = seconds;
    timerEnded = false;
    timerStarted = false;
    timerActive = null; // <-- Add this line to ensure no timer is active
    clearInterval(timerInterval); // <-- Stop any running timer
    updateTimerDisplays();
}

function updateTimerDisplays() {
    $('#countdown-white').text(timerWhite);
    $('#countdown-black').text(timerBlack);
    $('#countdown-white').removeClass('timer-active timer-ended');
    $('#countdown-black').removeClass('timer-active timer-ended');
    if (timerEnded) {
        if (timerActive === 'w') {
            $('#countdown-white').addClass('timer-ended');
        } else if (timerActive === 'b') {
            $('#countdown-black').addClass('timer-ended');
        }
    } else {
        if (timerActive === 'w') {
            $('#countdown-white').addClass('timer-active');
        } else if (timerActive === 'b') {
            $('#countdown-black').addClass('timer-active');
        }
    }
}

function startTimerFor(turn) {
    clearInterval(timerInterval);
    timerActive = turn;
    updateTimerDisplays();
    if (timerEnded) return;
    timerInterval = setInterval(function() {
        if (timerEnded) {
            clearInterval(timerInterval);
            return;
        }
        if (timerActive === 'w') {
            timerWhite--;
            if (timerWhite <= 0) {
                timerWhite = 0;
                timerEnded = true;
                updateTimerDisplays();
                declareTimeoutWinner('b');
                clearInterval(timerInterval);
                return;
            }
        } else if (timerActive === 'b') {
            timerBlack--;
            if (timerBlack <= 0) {
                timerBlack = 0;
                timerEnded = true;
                updateTimerDisplays();
                declareTimeoutWinner('w');
                clearInterval(timerInterval);
                return;
            }
        }
        updateTimerDisplays();
    }, 1000);
}

function declareTimeoutWinner(winnerColor) {
    var winner = winnerColor === 'w' ? 'White' : 'Black';
    setStatus('Time out! ' + winner + ' wins.');
    timerEnded = true;
    stopTimers();
    stopGameTimer(); // <-- Already present, but keep for clarity
    // Disable board interaction after timeout
    if (board && typeof board.draggable === "function") {
        board.draggable = false;
    }
    if (board && board.widget && typeof board.widget === "object") {
        board.widget.draggable = false;
    }
    // Ensure game timer is stopped after timeout
    stopGameTimer();
}

// Game timer logic
var gameTimerInterval = null;
var gameTimerSeconds = 0;

function resetGameTimer() {
    clearInterval(gameTimerInterval);
    gameTimerSeconds = 0;
    updateGameTimerDisplay();
}

function startGameTimer() {
    clearInterval(gameTimerInterval);
    // Only start if not ended
    if (timerEnded) return;
    gameTimerInterval = setInterval(function() {
        // Stop if timeout or game over
        if (timerEnded || game.game_over()) {
            clearInterval(gameTimerInterval);
            return;
        }
        gameTimerSeconds++;
        updateGameTimerDisplay();
    }, 1000);
}

function stopGameTimer() {
    clearInterval(gameTimerInterval);
}

function updateGameTimerDisplay() {
    var min = Math.floor(gameTimerSeconds / 60);
    var sec = gameTimerSeconds % 60;
    var str = min + ':' + (sec < 10 ? '0' : '') + sec;
    $('#countup-game').text(str);
}

// Handle timer input and set button
$(document).ready(function() {
    $('#setTimerBtn').on('click', function() {
        var val = parseInt($('#timerInput').val(), 10);
        if (isNaN(val) || val < 1) val = 60;
        timerSeconds = val;
        // Always start a new game when timer is updated
        newGame();
    });
    // Initialize timers on page load
    resetTimers(timerSeconds);
    updateTimerDisplays();
    resetGameTimer();
    updateGameTimerDisplay();
    // Do NOT start timer here; wait for first white move
});

var updateStatus = function() {
  var status = '';

  var moveColor = 'White';
  if (game.turn() === 'b') {
    moveColor = 'Black';
  }

  // Remove previous king-in-check highlight unless checkmate (handled below)
  $('.king-in-check').removeClass('king-in-check');
  $('.square-king-in-check').removeClass('square-king-in-check');

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
      $('.square-' + kingSquare).addClass('king-in-check square-king-in-check');
    }
    // Stop game timer and both player timers on checkmate
    stopTimers();
    stopGameTimer();
  }

  // draw?
  else if (game.in_draw() === true) {
    status = 'Game over, drawn position';
    // Stop all timers on draw as well
    stopTimers();
    stopGameTimer();
  }

  // game still on
  else {
    status = moveColor + ' To Move';

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
        $('.square-' + kingSquare).addClass('king-in-check square-king-in-check');
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

  // Timer logic: only run timer if started and not ended
  if (game.game_over() || timerEnded) {
      stopTimers();
      stopGameTimer(); // <-- Stop game timer on game over or timeout
  } else if (timerStarted) {
      startTimerFor(game.turn());
  } else {
      stopTimers();
  }
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
    // Prevent computer move after timeout
    if (timerEnded) return;
    var e = document.getElementById("sel1");
    var depth = e.options[e.selectedIndex].value;
    fen = game.fen()
    $.get($SCRIPT_ROOT + "/move/" + depth + "/" + fen, function(data) {
        if (timerEnded) return; // Prevent move if timeout occurred during request
        game.move(data, {sloppy: true});
        setTimeout(function(){
            board.position(game.fen());
            updateStatus();
        }, 100);
    })
}

// Add this utility if not already present
function stopTimers() {
    clearInterval(timerInterval);
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
    if (timerEnded) return; // Prevent takeback after timeout
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
    resetTimers(timerSeconds); // <-- This now ensures timer does NOT start automatically
    resetGameTimer();
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
