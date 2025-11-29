/**
 * AI Integration - Handles AI turn automation and animations
 */

const AIIntegration = {
  /**
   * Execute an AI turn (with animation)
   * @param {Object} params - Parameters
   * @returns {Promise} - Resolves when turn is complete
   */
  async executeAITurn(params) {
    const {
      getAIMove,        // Function to get AI move
      gameState,        // Current game state
      dots,             // Dots array
      attemptConnection, // Function to execute move
      setAIThinking,    // Function to show thinking indicator
      setDragStart,     // For animation
      setDragCurrent,   // For animation
      movesLeft         // Remaining moves
    } = params;

    if (movesLeft <= 0) {
      return;
    }

    // Show thinking indicator
    setAIThinking(true);

    try {
      // Get AI's chosen move
      const aiMove = await getAIMove(gameState);

      // Find the actual dot objects
      const fromDot = dots.find(d => d.id === aiMove.from);
      const toDot = dots.find(d => d.id === aiMove.to);

      if (!fromDot || !toDot) {
        throw new Error('Invalid dots in AI move');
      }

      // Animate the line being drawn
      await this.animateAIMove(fromDot, toDot, setDragStart, setDragCurrent);

      // Execute the move
      attemptConnection(fromDot, toDot);

      setAIThinking(false);

    } catch (error) {
      console.error('AI turn failed:', error);
      setAIThinking(false);
      throw error;
    }
  },

  /**
   * Animate AI move (line drawing)
   */
  animateAIMove(fromDot, toDot, setDragStart, setDragCurrent) {
    return new Promise(resolve => {
      // Highlight the dots AI is connecting
      setDragStart(fromDot);
      setDragCurrent({ x: fromDot.x, y: fromDot.y });

      // Animate line drawing over 500ms
      const steps = 20;
      let currentStep = 0;

      const animationInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        setDragCurrent({
          x: fromDot.x + (toDot.x - fromDot.x) * progress,
          y: fromDot.y + (toDot.y - fromDot.y) * progress
        });

        if (currentStep >= steps) {
          clearInterval(animationInterval);
          setDragCurrent({ x: toDot.x, y: toDot.y });

          // Clear drag state after showing the line briefly
          setTimeout(() => {
            setDragStart(null);
            setDragCurrent(null);
            resolve();
          }, 300);
        }
      }, 25); // 500ms total / 20 steps = 25ms per step
    });
  }
};

export default AIIntegration;