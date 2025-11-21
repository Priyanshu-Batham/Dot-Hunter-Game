// saving game logic of v1


const GameLogic = {
  // Check if two lines intersect (to prevent messy crossing lines)
  doLinesIntersect: (p1, p2, p3, p4) => {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (det === 0) return false;
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
    return (0.05 < lambda && lambda < 0.95) && (0.05 < gamma && gamma < 0.95);
  },

  // Generate Staggered Dots (Vertical lines kept, horizontal offset)
  generateStaggeredDots: (width, height) => {
    const dots = [];
    const cols = 5; // Reduced number of columns
    const rows = 4; // Reduced number of rows
    
    // Margins to keep dots away from edges
    const marginX = width * 0.15;
    const marginY = height * 0.15;
    const usableW = width - (marginX * 2);
    const usableH = height - (marginY * 2);
    
    const colSpacing = usableW / (cols - 1);
    const rowSpacing = usableH / (rows - 1);

    let idCounter = 0;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        // Stagger every odd column vertically
        let offsetY = (c % 2 === 0) ? 0 : rowSpacing * 0.5;
        
        // Don't add the last dot in staggered cols if it goes too low
        if (c % 2 !== 0 && r === rows - 1) continue;

        // Add slight randomness so it looks hand-drawn, not robotic
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

  // BFS Cycle Detection to find closed polygons
  findNewPolygons: (startNode, endNode, currentLines, dots, currentPlayerIdx) => {
    const adj = {};
    dots.forEach(d => adj[d.id] = []);
    
    // Build graph from existing lines
    currentLines.forEach(l => {
      adj[l.from].push(l.to);
      adj[l.to].push(l.from);
    });

    const queue = [[startNode]];
    const visited = new Set([startNode]);
    let foundPath = null;

    while(queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];

      if (node === endNode && path.length > 2) {
        foundPath = path;
        break; 
      }

      for (let neighbor of adj[node]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        } else if (neighbor === endNode && path.length > 2) {
            foundPath = [...path, endNode];
            break;
        }
      }
      if(foundPath) break;
    }

    if (foundPath) {
      return { 
        points: foundPath.map(id => dots.find(d => d.id === id)), 
        ownerId: currentPlayerIdx 
      };
    }
    return null;
  }
};

export default GameLogic;
