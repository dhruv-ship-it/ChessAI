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

// Track move times and details
var moveTimes = [];
var lastMoveTimestamp = null;

// Utility to format seconds as hh:mm:ss
function formatTime(secs) {
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    var s = secs % 60;
    return (h > 0 ? h + ':' : '') +
           (h > 0 ? (m < 10 ? '0' : '') : '') + m + ':' +
           (s < 10 ? '0' : '') + s;
}

// Reset move times on new game
function resetMoveTimes() {
    moveTimes = [];
    lastMoveTimestamp = null;
}

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

  // Track move time for white
  var now = Date.now();
  if (lastMoveTimestamp === null) lastMoveTimestamp = now;
  var elapsed = Math.floor((now - lastMoveTimestamp) / 1000);
  lastMoveTimestamp = now;

  // Store move details for table
  var moveNum = Math.ceil(game.history().length / 2);
  if (!moveTimes[moveNum - 1]) moveTimes[moveNum - 1] = {};
  moveTimes[moveNum - 1].white = {
      from: move.from.toUpperCase(),
      to: move.to.toUpperCase(),
      san: move.san,
      time: elapsed
  };

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
    timerActive = null;
    clearInterval(timerInterval);
    updateTimerDisplays();
}

function updateTimerDisplays() {
    $('#countdown-white').text(formatTime(timerWhite));
    $('#countdown-black').text(formatTime(timerBlack));
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
        var val = $('#timerInput').val();
        var seconds = parseTimeInput(val);
        if (isNaN(seconds) || seconds < 1) seconds = 60;
        timerSeconds = seconds;
        newGame();
    });
    // Initialize timers on page load
    resetTimers(timerSeconds);
    updateTimerDisplays();
    resetGameTimer();
    updateGameTimerDisplay();
    // Set timer input display to hh:mm:ss format
    $('#countdown-white').text(formatTime(timerWhite));
    $('#countdown-black').text(formatTime(timerBlack));
    // Set default input value to 00:01:00 if empty
    if (!$('#timerInput').val()) $('#timerInput').val('00:01:00');
});

// Utility: Parse hh:mm:ss or mm:ss or ss to seconds
function parseTimeInput(str) {
    if (!str) return 60;
    var parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return 60;
    if (parts.length === 3) {
        // hh:mm:ss
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // mm:ss
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
        // ss
        return parts[0];
    }
    return 60;
}

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
    var algo = document.getElementById("algoSelect").value; // <-- Get selected algorithm
    fen = game.fen()
    var moveStart = Date.now();
    $.get($SCRIPT_ROOT + "/move/" + depth + "/" + algo + "/" + fen, function(data) {
        if (timerEnded) return; // Prevent move if timeout occurred during request
        var move = game.move(data, {sloppy: true});
        setTimeout(function(){
            board.position(game.fen());
            // Track move time for black
            var now = Date.now();
            var elapsed = Math.floor((now - lastMoveTimestamp) / 1000);
            lastMoveTimestamp = now;
            var moveNum = Math.ceil(game.history().length / 2);
            if (!moveTimes[moveNum - 1]) moveTimes[moveNum - 1] = {};
            if (move) {
                moveTimes[moveNum - 1].black = {
                    from: move.from.toUpperCase(),
                    to: move.to.toUpperCase(),
                    san: move.san,
                    time: elapsed
                };
            }
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
    // Use moveTimes to build the table
    $('#pgn tr').not(':first').remove();
    var html = '';
    for (var i = 0; i < moveTimes.length; i++) {
        var moveNum = i + 1;
        var white = moveTimes[i].white
            ? (white = moveTimes[i].white.from + '→' + moveTimes[i].white.to +
                (moveTimes[i].white.time !== undefined ? ' <span style="color:#888;font-size:0.95em;">(' + formatTime(moveTimes[i].white.time) + ')</span>' : ''))
            : '';
        var black = moveTimes[i].black
            ? (black = moveTimes[i].black.from + '→' + moveTimes[i].black.to +
                (moveTimes[i].black.time !== undefined ? ' <span style="color:#888;font-size:0.95em;">(' + formatTime(moveTimes[i].black.time) + ')</span>' : ''))
            : '';
        html += '<tr><td>' + moveNum + '</td><td>' + white + '</td><td>' + black + '</td></tr>';
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
    resetMoveTimes();
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
