const GameLogic = {
  // Check if two lines intersect (to prevent messy crossing lines)
  doLinesIntersect: (p1, p2, p3, p4) => {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (det === 0) return false;
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
    return (0.05 < lambda && lambda < 0.95) && (0.05 < gamma && gamma < 0.95);
  },

  /**
   * Check if a dot lies on the line segment between two other dots
   * @param {Object} dot - The dot to check {x, y, id}
   * @param {Object} lineStart - Start point of line {x, y, id}
   * @param {Object} lineEnd - End point of line {x, y, id}
   * @param {number} tolerance - Distance tolerance for considering a point "on" the line
   * @returns {boolean} True if dot lies on the line segment
   */
  isDotOnLine: (dot, lineStart, lineEnd, tolerance = 15) => {
    // Skip if the dot is one of the endpoints
    if (dot.id === lineStart.id || dot.id === lineEnd.id) return false;

    // Calculate distance from point to line segment
    const A = dot.x - lineStart.x;
    const B = dot.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dotProduct = A * C + B * D;
    const lenSq = C * C + D * D;
    
    // Parameter for closest point on the infinite line
    let param = -1;
    if (lenSq !== 0) {
      param = dotProduct / lenSq;
    }

    let closestX, closestY;

    // Check if closest point is within the line segment
    if (param < 0) {
      // Closest point is before the start - not on segment
      return false;
    } else if (param > 1) {
      // Closest point is after the end - not on segment
      return false;
    } else {
      // Closest point is on the segment
      closestX = lineStart.x + param * C;
      closestY = lineStart.y + param * D;
    }

    // Calculate distance from dot to closest point on line
    const dx = dot.x - closestX;
    const dy = dot.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= tolerance;
  },

  /**
   * Check if any dot lies on the line between two points
   * @param {Object} p1 - Start point
   * @param {Object} p2 - End point
   * @param {Array} dots - All dots on board
   * @returns {boolean} True if any intermediate dot lies on the line
   */
  hasIntermediateDot: (p1, p2, dots) => {
    for (const dot of dots) {
      if (GameLogic.isDotOnLine(dot, p1, p2)) {
        return true;
      }
    }
    return false;
  },

  // Generate Staggered Dots (Vertical lines kept, horizontal offset)
  generateStaggeredDots: (width, height) => {
    const dots = [];
    const cols = 5;
    const rows = 4;
    
    const marginX = width * 0.15;
    const marginY = height * 0.15;
    const usableW = width - (marginX * 2);
    const usableH = height - (marginY * 2);
    
    const colSpacing = usableW / (cols - 1);
    const rowSpacing = usableH / (rows - 1);

    let idCounter = 0;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        let offsetY = (c % 2 === 0) ? 0 : rowSpacing * 0.5;
        
        if (c % 2 !== 0 && r === rows - 1) continue;

        const randomX = (Math.random() - 0.5) * 10;
        const randomY = (Math.random() - 0.5) * 10;

        dots.push({
          id: idCounter++,
          x: marginX + (c * colSpacing) + randomX,
          y: marginY + (r * rowSpacing) + offsetY + randomY
        });
      }
    }
    return dots;
  },

  findNewTriangles: (p1Id, p2Id, existingLines, dots, currentPlayerIdx) => {
    const neighbors1 = existingLines
        .filter(l => l.from === p1Id || l.to === p1Id)
        .map(l => l.from === p1Id ? l.to : l.from);

    const neighbors2 = existingLines
        .filter(l => l.from === p2Id || l.to === p2Id)
        .map(l => l.from === p2Id ? l.to : l.from);

    let foundTriangle = null;

    for (const N_id of neighbors1) {
      if (N_id === p2Id) continue; 
      
      if (neighbors2.includes(N_id)) {
        const trianglePoints = [
          dots.find(d => d.id === p1Id),
          dots.find(d => d.id === p2Id),
          dots.find(d => d.id === N_id)
        ];
        
        foundTriangle = { 
            points: trianglePoints, 
            ownerId: currentPlayerIdx 
        };
        break; 
      }
    }

    return foundTriangle;
  },

  wouldCreateLargerPolygon: (p1Id, p2Id, lines) => {
    const graph = {};
    lines.forEach(l => {
      if ((l.from === p1Id && l.to === p2Id) || (l.from === p2Id && l.to === p1Id)) {
        return;
      }
      
      if (!graph[l.from]) graph[l.from] = [];
      if (!graph[l.to]) graph[l.to] = [];
      graph[l.from].push(l.to);
      graph[l.to].push(l.from);
    });

    const queue = [{ node: p2Id, distance: 0, path: [p2Id] }];
    const visited = new Set([p2Id]);
    
    while (queue.length > 0) {
      const { node, distance, path } = queue.shift();
      
      if (node === p1Id && distance > 0) {
        const cycleLength = distance + 1;
        
        if (cycleLength === 3) {
          return false;
        } else if (cycleLength >= 4) {
          return true;
        }
      }
      
      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ 
            node: neighbor, 
            distance: distance + 1,
            path: [...path, neighbor]
          });
        }
      }
    }
    
    return false;
  },

  canFormAnyTriangle: (lines, dots, scoredTriangles = []) => {
    const lineSet = new Set();
    lines.forEach(l => {
      const key = `${Math.min(l.from, l.to)}-${Math.max(l.from, l.to)}`;
      lineSet.add(key);
    });

    const scoredSet = new Set();
    scoredTriangles.forEach(tri => {
      const ids = tri.points.map(p => p.id).sort().join(',');
      scoredSet.add(ids);
    });

    const lineExists = (id1, id2) => {
      const key = `${Math.min(id1, id2)}-${Math.max(id1, id2)}`;
      return lineSet.has(key);
    };

    const canAddLine = (d1, d2) => {
      if (lineExists(d1.id, d2.id)) return false;

      // NEW: Check if any dot lies on this line
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
    };

    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        for (let k = j + 1; k < dots.length; k++) {
          const d1 = dots[i];
          const d2 = dots[j];
          const d3 = dots[k];

          const triKey = [d1.id, d2.id, d3.id].sort().join(',');
          if (scoredSet.has(triKey)) continue;

          const edge1Exists = lineExists(d1.id, d2.id);
          const edge2Exists = lineExists(d2.id, d3.id);
          const edge3Exists = lineExists(d1.id, d3.id);

          const existingEdges = (edge1Exists ? 1 : 0) + (edge2Exists ? 1 : 0) + (edge3Exists ? 1 : 0);

          if (existingEdges === 2) {
            if (!edge1Exists && canAddLine(d1, d2)) return true;
            if (!edge2Exists && canAddLine(d2, d3)) return true;
            if (!edge3Exists && canAddLine(d1, d3)) return true;
          }
        }
      }
    }

    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const d1 = dots[i];
        const d2 = dots[j];
        
        if (canAddLine(d1, d2)) {
          return true;
        }
      }
    }

    return false;
  }
};

export default GameLogic;