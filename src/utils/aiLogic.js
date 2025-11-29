import GameLogic from './gameLogic';

/**
 * AI Logic for Gemini Player
 * This file contains all AI decision-making logic
 */

const AILogic = {
  /**
   * Gemini API Configuration
   */
//   ! BLOCKING GEMINI as of Now
//   GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
//   GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

  /**
   * Call Gemini API to get ALL AI moves for this turn
   * @param {Object} gameState - Current game state
   * @returns {Promise<Array<{from: number, to: number}>>} - Array of moves to make
   */
  async getGeminiMoves(gameState) {
    const { dots, lines, polygons, movesLeft, currentPlayerIndex, players } = gameState;

    // ! UNCOMMENT WHEN USING GEMINI
    // console.log('🔮 Requesting', movesLeft, 'moves from Gemini');
    // console.log('🔑 API Key present:', !!this.GEMINI_API_KEY); // ADD THIS
    // console.log('🌐 API URL:', this.GEMINI_API_URL); // ADD THIS

    const prompt = this.buildPrompt(dots, lines, polygons, movesLeft, currentPlayerIndex, players);

    try {
      const response = await fetch(`${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Raw Gemini response:', data);
      
      const textResponse = data.candidates[0].content.parts[0].text;
      console.log('📄 Gemini text response:', textResponse);

      // Parse JSON array from response
      const moves = this.parseGeminiResponse(textResponse, movesLeft);
      console.log('✅ Parsed moves:', moves);

      // Validate all moves
      const validMoves = this.validateAndFilterMoves(moves, dots, lines);
      console.log('✅ Valid moves after filtering:', validMoves);

      if (validMoves.length === 0) {
        console.warn('⚠️ No valid moves from Gemini, using fallback');
        return this.getFallbackMoves(gameState);
      }

      return validMoves;

    } catch (error) {
      console.error('❌ Gemini API call failed:', error);
      // Fallback to rule-based AI
      return this.getFallbackMoves(gameState);
    }
  },

  /**
   * Build the prompt for Gemini - requesting multiple moves
   */
  buildPrompt(dots, lines, polygons, movesLeft, currentPlayerIndex, players) {
    const dotsInfo = dots.map(d => `{id: ${d.id}, x: ${Math.round(d.x)}, y: ${Math.round(d.y)}}`).join(', ');
    const linesInfo = lines.length > 0 
      ? lines.map(l => `{from: ${l.from}, to: ${l.to}, owner: ${l.ownerId}}`).join(', ')
      : 'None';
    const trianglesInfo = polygons.length > 0
      ? polygons.map(p => `{dots: [${p.points.map(pt => pt.id).join(', ')}], owner: ${p.ownerId}}`).join(', ')
      : 'None';

    const currentScores = players.map((p, idx) => 
      `${p.name}: ${polygons.filter(poly => poly.ownerId === idx).length}`
    ).join(', ');

    return `You are Gemini, an AI playing the game "Dot Hunter". This is a strategic game where players connect dots to form triangles.

GAME STATE:
- Dots on board: [${dotsInfo}]
- Existing lines: [${linesInfo}]
- Completed triangles: [${trianglesInfo}]
- Current scores: ${currentScores}
- You are Player ${currentPlayerIndex + 1}

YOUR TURN:
You have ${movesLeft} moves to make this turn. You must plan ALL ${movesLeft} moves strategically.

RULES (CRITICAL - violating these makes a move invalid):
1. Connect exactly 2 dots by their IDs
2. Cannot create a line that already exists
3. Cannot cross existing lines
4. Cannot pass through other dots (no dot should lie on your line)
5. Cannot create 4+ sided polygons
6. Each move adds a new line - consider how the board changes with each move
7. When you complete a triangle with a move, that triangle is scored

STRATEGY:
- Try to complete triangles (3 connected dots) to score points
- If you can complete multiple triangles in your ${movesLeft} moves, do so
- Set up for future triangles if you can't complete them now
- Block opponents when strategic
- IMPORTANT: Each move changes the board state. Your second move should consider the line added by your first move, and so on.

TASK:
Plan and return ALL ${movesLeft} moves as a JSON array. You MUST return ONLY valid JSON in this exact format (no markdown, no explanation, no extra text):

[
  {"from": <dot_id_1>, "to": <dot_id_2>},
  {"from": <dot_id_3>, "to": <dot_id_4>}
]

Example for 2 moves:
[{"from": 5, "to": 12}, {"from": 12, "to": 8}]

Example for 1 move:
[{"from": 0, "to": 3}]

Return exactly ${movesLeft} move(s):`;
  },

  /**
   * Parse Gemini's response to extract moves array
   */
  parseGeminiResponse(text, expectedMoves) {
    try {
      // Remove markdown code blocks if present
      let cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to find JSON array
      const jsonMatch = cleaned.match(/\[[^\]]+\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const moves = JSON.parse(cleaned);
      
      if (!Array.isArray(moves)) {
        // If single object returned, wrap in array
        if (typeof moves === 'object' && moves.from !== undefined && moves.to !== undefined) {
          return [moves];
        }
        throw new Error('Response is not an array');
      }

      // Validate each move has correct structure
      const validStructure = moves.every(move => 
        typeof move.from === 'number' && typeof move.to === 'number'
      );

      if (!validStructure) {
        throw new Error('Invalid move structure in array');
      }

      // Take only the number of moves requested (in case Gemini returns more/less)
      return moves.slice(0, expectedMoves);
      
    } catch (error) {
      console.error('❌ Failed to parse Gemini response:', text, error);
      throw error;
    }
  },

  /**
   * Validate moves and filter out invalid ones
   * This simulates the board state as moves are applied
   */
  validateAndFilterMoves(moves, dots, lines) {
    const validMoves = [];
    let currentLines = [...lines]; // Copy current lines

    for (const move of moves) {
      // Check if dots exist
      const fromDot = dots.find(d => d.id === move.from);
      const toDot = dots.find(d => d.id === move.to);

      if (!fromDot || !toDot || move.from === move.to) {
        console.warn('⚠️ Invalid dots in move:', move);
        continue;
      }

      // Check if line already exists (in current or previous moves)
      const exists = currentLines.some(l =>
        (l.from === move.from && l.to === move.to) ||
        (l.from === move.to && l.to === move.from)
      );

      if (exists) {
        console.warn('⚠️ Line already exists:', move);
        continue;
      }

      // Additional validation could be added here:
      // - Check intersections
      // - Check intermediate dots
      // - Check for 4+ polygons
      // For now, basic validation is enough

      validMoves.push(move);
      // Add this line to the simulated state for next move validation
      currentLines.push({ from: move.from, to: move.to });
    }

    return validMoves;
  },

  /**
   * Fallback rule-based AI - returns multiple moves
   */
  getFallbackMoves(gameState) {
    const { dots, lines, polygons, movesLeft } = gameState;
    const moves = [];
    let currentLines = [...lines];

    console.log('🎯 Using fallback AI for', movesLeft, 'moves');

    for (let i = 0; i < movesLeft; i++) {
      const move = this.findBestMove(dots, currentLines, polygons);
      if (move) {
        moves.push(move);
        // Add to simulated lines
        currentLines.push({ from: move.from, to: move.to });
      } else {
        console.warn('⚠️ No more valid moves available');
        break;
      }
    }

    return moves;
  },

  /**
   * Find a single best move using rule-based logic
   */
  findBestMove(dots, lines, polygons) {
    // Strategy 1: Try to complete a triangle
    const completingMove = this.findTriangleCompletingMove(dots, lines, polygons);
    if (completingMove) return completingMove;

    // Strategy 2: Make any valid move
    const anyMove = this.findAnyValidMove(dots, lines);
    if (anyMove) return anyMove;

    return null;
  },

  /**
   * Find a move that completes a triangle
   */
  findTriangleCompletingMove(dots, lines, polygons) {
    const scoredSet = new Set();
    polygons.forEach(tri => {
      const ids = tri.points.map(p => p.id).sort().join(',');
      scoredSet.add(ids);
    });

    // Check all possible triangles
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        for (let k = j + 1; k < dots.length; k++) {
          const d1 = dots[i];
          const d2 = dots[j];
          const d3 = dots[k];

          const triKey = [d1.id, d2.id, d3.id].sort().join(',');
          if (scoredSet.has(triKey)) continue;

          const edge1 = lines.some(l => 
            (l.from === d1.id && l.to === d2.id) || (l.from === d2.id && l.to === d1.id)
          );
          const edge2 = lines.some(l => 
            (l.from === d2.id && l.to === d3.id) || (l.from === d3.id && l.to === d2.id)
          );
          const edge3 = lines.some(l => 
            (l.from === d1.id && l.to === d3.id) || (l.from === d3.id && l.to === d1.id)
          );

          const existingEdges = [edge1, edge2, edge3].filter(Boolean).length;

          if (existingEdges === 2) {
            if (!edge1 && this.canAddLineSafely(d1, d2, dots, lines)) {
              return { from: d1.id, to: d2.id };
            }
            if (!edge2 && this.canAddLineSafely(d2, d3, dots, lines)) {
              return { from: d2.id, to: d3.id };
            }
            if (!edge3 && this.canAddLineSafely(d1, d3, dots, lines)) {
              return { from: d1.id, to: d3.id };
            }
          }
        }
      }
    }

    return null;
  },

  /**
   * Find any valid move
   */
  findAnyValidMove(dots, lines) {
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const d1 = dots[i];
        const d2 = dots[j];

        if (this.canAddLineSafely(d1, d2, dots, lines)) {
          return { from: d1.id, to: d2.id };
        }
      }
    }
    return null;
  },

  /**
   * Check if a line can be added without violations
   */
  canAddLineSafely(d1, d2, dots, lines) {
    const exists = lines.some(l =>
      (l.from === d1.id && l.to === d2.id) || (l.from === d2.id && l.to === d1.id)
    );
    if (exists) return false;

    if (GameLogic.hasIntermediateDot(d1, d2, dots)) return false;

    for (const l of lines) {
      if (l.from === d1.id || l.to === d1.id || l.from === d2.id || l.to === d2.id) continue;

      const l1 = dots.find(d => d.id === l.from);
      const l2 = dots.find(d => d.id === l.to);
      if (GameLogic.doLinesIntersect(d1, d2, l1, l2)) {
        return false;
      }
    }

    const testLines = [...lines, { from: d1.id, to: d2.id }];
    if (GameLogic.wouldCreateLargerPolygon(d1.id, d2.id, testLines)) {
      return false;
    }

    return true;
  }
};

export default AILogic;