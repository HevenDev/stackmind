const concepts = [
  {
    id: 6,
    title: "Graphs — BFS, DFS, Topology & Union-Find",
    tag: "EVERY CONNECTION IN THE UNIVERSE",
    color: "#B91C1C",
    tldr: `A graph is a set of nodes connected by edges — the most general data structure, modeling everything from social networks to city maps to dependency systems. BFS finds shortest paths in unweighted graphs; DFS detects cycles and explores paths; topological sort orders dependencies; Union-Find tracks connected components in near-O(1). Dijkstra extends BFS to weighted shortest paths. Together these algorithms power Google Maps, npm dependency resolution, social graph queries, and distributed systems.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I wrote DFS but it runs forever on a graph with cycles"
  → Unlike trees, graphs can have cycles. Without a visited set, DFS revisits nodes infinitely.
  → Three-color DFS (white/gray/black) detects cycles — back edges indicate cycles.

"BFS gives shortest path but my graph has edge weights — why does BFS fail?"
  → BFS counts hops (each edge = cost 1). Weighted graphs need Dijkstra.
  → Dijkstra uses a min-heap to always process the currently cheapest node next.

"Topological sort — when does it fail and why?"
  → Only works on DAGs (Directed Acyclic Graphs). Any cycle = no valid topological order.
  → Kahn's algorithm: if queue empties before processing all nodes → cycle detected.

"Union-Find vs BFS for connected components — which and when?"
  → BFS/DFS: O(V+E) per query, works for any graph property.
  → Union-Find: near-O(1) amortized per union/find, ONLY tracks connectivity.
  → Dynamic graphs (edges added over time): Union-Find wins.
  → Need to find the actual path: BFS/DFS wins.

"Multi-source BFS — what is it and when do I use it?"
  → BFS from MULTIPLE starting nodes simultaneously.
  → Problem: "Distance from each cell to its nearest 0 in a matrix."
  → Initialize queue with ALL 0-cells at once → BFS spreads outward simultaneously.
  → Avoids O(V) separate BFS calls → O(V+E) total.
    `,
    analogy: `
THE CITY NAVIGATION ANALOGY:
-----------------------------
A graph is a city. Nodes are intersections. Edges are roads.

BFS = RIPPLE FROM A STONE:
  Drop a stone in water at your starting intersection.
  Ripples spread outward in concentric circles — all intersections 1 hop away first,
  then 2 hops, then 3 hops.
  BFS guarantees: when you first "visit" an intersection, you found the SHORTEST route.
  Use BFS whenever: "minimum hops," "shortest path in unweighted graph," "level-by-level."

DFS = FOLLOWING A THREAD THROUGH A MAZE:
  Tie a string to the entrance. Walk as deep as possible down one path.
  Hit a dead end? Follow the string back (backtrack) and try the next unexplored path.
  DFS explores completely before backtracking.
  Use DFS whenever: "is there ANY path," "all paths," "detect cycles," "topological order."

TOPOLOGICAL SORT = GETTING DRESSED:
  Some tasks must come before others: underwear before pants, socks before shoes.
  Topological sort gives a valid order respecting all "must come before" constraints.
  If a task depends on itself (directly or indirectly) → impossible to schedule → cycle!
  Real use: npm install dependency order, Makefile build order, course prerequisites.

UNION-FIND = SOCIAL CLIQUES:
  You have 1000 students. "Are Priya and Rohan in the same study group?"
  Union-Find: each student points to their group leader.
  Unite groups: merge two groups by updating the leader pointer.
  Find: follow pointers to root — if same root → same group.
  Path compression makes "find" nearly O(1): flatten the chain so everyone points directly to root.

DIJKSTRA = GOOGLE MAPS ROUTING:
  Each road has a travel time (weight). Find fastest route from home to airport.
  Always extend the currently fastest-known route.
  Min-heap ensures you always try the cheapest unexplored route next.
  Greedy: once a city is "finalized" (popped from heap), its shortest path is confirmed.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — GRAPH ALGORITHMS:
---------------------------------------------

GRAPH REPRESENTATIONS:
  Adjacency Matrix: grid[i][j] = 1 if edge i→j.
    Space: O(V²). Edge lookup: O(1). Iterate neighbors: O(V). Good for dense graphs.
  
  Adjacency List: graph[i] = [list of neighbors].
    Space: O(V+E). Edge lookup: O(degree). Iterate neighbors: O(degree). Good for sparse graphs.
    (Most real-world graphs are sparse: V=millions of users, E=average 100 friends each)
  
  Edge List: [[u, v, weight], ...]. Good for Kruskal's MST algorithm.

BFS — CANONICAL TEMPLATE:
  function bfs(graph, start):
    visited = new Set([start])
    queue = [start]
    while queue not empty:
      node = queue.shift()  // Dequeue from front
      process(node)
      for neighbor of graph[node]:
        if not visited.has(neighbor):
          visited.add(neighbor)
          queue.push(neighbor)
  
  Key: mark visited when ENQUEUING (not when processing) to avoid duplicate enqueues.
  BFS distance: distance[node] = distance[parent] + 1. Initialize distance[start] = 0.

MULTI-SOURCE BFS:
  Initialize queue with ALL sources simultaneously.
  All sources start at distance 0.
  Single BFS pass spreads outward from all sources simultaneously.
  Result: each cell gets the distance to its nearest source.
  
  Use cases: 
    - Nearest 0 in binary matrix
    - Walls and gates (nearest gate for each empty room)
    - Rotten oranges (time for all oranges to rot)

DFS WITH THREE COLORS (Cycle Detection in Directed Graph):
  WHITE (0): unvisited
  GRAY  (1): currently in DFS call stack (being processed)
  BLACK (2): fully processed
  
  During DFS: if we find a GRAY neighbor → back edge → CYCLE detected!
  (Gray means it's an ancestor in the current DFS path — following it creates a cycle)
  
  In undirected graph: simpler — just check if neighbor is visited AND is not parent.

TOPOLOGICAL SORT — TWO APPROACHES:
  
  1. DFS-based (postorder):
     Run DFS. Add each node to FRONT of result when its DFS finishes (postorder).
     Result is in topological order (reverse postorder DFS).
  
  2. KAHN'S ALGORITHM (BFS-based, more intuitive):
     Step 1: Compute in-degree of every node.
     Step 2: Add all nodes with in-degree 0 to queue (no prerequisites).
     Step 3: Process queue:
       - Pop node, add to result.
       - For each neighbor: in-degree--. If in-degree becomes 0: add to queue.
     Step 4: If result.length < V: cycle detected!
  
  Kahn's advantage: naturally detects cycles AND produces topological order in one pass.

UNION-FIND WITH PATH COMPRESSION + UNION BY RANK:
  Data structure:
    parent[i] = i initially (each node is its own root)
    rank[i] = 0 initially (height estimate)
  
  find(x):  // With path compression
    if parent[x] !== x:
      parent[x] = find(parent[x])  // Path compression: point directly to root
    return parent[x]
  
  union(x, y):  // With union by rank
    rootX = find(x), rootY = find(y)
    if rootX === rootY: return false  // Already connected
    if rank[rootX] < rank[rootY]: swap(rootX, rootY)
    parent[rootY] = rootX  // rootX becomes parent
    if rank[rootX] === rank[rootY]: rank[rootX]++
    return true
  
  Time complexity: near-O(1) — O(α(n)) where α is inverse Ackermann function.
  In practice: α(10^80) = 4. Effectively constant.
  
  Applications: Kruskal's MST, network connectivity, image segmentation, percolation.

DIJKSTRA'S ALGORITHM:
  Requirements: non-negative edge weights (negative weights → Bellman-Ford).
  
  dist[source] = 0, all others = Infinity
  minHeap = [(0, source)]  // (distance, node)
  
  while heap not empty:
    (d, node) = heap.pop_min()
    if d > dist[node]: continue  // Stale entry (already found shorter path)
    
    for (neighbor, weight) of graph[node]:
      newDist = d + weight
      if newDist < dist[neighbor]:
        dist[neighbor] = newDist
        heap.push((newDist, neighbor))
  
  Time: O((V+E) log V) with binary heap.
  
  Why non-negative weights only?
    Negative edge: after "finalizing" a node, a negative edge could give shorter path.
    Greedy assumption (cheapest unvisited = final) breaks with negative weights.
    Bellman-Ford handles negatives: O(VE), relaxes all edges V-1 times.

GRAPH PROBLEM PATTERNS (signal words → algorithm):
  "Shortest path, unweighted"          → BFS
  "Shortest path, weighted"            → Dijkstra
  "All pairs shortest path"            → Floyd-Warshall O(V³)
  "Cycle detection, directed"          → DFS with colors (gray = cycle)
  "Cycle detection, undirected"        → Union-Find or DFS (visited & not parent)
  "Connected components"               → BFS/DFS or Union-Find
  "Minimum spanning tree"              → Kruskal (Union-Find) or Prim
  "Task ordering / dependencies"       → Topological sort (Kahn's)
  "Can all nodes be reached"           → DFS/BFS from source, count visited
  "Bipartite check"                    → BFS with 2-coloring
  "Nearest X for each cell in matrix"  → Multi-source BFS
    `,
    code: `
// ===== GRAPHS — CODE EXAMPLES =====

// EXAMPLE 1: Build adjacency list and basic BFS
function buildGraph(edges, directed = false) {
  const graph = new Map();
  for (const [u, v] of edges) {
    if (!graph.has(u)) graph.set(u, []);
    if (!graph.has(v)) graph.set(v, []);
    graph.get(u).push(v);
    if (!directed) graph.get(v).push(u); // Undirected: add both directions
  }
  return graph;
}

// BFS — Shortest path in unweighted graph
// Scenario: Minimum flights from Delhi to any city in the network
function bfsShortestPath(graph, start, end) {
  const visited = new Set([start]);
  const queue = [[start, [start]]]; // [node, path]
  
  while (queue.length) {
    const [node, path] = queue.shift();
    if (node === end) return path;
    
    for (const neighbor of (graph.get(node) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, [...path, neighbor]]);
      }
    }
  }
  return null; // No path
}

const flightEdges = [['Delhi','Mumbai'],['Delhi','Kolkata'],['Mumbai','Bangalore'],
  ['Kolkata','Chennai'],['Bangalore','Hyderabad'],['Chennai','Hyderabad']];
const flightGraph = buildGraph(flightEdges);
console.log(bfsShortestPath(flightGraph, 'Delhi', 'Hyderabad'));
// ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad']

// EXAMPLE 2: Multi-source BFS — Rotten Oranges
// Time for all fresh oranges to rot. Rotten oranges (2) spread to adjacent (1) each minute.
function orangesRotting(grid) {
  const rows = grid.length, cols = grid[0].length;
  const queue = [];
  let fresh = 0;
  
  // Initialize: enqueue ALL rotten oranges as sources
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c, 0]); // [row, col, time]
      if (grid[r][c] === 1) fresh++;
    }
  }
  
  if (fresh === 0) return 0; // No fresh oranges
  
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  let maxTime = 0;
  
  while (queue.length) {
    const [r, c, time] = queue.shift();
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
        grid[nr][nc] = 2; // Mark rotten
        fresh--;
        maxTime = Math.max(maxTime, time + 1);
        queue.push([nr, nc, time + 1]);
      }
    }
  }
  
  return fresh === 0 ? maxTime : -1; // -1 if some fresh unreachable
}

console.log(orangesRotting([[2,1,1],[1,1,0],[0,1,1]])); // 4

// EXAMPLE 3: DFS Cycle Detection (Directed Graph — Course Schedule)
// Can all courses be completed given prerequisites? (No cycle in dependency graph)
function canFinishCourses(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course); // prereq → course
  }
  
  const color = new Array(numCourses).fill(0); // 0=white, 1=gray, 2=black
  
  function hasCycle(node) {
    color[node] = 1; // Mark gray (in current DFS path)
    for (const neighbor of graph[node]) {
      if (color[neighbor] === 1) return true;  // Gray neighbor = back edge = CYCLE
      if (color[neighbor] === 0 && hasCycle(neighbor)) return true; // Unvisited: recurse
    }
    color[node] = 2; // Mark black (fully processed)
    return false;
  }
  
  for (let i = 0; i < numCourses; i++) {
    if (color[i] === 0 && hasCycle(i)) return false; // Cycle found → can't finish
  }
  return true;
}

console.log(canFinishCourses(4, [[1,0],[2,1],[3,2]])); // true (0→1→2→3)
console.log(canFinishCourses(2, [[1,0],[0,1]]));       // false (0↔1 cycle)

// EXAMPLE 4: Kahn's Topological Sort
// Order tasks given dependencies (e.g., npm package install order)
function topologicalSort(numNodes, edges) {
  const graph = Array.from({ length: numNodes }, () => []);
  const inDegree = new Array(numNodes).fill(0);
  
  for (const [from, to] of edges) {
    graph[from].push(to);
    inDegree[to]++;
  }
  
  // Start with all nodes that have no prerequisites
  const queue = [];
  for (let i = 0; i < numNodes; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }
  
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const neighbor of graph[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor); // All prereqs done
    }
  }
  
  // If we processed all nodes, no cycle. Otherwise, cycle detected.
  return order.length === numNodes ? order : []; // [] means cycle exists
}

// npm packages: 0=lodash, 1=express, 2=body-parser, 3=my-app
// my-app needs express, express needs body-parser, body-parser needs lodash
console.log(topologicalSort(4, [[3,1],[1,2],[2,0]])); // [3,1,2,0] or valid ordering

// EXAMPLE 5: Union-Find with Path Compression + Union by Rank
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.components = n; // Track number of components
  }
  
  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }
  
  union(x, y) {
    const rootX = this.find(x), rootY = this.find(y);
    if (rootX === rootY) return false; // Already connected
    
    // Union by rank: attach smaller tree under larger tree
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
    this.components--;
    return true;
  }
  
  connected(x, y) { return this.find(x) === this.find(y); }
}

// Count connected components in social network
function countComponents(n, edges) {
  const uf = new UnionFind(n);
  for (const [u, v] of edges) uf.union(u, v);
  return uf.components;
}

console.log(countComponents(5, [[0,1],[1,2],[3,4]])); // 2 ({0,1,2} and {3,4})

// EXAMPLE 6: Dijkstra's Shortest Path (Min-Heap simulation)
// Scenario: Minimum delivery cost from warehouse to all delivery locations in Mumbai
function dijkstra(graph, start) {
  const dist = new Map();
  for (const node of graph.keys()) dist.set(node, Infinity);
  dist.set(start, 0);
  
  // Min-heap simulation: [distance, node] — sort by distance
  // In production: use a real priority queue (e.g., the 'heap' npm package)
  const heap = [[0, start]];
  
  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]); // O(E log E) — use real min-heap in production!
    const [d, node] = heap.shift();
    
    if (d > dist.get(node)) continue; // Stale entry — skip
    
    for (const [neighbor, weight] of (graph.get(node) || [])) {
      const newDist = d + weight;
      if (newDist < dist.get(neighbor)) {
        dist.set(neighbor, newDist);
        heap.push([newDist, neighbor]);
      }
    }
  }
  
  return dist;
}

const deliveryGraph = new Map([
  ['Warehouse', [['Andheri', 10], ['Bandra', 30], ['Kurla', 15]]],
  ['Andheri',   [['Bandra', 5],  ['Malad', 8]]],
  ['Bandra',    [['Malad', 7],   ['Dadar', 12]]],
  ['Kurla',     [['Dadar', 6]]],
  ['Malad',     [['Dadar', 3]]],
  ['Dadar',     []],
]);

const distances = dijkstra(deliveryGraph, 'Warehouse');
console.log(distances.get('Dadar')); // Minimum cost path: Warehouse→Andheri→Bandra→Malad→Dadar = 28

// EXAMPLE 7: Number of Islands — DFS on implicit graph (grid)
// Classic: treat each cell as a graph node, edges connect adjacent cells
function numIslands(grid) {
  if (!grid.length) return 0;
  const rows = grid.length, cols = grid[0].length;
  let count = 0;
  
  function dfs(r, c) {
    // Boundary check + only visit '1' cells
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '#'; // Mark visited (in-place — avoids Set overhead)
    dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1);
  }
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') { dfs(r, c); count++; }
    }
  }
  
  return count;
}

const grid = [
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1']
];
console.log(numIslands(grid)); // 3
    `,
    bugs: `
REAL PRODUCTION BUGS FROM GRAPH MISUNDERSTANDING:
--------------------------------------------------

BUG 1: Missing visited set in graph DFS — infinite loop on cyclic data
  Scenario: Social network "find all connections of user X" DFS ran forever.
    Users A and B were mutual friends: A→B and B→A. DFS: A→B→A→B→A... stack overflow.
  Root cause: Tree DFS doesn't need visited set (trees have no cycles).
    Developers copy-pasted tree DFS for graph traversal without adding visited tracking.
  Fix:
    function dfs(graph, node, visited = new Set()) {
      if (visited.has(node)) return; // CRITICAL: check visited first
      visited.add(node);
      for (const neighbor of (graph.get(node) || [])) dfs(graph, neighbor, visited);
    }

BUG 2: Marking visited when processing instead of when enqueuing — duplicate BFS nodes
  Scenario: BFS for shortest path returned correct distance but was 10× slower than expected.
    For a graph with 1M nodes, processed 8M nodes instead of 1M.
  Root cause: Marking visited when DEQUEUING instead of when ENQUEUING.
    The same node was enqueued multiple times (once per neighbor that discovered it)
    before it was processed and marked visited.
  Fix:
    // WRONG: visited.add(node) when dequeuing (inside the while loop, after shift())
    // RIGHT: visited.add(neighbor) when enqueuing (before pushing to queue)
    if (!visited.has(neighbor)) {
      visited.add(neighbor); // Mark HERE — prevents duplicate enqueues
      queue.push(neighbor);
    }

BUG 3: Topological sort with wrong in-degree initialization — wrong dependency order
  Scenario: Build system processed some modules before their dependencies were ready.
    Random crashes depending on which modules were in which order.
  Root cause: In-degree computed from wrong edge direction.
    Edges were [dependency, module] but code did inDegree[from]++ instead of inDegree[to]++.
    Modules with no dependents (leaves) got processed last instead of first.
  Fix: For edge [u, v] meaning "u must come before v":
    inDegree[v]++; // v has one more prerequisite (u)
    // NOT inDegree[u]++ (u doesn't need to wait for anyone)

BUG 4: Dijkstra on graph with negative edge weights — wrong shortest paths
  Scenario: Delivery cost optimization where some routes had promotional discounts (negative costs).
    Dijkstra produced "shortest paths" that were wrong for destinations near negative edges.
  Root cause: Dijkstra's greedy assumption (once a node is finalized, its distance is optimal)
    breaks with negative edges. A later negative edge could create a shorter path
    to an already-finalized node.
  Fix: Use Bellman-Ford for graphs with negative edges: O(VE).
    Or if negative CYCLES (total cost of a cycle is negative — can loop for free): detect and report error.
    For most real-world problems: normalize costs to non-negative (add constant offset).

BUG 5: Union-Find missing path compression — O(n) per operation instead of O(α(n))
  Scenario: Real-time fraud detection grouping transactions. Performance degraded over time.
    With 1 million transactions, each union/find took up to 1 second (should be microseconds).
  Root cause: Union-Find implemented without path compression.
    After many unions in a chain: find(x) traversed the entire chain each time.
    A→B→C→D→...→root: O(n) per find operation.
  Fix: Add path compression to find():
    function find(x) {
      if (parent[x] !== x) parent[x] = find(parent[x]); // Compress!
      return parent[x];
    }
    Combined with union by rank: amortized O(α(n)) ≈ O(1) per operation.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — TRACE THE ALGORITHM:
  Given graph (directed): 0→1, 0→2, 1→3, 2→3, 3→4
  
  a) Run BFS from node 0. Show the queue state after each dequeue.
     What is the shortest path from 0 to 4?
  
  b) Run Kahn's topological sort. Show in-degrees initially.
     Show queue state and order array after each step.
     Final topological order?
  
  c) Now add edge 4→1 to make it cyclic.
     What happens when you run Kahn's? How does it detect the cycle?
     (Hint: check order.length vs numNodes at the end)

CHALLENGE 2 — FIX THE DIJKSTRA BUG:
  This Dijkstra implementation has 2 bugs causing incorrect shortest paths.
  
  function dijkstraBuggy(graph, start, end) {
    const dist = {};
    for (const node of graph.keys()) dist[node] = Infinity;
    dist[start] = 0;
    const heap = [[0, start]];
    const visited = new Set(); // Bug 1: shouldn't skip based on visited alone
    
    while (heap.length) {
      heap.sort((a, b) => a[0] - b[0]);
      const [d, node] = heap.shift();
      
      if (visited.has(node)) continue;
      visited.add(node);
      
      if (node === end) return d;
      
      for (const [neighbor, weight] of graph.get(node)) {
        // Bug 2: updates dist but doesn't re-add to heap when shorter path found
        if (d + weight < dist[neighbor]) {
          dist[neighbor] = d + weight;
          // Missing: heap.push([dist[neighbor], neighbor]);
        }
      }
    }
    return dist[end];
  }
  
  Explain why Bug 2 causes wrong answers. Trace a specific example that breaks.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Implement "Find Critical Connections in a Network" (Bridges in a graph).
  A bridge is an edge whose removal increases the number of connected components.
  
  Algorithm: Tarjan's Bridge Finding
  For each node during DFS, track:
    - disc[node]: discovery time (DFS visit order)
    - low[node]: lowest disc reachable from node's subtree
  
  An edge (u, v) is a bridge if: low[v] > disc[u]
  (v cannot reach back to u or its ancestors — removing u→v disconnects the graph)
  
  Input: n=4, connections=[[0,1],[1,2],[2,0],[1,3]]
  Output: [[1,3]] (edge 1-3 is the only bridge)
  
  Implement with O(V+E) time using recursive DFS with discovery and low arrays.
  Test with the disconnected case and a fully connected case (no bridges).
    `,
    summary: `Graphs are the most versatile data structure — virtually every relationship-based problem maps to a graph. Master the four fundamental algorithms: BFS (shortest hops), DFS with cycle detection (connectivity and ordering), Kahn's topological sort (dependency resolution), and Dijkstra (weighted shortest path). Union-Find is your O(1) connectivity oracle for dynamic graphs. The key to graph problems is choosing the right representation (adjacency list for sparse, matrix for dense) and the right algorithm based on whether paths need weights, cycles need detection, or components need tracking.`
  },

  {
    id: 7,
    title: "Stacks, Queues, Heaps & Monotonic Patterns",
    tag: "THE RIGHT CONTAINER FOR THE RIGHT PROBLEM",
    color: "#7E22CE",
    tldr: `Stacks (LIFO), queues (FIFO), and heaps (priority-based) are the three fundamental "container" data structures beyond arrays. The monotonic stack is a pattern — not a new data structure — that solves "next greater/smaller element" problems in O(n). Heaps enable Top-K, median of stream, and sliding window maximum in optimal time. Together these cover a wide family of interview problems and production algorithms (task schedulers, event queues, priority systems).`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"When do I use a stack vs a queue?"
  → Stack (LIFO): undo/redo, DFS, expression evaluation, balanced parentheses.
  → Queue (FIFO): BFS, task scheduling, rate limiting buffers, print queues.
  → If problem says "process in order received": queue. "Process most recently added": stack.

"Heap vs sorted array — why use heap for Top-K?"
  → Sorted array: O(n log n) to sort. Heap of size K: O(n log K) to process n elements.
  → When K << n: massive win. Streaming data (can't sort what you haven't seen yet): heap required.

"Monotonic stack — I've heard of it but can never figure out when to use it."
  → Signal phrases: "next greater element," "next smaller element," "daily temperatures,"
    "largest rectangle in histogram," "sum of subarray minimums."
  → Pattern: maintain a stack of candidates that are "in competition."
    New element beats old candidates → pop them (recording answers), push new element.

"Sliding window maximum — can't I just track max in the window?"
  → You can track MAX going right (add new element). But when left pointer moves, 
    if old max leaves the window: you don't know the new max without re-scanning.
  → Deque (monotonic deque) maintains candidates: O(1) to get window max after O(1) updates.

"Median of a data stream — why two heaps?"
  → Sorted structure: O(log n) insert, O(1) median access.
  → Two heaps split the sorted data in half:
    Max-heap (left half): top = max of smaller half.
    Min-heap (right half): top = min of larger half.
    Median = average of both tops (or one top if sizes differ).
    `,
    analogy: `
THE RESTAURANT ANALOGY (STACKS/QUEUES/HEAPS):
----------------------------------------------

STACK = PLATE STACK AT A BUFFET:
  Plates are stacked. You take the top plate (last one placed).
  Put a plate on: push. Take top plate: pop. See top without taking: peek.
  LIFO: Last In, First Out.
  Real use: Browser back button (visit pages → push. Go back → pop).
  DFS uses a stack (recursion IS a call stack).

QUEUE = CHECKOUT LINE AT D-MART:
  Customers join the back, served from the front.
  FIFO: First In, First Out.
  Real use: Print queue (print jobs in order received), BFS traversal.

HEAP = HOSPITAL EMERGENCY ROOM TRIAGE:
  Not first-come-first-served. MOST CRITICAL patient treated first.
  MAX-HEAP: highest priority number = served first.
  MIN-HEAP: lowest value = served first (minimum cost, nearest deadline).
  
  New patient arrives: O(log n) to find correct position (heapify).
  Treat next patient: O(log n) to restore heap after removing root.
  Who's next: O(1) — always look at the root.

MONOTONIC STACK = "TALLER BUILDINGS BLOCK SHORTER ONES" ANALOGY:
  You're taking a panoramic city photo from a rooftop. Looking right.
  Each building you see: does a TALLER building appear to its right? When?
  
  Walk right to left, maintaining a stack of building heights (decreasing = monotonic decreasing).
  When you add a new building:
    - Pop all shorter buildings (they can't block anything — the new building is taller)
    - Record: those popped buildings' "next taller building to the right" = current building
    - Push current building onto stack
  
  Result: for each building, found "next greater element" in a single O(n) pass.

TWO HEAPS FOR MEDIAN = FAIR SPLIT:
  Sort all numbers. Take top half (smaller numbers) and bottom half (larger numbers).
  Top of MAX-HEAP (top half) = largest small number.
  Top of MIN-HEAP (bottom half) = smallest large number.
  Median = average of these two (or the larger side's top if odd count).
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — HEAPS AND MONOTONIC PATTERNS:
---------------------------------------------------------

HEAP (BINARY HEAP) INTERNALS:
  A complete binary tree stored in an array (no pointers needed!).
  Parent of index i: Math.floor((i-1)/2)
  Left child of i: 2*i + 1
  Right child of i: 2*i + 2
  
  Min-Heap property: parent ≤ both children. Root = minimum element.
  Max-Heap property: parent ≥ both children. Root = maximum element.
  
  HEAPIFY-UP (sift up): Used after insert.
    Add element at end (maintain complete tree shape).
    Bubble up: swap with parent while smaller (min-heap) than parent.
    O(log n) — height of heap.
  
  HEAPIFY-DOWN (sift down): Used after extract-min.
    Remove root. Move last element to root (maintain complete tree shape).
    Bubble down: swap with smaller child while larger than a child.
    O(log n) — height of heap.
  
  BUILD HEAP from array: O(n) — not O(n log n)!
    Apply heapify-down to all non-leaf nodes (from n/2 down to 0).
    Work at each level: O(1) at bottom levels (few swaps), O(log n) at top.
    Total: O(n) by geometric series analysis.
  
  HEAP SORT: O(n log n), in-place.
    1. Build max-heap from array: O(n)
    2. Repeatedly: swap root (max) with last element, shrink heap, heapify-down: O(log n) × n

TOP-K ELEMENTS:
  Goal: Find K largest from n elements.
  
  Approach 1 — Sort: O(n log n). Simple but wasteful — sorts everything.
  
  Approach 2 — Max-heap on all n: O(n + K log n). Build heap O(n), pop K times O(K log n).
  
  Approach 3 — Min-heap of size K: O(n log K). Best for streaming/large n.
    Maintain a min-heap of exactly K elements.
    For each new element: if > heap.min → pop min, push new element.
    Final heap contains K largest. Root = Kth largest.
  
  When to use each:
    K ≈ n: Sort approach is fine.
    K << n or streaming: Min-heap of size K.
    Need the actual Kth value (not all K): quick select O(n) average.

MONOTONIC STACK PATTERN — DETAILED:
  Monotonic DECREASING stack: stack is always decreasing from bottom to top.
    "When we push X, pop all elements SMALLER than X from top."
    Good for: "next greater element" (NGE).
  
  Monotonic INCREASING stack: stack is always increasing from bottom to top.
    "When we push X, pop all elements LARGER than X from top."
    Good for: "next smaller element," "largest rectangle in histogram."
  
  Template for "Next Greater Element":
    const stack = []; // Monotonic decreasing stack of INDICES
    const result = new Array(n).fill(-1); // Default: no next greater
    
    for (let i = 0; i < n; i++) {
      // Pop elements that found their "next greater" (current element is their NGE)
      while (stack.length && arr[stack.at(-1)] < arr[i]) {
        result[stack.pop()] = arr[i]; // arr[i] is the NGE for the popped index
      }
      stack.push(i);
    }
    // Remaining stack elements have no NGE (result stays -1)
  
  Problems solved by monotonic stack:
    Next Greater/Smaller Element:     O(n) instead of O(n²)
    Largest Rectangle in Histogram:  O(n) — push increasing, pop when decreasing
    Trapping Rain Water:              O(n) — two passes or single pass with stack
    Sum of Subarray Minimums:         O(n) — each element's contribution
    Daily Temperatures:               O(n) — days until warmer temperature

MONOTONIC DEQUE — SLIDING WINDOW MAXIMUM:
  Problem: Maximum in each window of size k.
  
  Deque maintains indices of "candidate maximums" in current window.
    Front of deque: index of current window maximum.
    Maintain DECREASING order (back is smallest).
  
  For each new element at index i:
    1. Remove from BACK: pop all indices j where arr[j] ≤ arr[i] (they can't be max while arr[i] is in window)
    2. Add i to BACK.
    3. Remove from FRONT: if front index is outside window (front < i - k + 1): pop front.
    4. Window max = arr[deque[0]] (front of deque).
  
  O(n) — each element pushed and popped at most once.

MEDIAN OF A DATA STREAM:
  Two heaps: maxHeap (left half) and minHeap (right half).
  Invariant: all elements in maxHeap ≤ all elements in minHeap.
             |maxHeap.size - minHeap.size| ≤ 1 (balanced sizes).
  
  addNum(num):
    1. Push to maxHeap (max of smaller half). O(log n)
    2. Balance: if maxHeap.top > minHeap.top → pop from maxHeap, push to minHeap. O(log n)
    3. Rebalance sizes: if one heap has 2+ more elements → move top to other. O(log n)
  
  findMedian():
    If same size: (maxHeap.top + minHeap.top) / 2. O(1)
    If one larger: larger heap's top. O(1)
    `,
    code: `
// ===== STACKS, QUEUES, HEAPS — CODE EXAMPLES =====

// EXAMPLE 1: Min-Heap implementation (JavaScript lacks built-in heap)
class MinHeap {
  constructor() { this.heap = []; }
  
  size() { return this.heap.length; }
  peek() { return this.heap[0]; }
  
  push(val) {
    this.heap.push(val);
    this._siftUp(this.heap.length - 1);
  }
  
  pop() {
    if (this.size() === 1) return this.heap.pop();
    const min = this.heap[0];
    this.heap[0] = this.heap.pop(); // Move last to root
    this._siftDown(0);
    return min;
  }
  
  _siftUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent] > this.heap[i]) {
        [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
        i = parent;
      } else break;
    }
  }
  
  _siftDown(i) {
    while (true) {
      let smallest = i;
      const left = 2 * i + 1, right = 2 * i + 2;
      if (left < this.size() && this.heap[left] < this.heap[smallest]) smallest = left;
      if (right < this.size() && this.heap[right] < this.heap[smallest]) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

// Max-Heap: negate values for min-heap to simulate max-heap
class MaxHeap extends MinHeap {
  push(val) { super.push(-val); }
  pop() { return -super.pop(); }
  peek() { return -super.peek(); }
}

// EXAMPLE 2: Top-K Frequent Elements using Min-Heap of size K
// Scenario: Find K most common error codes in production logs
function topKFrequent(nums, k) {
  // Step 1: Count frequencies
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);
  
  // Step 2: Maintain min-heap of size K (keyed by frequency)
  // [frequency, element] — heap compares by frequency (index 0)
  const heap = new MinHeap();
  heap._compare = (a, b) => a[0] < b[0]; // Compare by frequency
  
  // Simplified: use array as min-heap manually for pairs
  const entries = [...freq.entries()]; // [element, count]
  entries.sort((a, b) => b[1] - a[1]); // Sort by count descending
  return entries.slice(0, k).map(e => e[0]); // Top K elements
  // O(n log n) — for O(n log K) use proper min-heap of size K
}

// O(n log K) implementation:
function topKFrequentOptimal(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);
  
  // Min-heap of [freq, num] — evict smallest freq when size > K
  const heap = new MinHeap();
  for (const [num, count] of freq) {
    heap.push(count * 100000 + num); // Pack freq + num into single number (hack for demo)
    if (heap.size() > k) heap.pop(); // Evict least frequent
  }
  
  // In production: use a proper pair-comparison heap
  const result = [];
  while (heap.size()) {
    const packed = heap.pop();
    result.push(packed % 100000);
  }
  return result;
}

const errorCodes = [404, 500, 404, 500, 404, 403, 500, 404, 302];
console.log(topKFrequent(errorCodes, 2)); // [404, 500] — most frequent error codes

// EXAMPLE 3: Monotonic Stack — Next Greater Element
// Scenario: For each day's temperature, find how many days until a warmer day
function dailyTemperatures(temps) {
  const result = new Array(temps.length).fill(0);
  const stack = []; // Monotonic decreasing stack of INDICES
  
  for (let i = 0; i < temps.length; i++) {
    // Current temp is higher than some previous temps → those temps found their answer
    while (stack.length && temps[stack.at(-1)] < temps[i]) {
      const prevIdx = stack.pop();
      result[prevIdx] = i - prevIdx; // Days to wait
    }
    stack.push(i);
    // Remaining stack elements have no future warmer day (result stays 0)
  }
  
  return result;
}

const temps = [73, 74, 75, 71, 69, 72, 76, 73];
console.log(dailyTemperatures(temps)); // [1,1,4,2,1,1,0,0]

// Next Greater Element for circular array
function nextGreaterElementCircular(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];
  
  // Process 2n times to handle circular wrapping
  for (let i = 0; i < 2 * n; i++) {
    const idx = i % n;
    while (stack.length && nums[stack.at(-1)] < nums[idx]) {
      result[stack.pop()] = nums[idx];
    }
    if (i < n) stack.push(idx); // Only push in first pass
  }
  
  return result;
}

console.log(nextGreaterElementCircular([1, 2, 1])); // [2, -1, 2]

// EXAMPLE 4: Largest Rectangle in Histogram (monotonic increasing stack)
// Classic hard problem — foundational for "maximal rectangle in matrix"
function largestRectangle(heights) {
  const stack = []; // Monotonic increasing stack of indices
  let maxArea = 0;
  
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i]; // Sentinel 0 at end
    
    while (stack.length && heights[stack.at(-1)] > h) {
      const height = heights[stack.pop()];
      const width = stack.length ? i - stack.at(-1) - 1 : i; // Width to extend left
      maxArea = Math.max(maxArea, height * width);
    }
    
    stack.push(i);
  }
  
  return maxArea;
}

console.log(largestRectangle([2, 1, 5, 6, 2, 3])); // 10 (bars 5 and 6, height 5, width 2)

// EXAMPLE 5: Sliding Window Maximum — Monotonic Deque
function maxSlidingWindow(nums, k) {
  const result = [];
  const deque = []; // Stores INDICES, maintains decreasing values
  
  for (let i = 0; i < nums.length; i++) {
    // Remove elements outside current window from front
    while (deque.length && deque[0] < i - k + 1) deque.shift();
    
    // Remove smaller elements from back (they can never be max while nums[i] is in window)
    while (deque.length && nums[deque.at(-1)] <= nums[i]) deque.pop();
    
    deque.push(i);
    
    // Start recording results once first full window is formed
    if (i >= k - 1) result.push(nums[deque[0]]);
  }
  
  return result;
}

const prices = [1, 3, -1, -3, 5, 3, 6, 7]; // Stock prices (window = 3 days)
console.log(maxSlidingWindow(prices, 3)); // [3, 3, 5, 5, 6, 7]

// EXAMPLE 6: Median of Data Stream — Two Heaps
class MedianFinder {
  constructor() {
    this.maxHeap = new MaxHeap(); // Left half (smaller numbers)
    this.minHeap = new MinHeap(); // Right half (larger numbers)
  }
  
  addNum(num) {
    // Always add to maxHeap first
    this.maxHeap.push(num);
    
    // Ensure all elements in maxHeap <= all elements in minHeap
    if (this.minHeap.size() > 0 && this.maxHeap.peek() > this.minHeap.peek()) {
      this.minHeap.push(this.maxHeap.pop());
    }
    
    // Balance sizes: allow maxHeap to have at most 1 more element
    if (this.maxHeap.size() > this.minHeap.size() + 1) {
      this.minHeap.push(this.maxHeap.pop());
    } else if (this.minHeap.size() > this.maxHeap.size()) {
      this.maxHeap.push(this.minHeap.pop());
    }
  }
  
  findMedian() {
    if (this.maxHeap.size() === this.minHeap.size()) {
      return (this.maxHeap.peek() + this.minHeap.peek()) / 2;
    }
    return this.maxHeap.peek(); // maxHeap has one extra element
  }
}

// Scenario: Find median order value in real-time as orders arrive (Zomato dashboard)
const mf = new MedianFinder();
[₹250, ₹499, ₹150, ₹899, ₹320].forEach(p => {
  mf.addNum(p);
  console.log(\`Median order value: ₹\${mf.findMedian()}\`);
});

const orders = [250, 499, 150, 899, 320];
const medFinder = new MedianFinder();
orders.forEach(o => { medFinder.addNum(o); });
console.log(medFinder.findMedian()); // 320 (median of sorted [150,250,320,499,899])

// EXAMPLE 7: Balanced Parentheses and Expression Evaluation (Classic Stack)
function isValid(s) {
  const stack = [];
  const pairs = { ')': '(', '}': '{', ']': '[' };
  
  for (const c of s) {
    if ('({['.includes(c)) {
      stack.push(c);
    } else if (pairs[c]) {
      if (stack.pop() !== pairs[c]) return false; // Mismatch
    }
  }
  
  return stack.length === 0; // Stack empty = all matched
}

console.log(isValid("()[]{}")); // true
console.log(isValid("([)]"));   // false

// Evaluate Reverse Polish Notation (postfix expression)
function evalRPN(tokens) {
  const stack = [];
  const ops = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => Math.trunc(a / b), // Truncate toward zero
  };
  
  for (const token of tokens) {
    if (ops[token]) {
      const b = stack.pop(), a = stack.pop(); // b is second operand
      stack.push(ops[token](a, b));
    } else {
      stack.push(Number(token));
    }
  }
  
  return stack[0];
}

console.log(evalRPN(["2","1","+","3","*"])); // (2+1)*3 = 9
console.log(evalRPN(["4","13","5","/","+"])); // 4 + (13/5) = 6
    `,
    bugs: `
REAL PRODUCTION BUGS FROM STACK/HEAP MISUNDERSTANDING:
-------------------------------------------------------

BUG 1: Using array .shift() as queue in BFS — O(n²) total complexity
  Scenario: BFS-based recommendation engine processing 500,000 users.
    Expected <1 second, ran in 45 minutes.
  Root cause: JavaScript arrays are not O(1) queues. .shift() is O(n) — shifts all elements.
    Total BFS: O(V) .shift() calls × O(V) each = O(V²).
  Fix (Option A): Use a proper deque/queue class with head pointer:
    class Queue {
      constructor() { this.items = {}; this.head = 0; this.tail = 0; }
      enqueue(item) { this.items[this.tail++] = item; }
      dequeue() { return this.items[this.head++]; }
      size() { return this.tail - this.head; }
    }
  Fix (Option B): For non-performance-critical BFS, use two arrays (current/next level).

BUG 2: Min-heap used to find K largest elements — returning K smallest instead
  Scenario: Dashboard showing "Top 10 highest-value transactions." Showed smallest 10 instead.
  Root cause: Developer used max-heap to maintain all elements, thinking max-heap gives largest.
    Actually needed: min-heap of size K (to efficiently evict the smallest when new larger arrives).
    Used wrong heap type: max-heap of size K was evicting the LARGEST (heap's max = pop target).
  Fix: For K LARGEST: use MIN-heap of size K (pop when size > K → pops minimum → keeps larger).
    For K SMALLEST: use MAX-heap of size K (pop when size > K → pops maximum → keeps smaller).
    Mnemonic: "To keep K largest, throw out smallest (min-heap pops minimum)."

BUG 3: Monotonic stack popping wrong direction — off-by-one in width calculation
  Scenario: Histogram area calculator for data visualization produced areas slightly off.
  Wrong code for width when stack has previous element:
    const width = i - stack.at(-1); // Bug: should be i - stack.at(-1) - 1
    // Includes the element at stack.at(-1) itself in the width!
  Fix: width = stack.length ? i - stack.at(-1) - 1 : i;
    // -1 because stack.at(-1) is the LEFT BOUNDARY (exclusive), not part of the rectangle.

BUG 4: Median finder with unbalanced heaps — wrong median returned
  Scenario: Real-time bidding analytics median price was consistently wrong.
  Root cause: addNum() added to minHeap first instead of maxHeap.
    An element that SHOULD be in the left half (maxHeap) was added to right half (minHeap).
    The invariant "maxHeap.top <= minHeap.top" was violated silently.
  Code: this.minHeap.push(num); // WRONG — should push to maxHeap first
  Fix: ALWAYS push to maxHeap first, then balance.
    The first push to maxHeap ensures the element is compared against the current max of left half.
    Then if it's larger than minHeap's top, it moves to minHeap — maintaining invariant.

BUG 5: Stack overflow from recursive DFS — should use explicit stack
  Scenario: File system crawler using recursive DFS on directories.
    Worked in development (shallow directories). Crashed in production:
    "RangeError: Maximum call stack size exceeded" on a directory tree 50,000 levels deep.
  Root cause: Each recursive call adds a frame to the call stack.
    V8's default call stack: ~10,000 frames. Deep directory = stack overflow.
  Fix: Convert recursive DFS to iterative using explicit stack:
    function crawl(root) {
      const stack = [root];
      while (stack.length) {
        const dir = stack.pop(); // Explicit stack on heap — no call stack limit!
        process(dir);
        for (const child of dir.children) stack.push(child);
      }
    }
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — TRACE THE MONOTONIC STACK:
  Array: [3, 1, 4, 1, 5, 9, 2, 6]
  
  a) Run the "Next Greater Element" algorithm step by step.
     Show stack state after each element is processed.
     Final result array?
  
  b) For Largest Rectangle in Histogram with heights [2,4,2,1,3]:
     Trace the stack as you add each bar and the sentinel 0.
     When is each bar popped? What area is computed for each popped bar?
     Maximum area?
  
  c) For Sliding Window Maximum with [3,1,1,1,2] and k=3:
     Show deque state (indices) after processing each element.
     Final result array?

CHALLENGE 2 — FIX THE HEAP OPERATIONS:
  This "K closest points to origin" solution has a bug causing wrong output.
  
  function kClosest(points, k) {
    // Sort by distance descending — should be ascending?
    points.sort((a, b) => {
      const distB = b[0]**2 + b[1]**2;
      const distA = a[0]**2 + a[1]**2;
      return distB - distA; // Bug: sorts descending — we want ascending for closest
    });
    return points.slice(0, k); // Returns k farthest instead of k closest!
  }
  
  a) Fix using sort (O(n log n)).
  b) Rewrite using a max-heap of size K for O(n log K):
     Keep K closest points in a MAX-heap (pop farthest when size > K).
     Describe the algorithm step by step before coding.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Implement a TaskScheduler that processes tasks with cooldown periods.
  
  Problem: Given a list of tasks (characters A-Z) and a cooldown n,
  find the minimum time units to finish all tasks.
  Same task cannot run until n time units have passed since last run.
  CPU can be idle between tasks.
  
  Example: tasks=["A","A","A","B","B","B"], n=2
  → A→B→idle→A→B→idle→A→B = 8 time units
  
  Approach: Greedy with max-heap
  1. Count frequency of each task.
  2. Use a max-heap to always pick the most frequent unblocked task.
  3. Use a queue to track "on cooldown" tasks: [(freq, available_time)]
  4. At each time unit: if heap has tasks → run highest freq. Else: idle.
  5. After n+1 time units: release from cooldown queue back to heap.
  
  Implement with O(n × k) time where n = total tasks, k = unique tasks.
  Extend: return the actual task order (not just the count).
    `,
    summary: `Stacks and queues are the implementation backbone of DFS and BFS respectively — the choice between them determines whether you explore depth-first or breadth-first. Heaps (priority queues) are indispensable for streaming problems: Top-K, median, and scheduling all require the ability to efficiently access the extremum of a dynamic set. The monotonic stack pattern is the key insight that converts O(n²) "scan backward for first smaller/larger" into O(n) — once recognized, it applies to dozens of problems.`
  },

  {
    id: 8,
    title: "Dynamic Programming — Patterns, Optimization & Space",
    tag: "REMEMBERING TO AVOID RECOMPUTING",
    color: "#0C4A6E",
    tldr: `Dynamic programming solves problems by breaking them into overlapping subproblems, solving each subproblem once, and storing results to avoid recomputation. Every DP problem has two components: optimal substructure (optimal solution uses optimal solutions to subproblems) and overlapping subproblems (same subproblems appear repeatedly). The key skill is identifying the DP pattern: linear, grid, interval, knapsack, or string — each has a template that covers dozens of problems.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"How do I know when a problem needs DP vs greedy vs recursion?"
  → DP signal words: "maximum/minimum," "number of ways," "can we achieve X?"
  → Plus: problem has overlapping subproblems (naive recursion recomputes same states).
  → Greedy: locally optimal choice leads to globally optimal (no need to reconsider past choices).
  → If greedy doesn't obviously work and recursive choices overlap → DP.

"Top-down (memoization) vs bottom-up (tabulation) — which should I use?"
  → Top-down: Write recursive solution, add memo. Easier to think about, only computes needed states.
  → Bottom-up: Iterative, fills table in order. Better cache performance, no recursion overhead.
  → For interviews: top-down first (easier to derive). For production: bottom-up (no stack overflow).

"I get 1D DP but 2D DP (grid, strings) confuses me"
  → 2D DP: dp[i][j] represents state involving both the first i elements of one thing
    AND the first j elements of another (two strings, two sequences, row/col in grid).
  → Template is the same: define state, write recurrence, set base cases.

"Space optimization — how do I reduce O(n²) DP to O(n)?"
  → If dp[i][j] only depends on dp[i-1][...] (previous row): only keep two rows.
  → If dp[i][j] only depends on dp[i][j-1] (previous column in same row): just one row.
  → LCS, edit distance, coin change: all reducible to O(n) space.

"LIS in O(n log n) — how is that even possible?"
  → Patience sorting: maintain "piles" where each pile's top card is the smallest card
    that can end a subsequence of that length. Binary search finds where new card goes.
    `,
    analogy: `
THE CLIMBING STAIRS ANALOGY:
-----------------------------
You're climbing a staircase to the 10th floor. You can take 1 or 2 steps at a time.
How many distinct ways can you reach the 10th floor?

NAIVE RECURSION (without DP):
  ways(10) = ways(9) + ways(8)  // Take 1 step from floor 9, or 2 steps from floor 8
  ways(9)  = ways(8) + ways(7)
  ways(8)  = ways(7) + ways(6)
  ...
  ways(8) is computed TWICE (once from ways(10) and once from ways(9))!
  For n=40: 2³⁸ ≈ 275 billion computations. This is O(2ⁿ).

MEMOIZATION (top-down DP):
  Add a sticky note to each stair: "ways from this stair = X"
  Once computed, never compute again — just read the note.
  From 2ⁿ → O(n). Each stair computed once.

TABULATION (bottom-up DP):
  Start from the bottom: ways(0)=1, ways(1)=1.
  Work up: ways(i) = ways(i-1) + ways(i-2).
  Like Fibonacci! Fill a table from left to right.

SPACE OPTIMIZATION:
  To compute ways(i), you only need ways(i-1) and ways(i-2).
  Don't need the whole table — just keep two variables!
  From O(n) space → O(1) space.

THE KNAPSACK ANALOGY (0/1 Knapsack):
  You're packing for a trek to Ladakh. Bag capacity: 10kg.
  Items: tent (3kg, value 8), sleeping bag (4kg, value 5), food (2kg, value 3), camera (1kg, value 4).
  Goal: maximize total value without exceeding 10kg weight.
  
  Decision for each item: TAKE IT or LEAVE IT.
  dp[i][w] = max value using first i items with capacity w.
  For each item: max(skip it, take it if it fits).

THE PATIENCE SORT (LIS) ANALOGY:
  You're sorting a deck of cards face-down into piles.
  Rule: place card on leftmost pile whose top card is ≥ current card.
  If no such pile: create new pile.
  Number of piles at end = length of longest increasing subsequence!
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — DP PATTERNS:
-----------------------------------------

DP RECIPE:
  1. Define the state: dp[i] or dp[i][j] = what?
  2. Write the recurrence: how does dp[i] depend on previous states?
  3. Set base cases: what are the simplest states?
  4. Determine order: which states must be computed before others?
  5. Extract answer: which state contains the final answer?

PATTERN 1 — LINEAR DP:
  dp[i] depends only on dp[i-1] or a few previous states.
  Examples: climbing stairs, house robber, max profit from stock prices.
  
  House Robber: dp[i] = max(dp[i-1], dp[i-2] + nums[i])
    (Either skip house i, or rob it and skip house i-1)
  
  Space optimization: two variables prev2, prev1 instead of O(n) array.

PATTERN 2 — GRID DP:
  dp[r][c] = some value at cell (r, c) considering cells above/left.
  Examples: unique paths, minimum path sum, coin change 2D.
  
  Unique Paths: dp[r][c] = dp[r-1][c] + dp[r][c-1]
    (Came from above or from left)
  
  Space optimization: single row array, update left to right.

PATTERN 3 — 0/1 KNAPSACK:
  dp[i][w] = best value using first i items with weight limit w.
  Recurrence: dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i])
    (Skip item i OR take item i if it fits)
  
  Space optimization: process w in DECREASING order with 1D array.
    WHY DECREASING? If we go left to right, dp[w-weight[i]] was already updated
    with item i (we'd use item i twice → unbounded knapsack, not 0/1).
  
  Unbounded Knapsack (items can be used multiple times):
    dp[w] = max(dp[w], dp[w - weight[i]] + value[i])
    Process w in INCREASING order (allows reusing same item).

PATTERN 4 — STRING DP (Two-Sequence):
  dp[i][j] = answer for first i chars of s1 and first j chars of s2.
  
  LCS (Longest Common Subsequence):
    if s1[i-1] == s2[j-1]: dp[i][j] = dp[i-1][j-1] + 1  (both match)
    else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])          (skip one)
  
  Edit Distance:
    if s1[i-1] == s2[j-1]: dp[i][j] = dp[i-1][j-1]        (no op needed)
    else: dp[i][j] = 1 + min(dp[i-1][j],    // Delete from s1
                              dp[i][j-1],    // Insert into s1
                              dp[i-1][j-1])  // Replace in s1

PATTERN 5 — INTERVAL DP:
  dp[i][j] = answer for subarray/substring from index i to j.
  Fill table by increasing interval length.
  Examples: matrix chain multiplication, burst balloons, palindrome partitioning.
  
  Palindrome Partitioning (minimum cuts):
    For interval [i, j]: if palindrome, 0 cuts.
    Otherwise: min cuts = min over all k in [i, j-1] of (dp[i][k] + dp[k+1][j] + 1)

LONGEST INCREASING SUBSEQUENCE — O(n log n):
  Maintain array 'tails' where tails[i] = smallest tail element of all
  increasing subsequences of length i+1 seen so far.
  
  For each num in nums:
    Binary search for leftmost index where tails[idx] >= num.
    If found: replace tails[idx] = num (smaller tail = more future potential).
    If not found: append num (extends longest subsequence).
  Length of LIS = tails.length.
  
  Key insight: tails is always sorted (can binary search it).
  This does NOT give you the actual subsequence — only the length.
  To reconstruct: need additional tracking array.

DP vs GREEDY DECISION:
  Coin change: greedy (always pick largest coin) FAILS for some denominations.
    [1, 3, 4], amount=6: greedy → 4+1+1=3 coins. DP → 3+3=2 coins. DP wins.
  Activity selection: greedy (pick activity ending earliest) works perfectly. No DP needed.
  
  Rule of thumb: if "locally optimal choice" can be proven to give globally optimal → greedy.
  Otherwise: DP explores all options (via subproblem memoization).

SPACE OPTIMIZATION PATTERNS:
  Only need previous row → O(n) instead of O(n²).
  Only need previous two values → O(1) instead of O(n).
  
  For 0/1 knapsack: traverse capacity in REVERSE to avoid using item twice.
  For grid DP: use single row array, update in-place left to right.
    `,
    code: `
// ===== DYNAMIC PROGRAMMING — CODE EXAMPLES =====

// EXAMPLE 1: 1D DP — House Robber (Classic Linear DP)
// Max money robbing non-adjacent houses
// Scenario: Max discount vouchers to claim (can't claim adjacent vouchers)
function rob(nums) {
  if (nums.length === 1) return nums[0];
  
  // dp[i] = max money robbing houses 0..i
  // dp[i] = max(skip house i = dp[i-1], rob house i = dp[i-2] + nums[i])
  let prev2 = 0;           // dp[i-2]
  let prev1 = nums[0];    // dp[i-1]
  
  for (let i = 1; i < nums.length; i++) {
    const curr = Math.max(prev1, prev2 + nums[i]);
    prev2 = prev1;
    prev1 = curr;
  }
  
  return prev1; // O(n) time, O(1) space
}

// Scenario: Voucher values along a street in Bengaluru
const vouchers = [₹200, ₹150, ₹600, ₹300, ₹450, ₹800];
const voucherNums = [200, 150, 600, 300, 450, 800];
console.log(rob(voucherNums)); // 200+600+800 = 1600 (skip adjacent)

// EXAMPLE 2: 0/1 Knapsack — with space optimization
// Scenario: Delivery route selection — maximize revenue within time budget
function knapsack01(weights, values, capacity) {
  const n = weights.length;
  // Space-optimized: 1D dp array, traverse capacity in REVERSE
  const dp = new Array(capacity + 1).fill(0);
  
  for (let i = 0; i < n; i++) {
    // REVERSE iteration: prevents using item i twice (0/1 property)
    for (let w = capacity; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
      // dp[w] = skip item i (dp[w]) vs take item i (dp[w-weight] + value)
    }
  }
  
  return dp[capacity];
}

const routes = { weights: [2, 3, 4, 5], values: [3, 4, 5, 6] };
console.log(knapsack01(routes.weights, routes.values, 8)); // 10 (items 1+2+1? → best combination)

// Coin Change (Unbounded Knapsack — coins reusable)
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0; // Base case: 0 coins to make amount 0
  
  for (const coin of coins) {
    // FORWARD iteration: each coin usable multiple times
    for (let w = coin; w <= amount; w++) {
      dp[w] = Math.min(dp[w], dp[w - coin] + 1);
    }
  }
  
  return dp[amount] === Infinity ? -1 : dp[amount];
}

// Payment denominations: ₹1, ₹5, ₹10, ₹20, ₹50, ₹100, ₹200, ₹500
console.log(coinChange([1, 5, 10, 20, 50, 100, 200, 500], 330)); // Minimum coins for ₹330

// EXAMPLE 3: 2D DP — LCS and Edit Distance
// Scenario: Fuzzy name matching for customer deduplication (Priya vs Prya — edit distance?)
function editDistance(word1, word2) {
  const m = word1.length, n = word2.length;
  // dp[i][j] = min edits to convert word1[0..i-1] to word2[0..j-1]
  
  // Space-optimized: two rows (previous and current)
  let prev = Array.from({ length: n + 1 }, (_, j) => j); // Base: "" to word2[0..j-1] = j insertions
  
  for (let i = 1; i <= m; i++) {
    const curr = new Array(n + 1);
    curr[0] = i; // Base: word1[0..i-1] to "" = i deletions
    
    for (let j = 1; j <= n; j++) {
      if (word1[i-1] === word2[j-1]) {
        curr[j] = prev[j-1]; // Characters match — no operation
      } else {
        curr[j] = 1 + Math.min(
          prev[j],    // Delete from word1
          curr[j-1],  // Insert into word1
          prev[j-1]   // Replace in word1
        );
      }
    }
    prev = curr;
  }
  
  return prev[n];
}

console.log(editDistance("Priya", "Prya"));   // 1 (delete 'i')
console.log(editDistance("intention", "execution")); // 5

// LCS — Longest Common Subsequence
function lcs(text1, text2) {
  const m = text1.length, n = text2.length;
  let prev = new Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    const curr = new Array(n + 1).fill(0);
    for (let j = 1; j <= n; j++) {
      if (text1[i-1] === text2[j-1]) curr[j] = prev[j-1] + 1;
      else curr[j] = Math.max(prev[j], curr[j-1]);
    }
    prev = curr;
  }
  
  return prev[n];
}

console.log(lcs("abcde", "ace")); // 3 ("ace")

// EXAMPLE 4: Grid DP — Unique Paths with Obstacles
function uniquePathsWithObstacles(obstacleGrid) {
  const m = obstacleGrid.length, n = obstacleGrid[0].length;
  const dp = new Array(n).fill(0);
  dp[0] = obstacleGrid[0][0] === 1 ? 0 : 1; // Start blocked or not
  
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (obstacleGrid[r][c] === 1) {
        dp[c] = 0; // Blocked cell: no paths through here
      } else if (c > 0) {
        dp[c] += dp[c-1]; // Paths from left (dp[c] already has paths from above)
      }
    }
  }
  
  return dp[n-1];
}

// EXAMPLE 5: LIS — O(n log n) with patience sorting
function longestIncreasingSubsequence(nums) {
  const tails = []; // tails[i] = smallest tail of all IS of length i+1
  
  for (const num of nums) {
    // Binary search: find leftmost position where tails[idx] >= num
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (tails[mid] < num) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = num; // Replace or extend
  }
  
  return tails.length; // Length of LIS
}

// Also reconstruct the actual LIS:
function lisWithReconstruction(nums) {
  const n = nums.length;
  const tails = [];
  const indices = []; // indices[i] = index in nums where tails[i] came from
  const parent = new Array(n).fill(-1);
  const posInTails = new Array(n); // posInTails[i] = where nums[i] sits in tails
  
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (tails[mid] < nums[i]) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = nums[i];
    indices[lo] = i;
    posInTails[i] = lo;
    if (lo > 0) parent[i] = indices[lo - 1]; // Track previous element in IS
  }
  
  // Reconstruct by following parent pointers
  const result = [];
  let idx = indices[tails.length - 1];
  while (idx !== -1) { result.push(nums[idx]); idx = parent[idx]; }
  return result.reverse();
}

const stockPrices = [10, 9, 2, 5, 3, 7, 101, 18];
console.log(longestIncreasingSubsequence(stockPrices)); // 4 ([2,3,7,101] or [2,5,7,101])
console.log(lisWithReconstruction(stockPrices)); // [2, 3, 7, 101]

// EXAMPLE 6: Interval DP — Burst Balloons
// Points from bursting balloon i = nums[left]*nums[i]*nums[right]
// Balloons on BOTH sides remain until i is burst last within [left, right]
function maxCoins(nums) {
  // Add sentinel balloons: 1 on each side
  const arr = [1, ...nums, 1];
  const n = arr.length;
  
  // dp[i][j] = max coins from bursting all balloons strictly between i and j
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  
  // Fill by increasing interval length (gap between i and j)
  for (let len = 2; len < n; len++) {        // gap between i and j
    for (let i = 0; i < n - len; i++) {
      const j = i + len;
      for (let k = i + 1; k < j; k++) {      // k = last balloon to burst in (i,j)
        dp[i][j] = Math.max(dp[i][j],
          dp[i][k] + arr[i]*arr[k]*arr[j] + dp[k][j]
        );
      }
    }
  }
  
  return dp[0][n-1];
}

console.log(maxCoins([3, 1, 5, 8])); // 167

// EXAMPLE 7: DP on Strings — Palindromic Substrings / Count
function countPalindromicSubstrings(s) {
  const n = s.length;
  let count = 0;
  
  // Expand around each center (O(n²) time, O(1) space — better than DP!)
  function expand(left, right) {
    while (left >= 0 && right < n && s[left] === s[right]) {
      count++;
      left--;
      right++;
    }
  }
  
  for (let i = 0; i < n; i++) {
    expand(i, i);     // Odd length palindromes
    expand(i, i + 1); // Even length palindromes
  }
  
  return count;
}

console.log(countPalindromicSubstrings("abc"));  // 3 (a, b, c)
console.log(countPalindromicSubstrings("aaa"));  // 6 (a,a,a,aa,aa,aaa)
    `,
    bugs: `
REAL PRODUCTION BUGS FROM DP MISUNDERSTANDING:
-----------------------------------------------

BUG 1: Wrong iteration order in 0/1 knapsack — items used multiple times
  Scenario: Subscription plan optimizer incorrectly allowing the same add-on to be selected multiple times.
    "Maximum value within budget" DP returned values higher than should be possible.
  Root cause: 0/1 knapsack (each item usable once) was implemented with FORWARD capacity iteration.
    Forward iteration allows item i to be used multiple times:
    dp[w] = max(dp[w], dp[w-weight] + value) — if dp[w-weight] already includes item i, item i used twice!
  Fix: Iterate capacity in REVERSE (descending) for 0/1 knapsack:
    for (let w = capacity; w >= weights[i]; w--) // Process larger capacities first
    This ensures dp[w-weight[i]] hasn't been updated by item i yet when we process dp[w].

BUG 2: Off-by-one in base cases — first row/column not initialized
  Scenario: Edit distance algorithm returning wrong results for strings that start with common prefix.
  Root cause: Base cases for edit distance:
    dp[i][0] = i (converting word1[0..i-1] to "" requires i deletions)
    dp[0][j] = j (converting "" to word2[0..j-1] requires j insertions)
    Code forgot to initialize dp[i][0] = i → defaults to 0 → wrong answers for all rows.
  Fix:
    const dp = Array.from({ length: m+1 }, (_, i) => new Array(n+1).fill(0).map((_, j) => i+j === 0 ? 0 : i || j));
    // More clearly: for (let i=0;i<=m;i++) dp[i][0]=i; for (let j=0;j<=n;j++) dp[0][j]=j;

BUG 3: LIS returning wrong length due to binary search boundary error
  Scenario: "Find the length of longest increasing subsequence" in a competitive programming submission. Wrong answer on specific test cases with duplicates.
  Root cause: For strictly increasing subsequence: binary search for LEFTMOST position where tails[mid] >= num (use <).
    For non-decreasing: search for LEFTMOST position where tails[mid] > num (use <=).
    Mixed up the two variants — strictly increasing but used > comparator → allowed duplicates.
  Fix:
    // Strictly increasing: replace first element >= num
    if (tails[mid] < num) lo = mid + 1; // Only advance if strictly less
    // Non-decreasing: replace first element > num  
    if (tails[mid] <= num) lo = mid + 1; // Advance past equals (allows same value)

BUG 4: Space-optimized DP using single array but forgetting to copy — using updated values
  Scenario: LCS space optimization gave wrong answer. Standard 2D table gave correct answer.
  Root cause: Space optimization with single array modifies dp[j] in place.
    When computing dp[j], we need the OLD value of dp[j-1] (before current row update).
    But dp[j-1] was already updated in the current row iteration!
    This turns LCS into something different (not LCS).
  Fix: Save dp[j-1]'s old value before updating:
    let prevDiag = dp[0]; // Save dp[i-1][j-1] before overwriting
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]; // Save before overwriting (this becomes prev for j+1)
      if (text1[i-1] === text2[j-1]) dp[j] = prevDiag + 1;
      else dp[j] = Math.max(dp[j], dp[j-1]);
      prevDiag = temp;
    }

BUG 5: Memoization cache using wrong key — different states mapping to same cache entry
  Scenario: Recursive DP for "number of ways to tile a 2×n board."
    Returned same answer for different n values — looked like the memo was caching incorrectly.
  Root cause: Memoization using object {} as cache, but key was a floating-point computation.
    Key: dp[n] where n was computed as a float — 2.0000000001 and 2.0 mapped to different keys
    when they should map to the same. Some inputs caused n to be off by epsilon.
  Fix: Always use integer or string keys for DP memo:
    const key = \`\${n}\`; // Explicit string conversion
    Or use an integer array (dp = new Array(n+1).fill(-1)) — avoids hashing entirely.
    Root cause: input was being divided without Math.floor — ensure DP state is always integer.
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — TRACE THE DP:
  Coin Change: coins=[1,5,11], amount=15
  
  a) Fill the dp array step by step for amount 0 to 15.
     Start: dp = [0, Inf, Inf, Inf, Inf, Inf, Inf, Inf, Inf, Inf, Inf, Inf, Inf, Inf, Inf, Inf]
     Show dp array after processing each coin denomination.
     Final answer?
  
  b) Surprising result: greedy (pick largest coin ≤ remaining) gives 11+1+1+1+1 = 5 coins.
     DP gives? Is DP better here? Explain why greedy fails.
  
  c) What changes if we make this 0/1 knapsack (each coin usable once)?
     Describe the iteration order change and trace for coins=[1,5,11], amount=12.

CHALLENGE 2 — FIX THE LCS BUG:
  This LCS implementation has a space optimization bug.
  It gives wrong answers for strings like "abcde" and "ace".
  
  function lcsBuggy(text1, text2) {
    const m = text1.length, n = text2.length;
    const dp = new Array(n + 1).fill(0);
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {  // Bug: processing order lost diagonal
        if (text1[i-1] === text2[j-1]) {
          dp[j] = dp[j-1] + 1; // Bug: dp[j-1] is CURRENT row's value, not previous row's!
        } else {
          dp[j] = Math.max(dp[j], dp[j-1]);
        }
      }
    }
    return dp[n];
  }
  
  Fix the bug. Hint: you need to preserve the "diagonal" value (dp[i-1][j-1]).
  What variable should you introduce and where should it be updated?

CHALLENGE 3 — BUILD FROM SCRATCH:
  Implement THREE related DP problems showing the pattern evolution:
  
  A) Word Break: Given string s and dictionary wordDict, return true if s can be
     segmented into dictionary words.
     Input: s="applepenapple", wordDict=["apple","pen"]
     Output: true ("apple"+"pen"+"apple")
     State: dp[i] = can we segment s[0..i-1]?
  
  B) Word Break II: Return ALL possible segmentations (not just true/false).
     Input: same as A
     Output: ["apple pen apple"]
     Approach: memoized DFS, not tabulation (exponential output = can't avoid).
  
  C) Concatenated Words: Given a list of words, find all words that are formed
     by concatenating two or more shorter words from the same list.
     Input: ["cat","cats","catsdogcats","dog","dogcatsdog","hippokats","rat"]
     Output: ["catsdogcats","dogcatsdog"]
     Approach: For each word, run Word Break I with remaining words as dictionary.
  
  For each: state definition, recurrence, base cases, time/space complexity.
    `,
    summary: `Dynamic programming is pattern recognition: once you identify which of the five templates applies (linear, knapsack, string/2D, grid, interval), the recurrence follows naturally. The two universal rules are: define state precisely before writing recurrence, and always verify base cases. Space optimization (rolling array) is an almost-free upgrade — reduce O(n²) tables to O(n) by only keeping what the recurrence actually needs. LIS in O(n log n) via patience sorting is the canonical example of using binary search to improve DP.`
  },

  {
    id: 9,
    title: "Backtracking — Subsets, Permutations & Pruning",
    tag: "TRY EVERYTHING, UNDO WHAT FAILS",
    color: "#065F46",
    tldr: `Backtracking is systematic trial-and-error: make a choice, explore consequences, undo the choice if it doesn't lead to a solution (backtrack), and try the next option. It generates all combinations/permutations/subsets, solves constraint satisfaction problems (N-Queens, Sudoku), and handles any "find all valid configurations" problem. The key optimization is pruning: skip branches early when they can't possibly lead to valid solutions.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"Backtracking vs recursion — what's the difference?"
  → All backtracking IS recursion. Not all recursion is backtracking.
  → Backtracking specifically: make choice → recurse → UNDO choice (undo/restore state).
  → The "undo" step is what distinguishes backtracking from regular DFS.

"When do I use backtracking vs DP?"
  → DP: count or optimize (number of ways, min cost). Overlapping subproblems.
  → Backtracking: enumerate all solutions or find any one solution. No overlapping structure.
  → Signal: "return all/find all" → backtracking. "count/maximize/minimize" → DP.

"My backtracking solution generates duplicates — why?"
  → Permutations with duplicate elements: [1, 1, 2] generates [1₁, 1₂, 2] and [1₂, 1₁, 2].
  → Fix: sort array first, skip duplicate choices at the same recursion level.

"How do I prune effectively? My backtracking is too slow."
  → Pruning: check constraint BEFORE recursing, not after.
  → For sum problems: if currentSum > target → skip (no point going deeper).
  → For N-Queens: track occupied columns and diagonals → O(1) validity check per placement.

"I can't figure out the template. Every problem seems different."
  → They all use ONE template: apply choice → recurse → undo choice.
  → The variations are: what IS the "choice," what IS the "constraint," when do we "collect result."
    `,
    analogy: `
THE MAZE SOLVER ANALOGY:
--------------------------
You're navigating a maze with a pencil (to mark your path) and an eraser.

1. CHOOSE a direction (North, South, East, West).
2. WALK that direction (recurse deeper into the maze).
3. If you hit a DEAD END (constraint violated) or FOUND THE EXIT (result):
   → Dead end: erase your footprints (undo), go back to last junction.
   → Exit: record your path as a solution!
4. Try the next direction from the junction.

APPLY → RECURSE → UNDO = the backtracking heartbeat.

SUBSETS = CHOOSING ITEMS FROM A MENU:
  Menu: [pizza, burger, pasta, salad]. How many distinct orders can you make?
  At each item, you have 2 choices: ORDER it or SKIP it.
  2 × 2 × 2 × 2 = 16 total subsets (including empty order).
  Build it step by step: try adding pizza → recurse → remove pizza → try without pizza → recurse.

PERMUTATIONS = ARRANGING SEATS:
  3 people (A, B, C) at 3 seats. How many arrangements?
  Pick first seat: A or B or C (3 choices).
  Pick second seat: from remaining (2 choices).
  Pick third seat: last one (1 choice).
  3 × 2 × 1 = 6 permutations.
  Backtracking: place A → place B → place C → found one → undo C → undo B → place C → ...

PRUNING = SMART MAZE NAVIGATION:
  Normal: try every path, including dead ends we could have predicted.
  Pruned: if current sum > target → don't try adding more (all values are positive).
    Like seeing a wall in the distance — no need to walk all the way to it.
  N-Queens: if queen attacks in current column → don't try placing (skip whole column).

N-QUEENS = CHESS CONSTRAINT PROPAGATION:
  Place N queens on N×N board, none attacking each other.
  Constraint: no two queens share row, column, or diagonal.
  Backtracking: try placing queen in row 1 at each column.
  For each successful placement: recurse to place queen in row 2.
  If row 2 has no valid column → backtrack, try different column in row 1.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — BACKTRACKING PATTERNS:
--------------------------------------------------

THE UNIVERSAL BACKTRACKING TEMPLATE:
  function backtrack(state, choices, result):
    if is_solution(state):
      result.push(copy_of_state) // Collect result
      return // or continue if looking for all solutions
    
    for choice of choices:
      if is_valid(state, choice):     // Pruning: skip invalid choices
        apply(state, choice)          // Make the choice (modify state)
        backtrack(state, remaining_choices, result) // Recurse deeper
        undo(state, choice)           // UNDO the choice (restore state)

THREE FUNDAMENTAL TEMPLATES:

1. SUBSETS (each element: include or exclude):
  function subsets(nums, start, current, result):
    result.push([...current]) // Every state is a valid subset
    for i from start to n-1:
      current.push(nums[i])
      subsets(nums, i+1, current, result) // i+1: each element used at most once
      current.pop() // UNDO
  
  Time: O(n × 2ⁿ) — 2ⁿ subsets, each takes O(n) to copy.
  Space: O(n) recursion depth.

2. PERMUTATIONS (all orderings, no start index needed):
  function permutations(nums, used, current, result):
    if current.length === nums.length:
      result.push([...current])
      return
    for i from 0 to n-1:
      if used[i]: continue
      used[i] = true
      current.push(nums[i])
      permutations(nums, used, current, result)
      current.pop()
      used[i] = false // UNDO
  
  Time: O(n × n!) — n! permutations, each takes O(n) to copy.

3. COMBINATIONS (choose K from N):
  function combinations(n, k, start, current, result):
    if current.length === k:
      result.push([...current])
      return
    for i from start to n:
      current.push(i)
      combinations(n, k, i+1, current, result)
      current.pop()
  
  Time: O(k × C(n,k)).

HANDLING DUPLICATES (subsets/permutations with duplicate elements):
  Input: [1, 1, 2] — would generate duplicate subsets without handling.
  
  Step 1: Sort the input array.
  Step 2: At each recursion level, skip duplicate choices:
    for (let i = start; i < nums.length; i++) {
      // Skip if same value as previous at this SAME level (not deeper level)
      if (i > start && nums[i] === nums[i-1]) continue; // KEY: i > start, not i > 0
      current.push(nums[i]);
      backtrack(nums, i+1, current, result);
      current.pop();
    }
  
  Why i > start and not i > 0?
    i > 0 would skip the first occurrence of a duplicate even in a FRESH recursion level.
    i > start only skips within the SAME level of recursion (same parent choice made).

N-QUEENS OPTIMIZATION:
  Naive: check entire board for conflicts: O(n) per placement.
  Optimized: track three sets:
    cols: columns with queens
    posDiag: positive diagonals (row + col = constant for same diagonal)
    negDiag: negative diagonals (row - col = constant for same diagonal)
  
  O(1) validity check: queen at (row, col) valid if col ∉ cols AND (row+col) ∉ posDiag AND (row-col) ∉ negDiag.
  Place a queen: add to all three sets.
  Remove a queen: remove from all three sets.

COMBINATION SUM — WITH PRUNING:
  Problem: find all combinations that sum to target (elements reusable).
  Pruning: since array is sorted, if current element > remaining → break (all future elements larger).
  
  Multiplicity of solutions vs speed:
    Without sorting+pruning: explores entire tree.
    With pruning: cuts branches as soon as sum exceeds target.
    For large inputs: essential — O(n^(target/min_coin)) worst case, but pruning makes it tractable.

SUDOKU SOLVER — CONSTRAINT PROPAGATION FIRST, BACKTRACK SECOND:
  Naive backtracking: try 1-9 for each empty cell → 9^81 combinations (astronomical).
  With constraint propagation: each number placed eliminates candidates in row/col/box.
  Most cells reduced to 1 possibility before backtracking needed → practically instant.

COMPLEXITY OF BACKTRACKING:
  Generally O(b^d) where b = branching factor (choices per level), d = depth (length of solution).
  Subsets: O(2ⁿ) — b=2, d=n.
  Permutations: O(n!) — b decreases by 1 each level, total = n × (n-1) × ... × 1.
  Combination Sum: O(n^(target/min)) in worst case — pruning reduces this significantly.
  N-Queens: O(n!) upper bound — constraint propagation makes it much faster in practice.
    `,
    code: `
// ===== BACKTRACKING — CODE EXAMPLES =====

// EXAMPLE 1: Subsets — include/exclude each element
function subsets(nums) {
  const result = [];
  
  function backtrack(start, current) {
    result.push([...current]); // Every prefix is a valid subset
    
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);           // APPLY: include nums[i]
      backtrack(i + 1, current);       // RECURSE: try elements after i
      current.pop();                   // UNDO: exclude nums[i]
    }
  }
  
  backtrack(0, []);
  return result;
}

console.log(subsets([1, 2, 3]));
// [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]] — 2³ = 8 subsets

// Subsets II: handles duplicates
function subsetsWithDup(nums) {
  nums.sort((a, b) => a - b); // Sort first!
  const result = [];
  
  function backtrack(start, current) {
    result.push([...current]);
    for (let i = start; i < nums.length; i++) {
      if (i > start && nums[i] === nums[i-1]) continue; // Skip duplicates at same level
      current.push(nums[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

console.log(subsetsWithDup([1, 2, 2]).length); // 6, not 8 (no duplicates)

// EXAMPLE 2: Permutations — all orderings
function permutations(nums) {
  const result = [];
  
  function backtrack(current, used) {
    if (current.length === nums.length) {
      result.push([...current]); // Found complete permutation
      return;
    }
    
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue; // Skip already used elements
      
      used[i] = true;
      current.push(nums[i]);   // APPLY
      backtrack(current, used); // RECURSE
      current.pop();            // UNDO
      used[i] = false;          // UNDO
    }
  }
  
  backtrack([], new Array(nums.length).fill(false));
  return result;
}

console.log(permutations([1, 2, 3]).length); // 6 (3!)

// Scenario: Generate all team orderings for sprint presentation
// Teams: ['Frontend', 'Backend', 'DevOps']
const teamOrders = permutations(['Frontend', 'Backend', 'DevOps']);
console.log(teamOrders[0]); // ['Frontend', 'Backend', 'DevOps']

// EXAMPLE 3: Combination Sum (with pruning)
// Find all combinations that sum to target, each number usable multiple times
function combinationSum(candidates, target) {
  candidates.sort((a, b) => a - b); // Sort for pruning
  const result = [];
  
  function backtrack(start, current, remaining) {
    if (remaining === 0) {
      result.push([...current]); // Exact sum found
      return;
    }
    
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break; // PRUNE: sorted, so all future are larger
      
      current.push(candidates[i]);
      backtrack(i, current, remaining - candidates[i]); // i, not i+1 (reuse allowed)
      current.pop(); // UNDO
    }
  }
  
  backtrack(0, [], target);
  return result;
}

// Scenario: Find payment combinations equaling ₹30 using denominations [2, 3, 6, 7]
const combos = combinationSum([2, 3, 6, 7], 30);
console.log(\`Found \${combos.length} combinations summing to ₹30\`);
console.log(combos[0]); // [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] etc.

// EXAMPLE 4: N-Queens — with optimized O(1) conflict checking
function solveNQueens(n) {
  const result = [];
  const cols = new Set(), posDiag = new Set(), negDiag = new Set();
  
  function backtrack(row, board) {
    if (row === n) {
      result.push(board.map(col => '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1)));
      return;
    }
    
    for (let col = 0; col < n; col++) {
      // O(1) conflict check using sets!
      if (cols.has(col) || posDiag.has(row + col) || negDiag.has(row - col)) continue;
      
      // APPLY: place queen
      cols.add(col);
      posDiag.add(row + col);
      negDiag.add(row - col);
      board.push(col);
      
      backtrack(row + 1, board);
      
      // UNDO: remove queen
      cols.delete(col);
      posDiag.delete(row + col);
      negDiag.delete(row - col);
      board.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

console.log(solveNQueens(4).length); // 2 solutions for 4×4 board
console.log(solveNQueens(8).length); // 92 solutions for 8×8 board

// EXAMPLE 5: Word Search — backtracking on 2D grid
function wordSearch(board, word) {
  const rows = board.length, cols = board[0].length;
  
  function backtrack(r, c, idx) {
    if (idx === word.length) return true; // All characters matched!
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (board[r][c] !== word[idx]) return false;
    
    const temp = board[r][c];
    board[r][c] = '#'; // APPLY: mark visited (prevent reuse in same path)
    
    const found = backtrack(r+1,c,idx+1) || backtrack(r-1,c,idx+1) ||
                  backtrack(r,c+1,idx+1) || backtrack(r,c-1,idx+1);
    
    board[r][c] = temp; // UNDO: restore cell
    return found;
  }
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (backtrack(r, c, 0)) return true;
    }
  }
  
  return false;
}

const board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']];
console.log(wordSearch(board, "ABCCED")); // true
console.log(wordSearch(board, "ABCB"));   // false (can't reuse B)

// EXAMPLE 6: Palindrome Partitioning — generate all palindrome partitions
function partitionPalindromes(s) {
  const result = [];
  
  function isPalin(str, l, r) {
    while (l < r) if (str[l++] !== str[r--]) return false;
    return true;
  }
  
  function backtrack(start, current) {
    if (start === s.length) {
      result.push([...current]);
      return;
    }
    
    for (let end = start + 1; end <= s.length; end++) {
      if (isPalin(s, start, end - 1)) { // PRUNE: only recurse if palindrome
        current.push(s.slice(start, end));
        backtrack(end, current);
        current.pop(); // UNDO
      }
    }
  }
  
  backtrack(0, []);
  return result;
}

console.log(partitionPalindromes("aab"));
// [["a","a","b"], ["aa","b"]]

// EXAMPLE 7: Sudoku Solver
function solveSudoku(board) {
  function isValid(row, col, num) {
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num) return false; // Same row
      if (board[i][col] === num) return false; // Same column
      if (board[boxRow + Math.floor(i/3)][boxCol + i%3] === num) return false; // Same box
    }
    return true;
  }
  
  function backtrack() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== '.') continue; // Skip filled cells
        
        for (let num = '1'; num <= '9'; num = String.fromCharCode(num.charCodeAt(0)+1)) {
          if (isValid(r, c, num)) {
            board[r][c] = num;        // APPLY
            if (backtrack()) return true; // RECURSE — return true if solved!
            board[r][c] = '.';        // UNDO (only if backtrack returned false)
          }
        }
        
        return false; // No valid number for this cell — backtrack!
      }
    }
    return true; // All cells filled
  }
  
  backtrack();
}
    `,
    bugs: `
REAL PRODUCTION BUGS FROM BACKTRACKING MISUNDERSTANDING:
---------------------------------------------------------

BUG 1: Forgetting to undo — all subsequent results contaminated
  Scenario: Combination generator for a promo campaign produced wrong combinations after the first few.
  Wrong code:
    function backtrack(start, current) {
      result.push([...current]);
      for (let i = start; i < nums.length; i++) {
        current.push(nums[i]);
        backtrack(i + 1, current);
        // BUG: forgot current.pop()! State not restored.
      }
    }
    // After first branch: current = [1,2,3], second branch uses this polluted state!
  Fix: ALWAYS match each push with a pop, each add with a remove.
    The undo step is NOT optional — it's the definition of backtracking.

BUG 2: Pushing reference instead of copy — all results point to same array
  Scenario: Return all permutations. All returned arrays were identical (all equal to last permutation).
  Wrong code: result.push(current); // Pushes REFERENCE to current array
    // When current changes: ALL previous result entries change too!
  Fix: result.push([...current]); // Push a COPY
    // Or: result.push(current.slice());
    // This is the single most common backtracking bug.

BUG 3: Duplicate handling — using i > 0 instead of i > start
  Scenario: "Subsets with duplicates" returned fewer subsets than expected.
    For [1,2,2]: expected 6 subsets, got 5. Skipped [1,2] (one occurrence).
  Wrong code:
    if (i > 0 && nums[i] === nums[i-1]) continue; // Skips FIRST occurrence of 2 at new recursion level!
    // At a fresh recursion (start=1), i=1, i>0 is true — but we DO want to use this first 2!
  Fix:
    if (i > start && nums[i] === nums[i-1]) continue; // Only skip within same recursion level
    // i > start: only skip if we've already tried this value at THIS level

BUG 4: Reusing grid cell in word search — marking visited but not unmarking
  Scenario: Word search returning true for words that required reusing the same cell.
    "ABA" found using cell A twice in single path.
  Wrong code:
    board[r][c] = '#'; // Mark visited
    const found = backtrack(r+1,c,idx+1) || ...;
    // BUG: forgot to restore board[r][c] = temp after search
    // Cell marked # forever — corrupts board for other search paths
  Fix: Always restore:
    const temp = board[r][c];
    board[r][c] = '#';
    const found = /* recurse */;
    board[r][c] = temp; // UNDO: always restore, whether found or not

BUG 5: Missing base case termination — generating longer-than-needed results
  Scenario: Letter combination generator for phone numbers produced combinations longer than phone number.
  Wrong code:
    function backtrack(idx, current) {
      if (idx === digits.length) { result.push(current); } // Only collects when done
      // BUG: no return! Falls through to the for loop below, generates MORE characters!
      for (const char of letters[digits[idx]]) {
        backtrack(idx + 1, current + char);
      }
    }
  Fix: Add return after collecting:
    if (idx === digits.length) { result.push(current); return; } // RETURN is essential!
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — TRACE THE BACKTRACKING:
  Combination Sum: candidates=[2,3], target=7
  
  a) Draw the complete recursion tree. Show at each node:
     - Current combination
     - Remaining target
     - Which branches are pruned and why
  
  b) How many times is backtrack() called total (including pruned calls)?
  
  c) N-Queens for n=4. Fill in:
     - Row 0, col 1: queen placed. Which positions are now blocked for row 1?
     - Row 1, col 3: queen placed. Which positions are now blocked for row 2?
     - Row 2, col ?: only one valid column — which one?
     - Row 3, col ?: only one valid column — which one?
     Complete the solution.

CHALLENGE 2 — FIX THE PERMUTATION BUG:
  This permutation generator with duplicates has 2 bugs:
  
  function permuteUnique(nums) {
    nums.sort((a, b) => a - b);
    const result = [];
    const used = new Array(nums.length).fill(false);
    
    function backtrack(current) {
      if (current.length === nums.length) {
        result.push(current); // Bug 1: pushing reference
        return;
      }
      
      for (let i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        // Bug 2: wrong condition to skip duplicates in permutations
        // Should skip if: nums[i] === nums[i-1] AND used[i-1] === FALSE
        // (if used[i-1] is true: we're in a different path, ok to use nums[i])
        if (i > 0 && nums[i] === nums[i-1] && used[i-1]) continue; // Wrong!
        used[i] = true;
        current.push(nums[i]);
        backtrack(current);
        current.pop();
        used[i] = false;
      }
    }
    
    backtrack([]);
    return result;
  }
  
  Test: permuteUnique([1,1,2]) should return 3 unique permutations.
  Explain why "used[i-1] === false" is the correct condition for permutation dedup.

CHALLENGE 3 — BUILD FROM SCRATCH:
  Implement a complete Boggle solver:
  
  Given an m×n grid of letters and a dictionary of words,
  find all words that can be formed by sequentially adjacent cells
  (horizontally, vertically, or diagonally adjacent). Each cell used at most once per word.
  
  Input:
    board = [['o','a','a','n'],['e','t','a','e'],['i','h','k','r'],['i','f','l','v']]
    words = ["oath","pea","eat","rain","oat","ithe"]
  Output: ["eat","oath"]
  
  Approach: Build a TRIE from all dictionary words. 
  For each cell, DFS/backtrack following trie nodes.
  Prune: if current prefix not in trie → no words start with this prefix → stop.
  
  Key optimizations:
  1. Trie: O(1) prefix check vs O(n×L) per word with Set
  2. Mark word as found in trie (don't report duplicates)
  3. Mark cell visited during DFS path, unmark on backtrack
  
  Implement with:
    - Trie class with insert() and startsWith()
    - DFS with visited marking
    - Result deduplication
    Time complexity: O(m × n × 4^L) where L = max word length
    `,
    summary: `Backtracking is the universal algorithm for "find all valid configurations" problems — its three-step heartbeat (apply, recurse, undo) remains constant whether you're generating subsets, placing queens, or solving Sudoku. The two most important skills are: (1) pruning — check constraints before recursing, never after; and (2) copying results — always push a copy of the current state, never a reference. Once you internalize the template, every backtracking problem reduces to identifying what constitutes a "choice" and what constitutes a "constraint."`,
  },

  {
    id: 10,
    title: "Problem-Solving Framework — Patterns, Signals & Decision Trees",
    tag: "THE META-SKILL THAT TIES IT ALL TOGETHER",
    color: "#78350F",
    tldr: `Expert problem solvers don't solve problems from scratch — they recognize patterns, map signals to techniques, and apply known templates. This concept is the meta-layer: given any problem, how do you systematically identify which of the 15 core patterns applies, estimate complexity from input size, and structure your thinking in an interview. It's the difference between staring blankly and thinking out loud with direction.`,
    problem: `
WHY THIS CONCEPT EXISTS / WHAT CONFUSION IT SOLVES:
----------------------------------------------------
"I understand all the algorithms separately but freeze up in interviews"
  → Interviews test PATTERN RECOGNITION, not just knowledge.
  → With a framework, every problem becomes: identify signal words → map to pattern → apply template.

"How do I know which algorithm to use when the problem is new to me?"
  → Input size n determines feasible complexity: n≤20 → O(2ⁿ) OK. n≤10⁶ → needs O(n log n) or O(n).
  → Problem structure signals the approach: "shortest path" → BFS/Dijkstra. "all combinations" → backtracking.

"I always think of brute force but can't optimize"
  → Optimizations come from recognizing the BOTTLENECK: usually a repeated O(n) search → replace with O(1) hash map.
  → Or a repeated computation of overlapping subproblems → memoize.

"My code works but my time/space complexity analysis is always wrong in interviews"
  → Use the complexity decision tree: identify the dominant operation, count how many times it executes.
  → For recursive solutions: draw recursion tree, count nodes × work per node.

"I lose track in interviews — too much pressure"
  → Use the 5-step framework: understand → examples → brute force → optimize → code.
  → Each step has a time budget. Never skip to coding immediately.
    `,
    analogy: `
THE MEDICAL DIAGNOSIS ANALOGY:
--------------------------------
A new doctor memorizes every disease. An expert doctor RECOGNIZES PATTERNS.

SIGNAL WORDS = SYMPTOMS:
  "Fever + rash + recent travel" → doctor immediately thinks: malaria, dengue, typhoid.
  "Sorted array + find pair + target sum" → algorithm doctor thinks: two pointers.
  
  You're building your "pattern recognition database" from practice.
  After 200+ problems: you see "max in sliding window" → immediately think "monotonic deque."

COMPLEXITY DECISION TREE = DOSAGE CALCULATOR:
  Doctor doesn't guess dose — uses patient weight to calculate.
  n = 10⁸ → you CANNOT do O(n log n). Only O(n) or O(1) fits within 1 second.
  n = 10³ → O(n³) is fine (10⁹ ops in 1s budget, 10⁹/n³ = 1000 safety margin).
  n = 20  → O(2ⁿ) is fine (2²⁰ = 1M, easily fits).

THE 5-STEP PROCESS = CLINICAL PROCEDURE:
  Step 1: UNDERSTAND — repeat the problem back. Clarify constraints, edge cases, input/output types.
  Step 2: EXAMPLES — work through 2-3 concrete examples BY HAND. Find the pattern manually first.
  Step 3: BRUTE FORCE — describe the naive O(n²) or O(2ⁿ) solution in plain English. Don't code it.
  Step 4: OPTIMIZE — apply patterns to improve. What's the bottleneck? Can you reduce the search?
  Step 5: CODE — only now write clean code. Talk through it. Handle edge cases.

THE 15 PATTERNS = MEDICAL SPECIALTIES:
  Just as you'd refer to a cardiologist for heart problems, match problem type to specialist algorithm.
  Once you know the pattern, you know the template, the time complexity, and the edge cases to watch for.
    `,
    deep: `
DEEP TECHNICAL BREAKDOWN — THE COMPLETE PATTERN REFERENCE:
----------------------------------------------------------

INPUT SIZE → FEASIBLE COMPLEXITY (at ~10⁸ operations/second):
  n ≤ 15-20:     O(2ⁿ) or O(n!) → backtracking, bitmask DP, brute force permutations
  n ≤ 100:       O(n³) → 3D DP, Floyd-Warshall, brute force triple loops
  n ≤ 1,000:     O(n²) → 2D DP, quadratic algorithms (bubble sort, naive string matching)
  n ≤ 100,000:   O(n log n) → sorting, heap operations, balanced BST
  n ≤ 1,000,000: O(n) → linear scan, hash map, two pointers, sliding window
  n ≤ 10^9:      O(log n) → binary search, modular exponentiation
  n ≤ 10^18:     O(1) → mathematical formula, constant time lookup

THE 15 CORE PATTERNS + SIGNAL WORDS:

1. TWO POINTERS
   Signals: "sorted array," "pair with sum/difference," "palindrome," "in-place modification"
   When: single sequence or two sequences, often need O(1) space
   Templates: opposite ends, same direction (fast/slow), merge two sorted

2. SLIDING WINDOW
   Signals: "subarray/substring," "contiguous," "longest/shortest window," "maximum/minimum sum of k elements"
   When: optimization over all subarrays/substrings of fixed or variable size
   Templates: fixed window, variable window (expand right, shrink left)

3. PREFIX SUM
   Signals: "range sum query," "sum equals k," "number of subarrays with sum/product condition"
   When: multiple range queries on same array, or counting subarrays with property
   Templates: 1D prefix sum + hash map for "sum equals k"

4. HASH MAP / SET
   Signals: "find pair/triplet," "contains duplicate," "two sum," "group by property," "O(1) lookup"
   When: need fast membership test or key-value association
   Templates: frequency counter, complement lookup, "seen before" tracking

5. BINARY SEARCH
   Signals: "sorted array," "find first/last occurrence," "minimum/maximum value satisfying condition," "rotated sorted array"
   When: search space can be halved, or answer space is monotone
   Templates: exact target, leftmost boundary, rightmost boundary, answer space search

6. TREE TRAVERSAL / RECURSION
   Signals: "binary tree," "BST," "path in tree," "diameter," "depth," "LCA," "serialize"
   When: hierarchical data, divide-and-conquer on trees
   Templates: preorder, inorder, postorder (all three return values up the tree)

7. GRAPH BFS
   Signals: "shortest path," "minimum hops," "level by level," "all shortest paths," "unweighted graph"
   When: minimum distance in unweighted graph, level-order processing
   Templates: standard BFS, multi-source BFS, BFS with state (e.g., [node, distance, keys])

8. GRAPH DFS / BACKTRACKING ON GRAPH
   Signals: "all paths," "count paths," "connected components," "cycle detection," "topological order"
   When: explore all possibilities in graph, count/enumerate paths
   Templates: recursive DFS with visited, iterative DFS with stack

9. DYNAMIC PROGRAMMING (1D)
   Signals: "maximum/minimum cost," "number of ways," "can we achieve X," overlapping choices
   When: optimal substructure + overlapping subproblems in linear sequence
   Templates: house robber, coin change, climbing stairs, stock prices

10. DYNAMIC PROGRAMMING (2D)
    Signals: "two sequences," "grid path," "edit distance," "LCS," "knapsack"
    When: two dimensions of state (two strings, grid coordinates, items + capacity)
    Templates: LCS, edit distance, grid DP, 0/1 knapsack

11. BACKTRACKING
    Signals: "all combinations/permutations/subsets," "find all valid configurations," "N-queens," "sudoku"
    When: need to enumerate all valid solutions, problem has constraints
    Templates: subsets, permutations, combinations, apply-recurse-undo

12. HEAP / PRIORITY QUEUE
    Signals: "K largest/smallest," "top K," "median," "K closest," "merge K sorted"
    When: need efficient access to extremum of dynamic set
    Templates: min-heap of size K for K largest, two heaps for median

13. MONOTONIC STACK / DEQUE
    Signals: "next greater/smaller element," "daily temperatures," "largest rectangle," "sliding window maximum"
    When: need to efficiently track "the most relevant past element" under ordering constraint
    Templates: monotonic decreasing stack (NGE), monotonic deque (sliding max)

14. UNION-FIND
    Signals: "connected components," "dynamic connectivity," "number of islands (with union)," "redundant edge"
    When: dynamic graph where edges are added, need quick connectivity queries
    Templates: path compression + union by rank

15. TRIE
    Signals: "prefix," "autocomplete," "word search in grid," "word break," "common prefix"
    When: need efficient prefix-based string operations
    Templates: insert + search + startsWith, DFS on trie

COMPLEXITY DECISION TREE — RECURSIVE ANALYSIS:
  Step 1: How many distinct subproblems exist?
           → This is your memoization table size (= time complexity if O(1) per state)
  Step 2: How much work per subproblem (excluding recursion)?
           → Multiply this by number of subproblems
  Step 3: Draw the recursion tree:
           → Nodes = subproblems, branches = recursive calls
           → Width × height gives total calls without memoization
           → With memoization: each unique state computed once
  
  Examples:
    fib(n) without memo: O(2ⁿ) nodes in tree, O(1) per node → O(2ⁿ)
    fib(n) with memo: O(n) unique states, O(1) per state → O(n)
    LCS(m,n): O(m×n) states, O(1) per state → O(m×n)
    Coin change(amount, k_coins): O(amount × k) states, O(1) → O(amount × k)

THE 5-STEP INTERVIEW FRAMEWORK:
  
  STEP 1 — UNDERSTAND (2 min):
    Repeat problem back. Ask:
      "Is the array sorted?" "Can values be negative?" "Is the input guaranteed non-empty?"
      "Are there duplicate values?" "What's the expected output for ties?"
      "What's the input size constraint?"
  
  STEP 2 — EXAMPLES (3 min):
    Work 2-3 concrete examples BY HAND, including edge cases:
    Normal case, edge case (empty, single element, all same, negative numbers).
    This often reveals the algorithm naturally.
  
  STEP 3 — BRUTE FORCE (2 min):
    State the obvious O(n²) or O(2ⁿ) solution.
    Never code it, just say: "Brute force: try all pairs, O(n²). Can we do better?"
    Identifies the bottleneck for optimization.
  
  STEP 4 — OPTIMIZE (5 min):
    Ask: "What's the bottleneck?" Usually: a repeated O(n) search → use hash map.
    Apply pattern recognition: what signals do I see?
    State the optimized approach + complexity BEFORE coding.
    Interviewer can correct your approach before you waste time coding wrong solution.
  
  STEP 5 — CODE (15 min):
    Write clean code. Speak out loud. Handle edge cases.
    Test with your examples from Step 2.
    Analyze final complexity.

DECIDING BETWEEN PATTERNS (DISAMBIGUATION):
  
  "Find pair summing to target":
    → Unsorted: hash map (O(n))
    → Sorted: two pointers (O(n), O(1) space)
    → Want indices: hash map (two pointers loses original indices after sorting)
  
  "Shortest path":
    → Unweighted: BFS
    → Weighted, non-negative: Dijkstra
    → Weighted, negative edges: Bellman-Ford
    → All pairs: Floyd-Warshall
  
  "Count/maximize/minimize":
    → Has optimal substructure + overlapping subproblems: DP
    → Greedy choice provably works: Greedy
    → Need to enumerate all: Backtracking (but likely TLE — add memo → DP)
  
  "String/substring problem":
    → Single string, contiguous window: sliding window
    → Two strings, comparison: LCS/edit distance DP
    → Prefix matching: trie
    → Palindrome: expand around center or DP
    `,
    code: `
// ===== PROBLEM-SOLVING FRAMEWORK — CODE EXAMPLES =====

// EXAMPLE 1: The Pattern Recognition Cheatsheet as executable code
// For each pattern, a minimal but complete template

// PATTERN: Two Pointers (Opposite Ends) — used when array is sorted
function twoPointerTemplate(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const val = arr[lo] + arr[hi]; // Or any function of arr[lo], arr[hi]
    if (val === target) return [lo, hi];      // Found
    else if (val < target) lo++;              // Need more: move left pointer right
    else hi--;                                // Need less: move right pointer left
  }
  return null;
}

// PATTERN: Sliding Window (Variable) — used for substring/subarray optimization
function slidingWindowTemplate(arr, isValid) {
  let lo = 0, best = 0;
  let state = {}; // Window state (e.g., char count map)
  
  for (let hi = 0; hi < arr.length; hi++) {
    // Expand: add arr[hi] to state
    // addToState(state, arr[hi]);
    
    while (!isValid(state)) { // Shrink until valid
      // removeFromState(state, arr[lo]);
      lo++;
    }
    
    best = Math.max(best, hi - lo + 1); // Valid window found
  }
  return best;
}

// PATTERN: Binary Search on Answer Space
function binarySearchAnswerTemplate(lo, hi, canAchieve) {
  // Find minimum value in [lo, hi] where canAchieve returns true
  // Assumes: canAchieve(lo) = false, canAchieve(hi) = true, monotone
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (canAchieve(mid)) hi = mid;    // mid might work, try smaller
    else lo = mid + 1;                // mid too small, need larger
  }
  return lo; // Minimum value that works
}

// PATTERN: Backtracking
function backtrackTemplate(choices, state, result) {
  if (isSolution(state)) { result.push([...state]); return; }
  for (const choice of choices) {
    if (isValid(state, choice)) {
      state.push(choice);                                          // APPLY
      backtrackTemplate(nextChoices(choices, choice), state, result); // RECURSE
      state.pop();                                                  // UNDO
    }
  }
}

function isSolution(state) { return false; } // Define per problem
function isValid(state, choice) { return true; } // Define per problem
function nextChoices(choices, choice) { return choices; } // Define per problem

// PATTERN: Top-Down DP with Memoization
function dpTemplate(input, memo = new Map()) {
  const key = JSON.stringify(input); // State key — optimize with better key for performance
  if (memo.has(key)) return memo.get(key);
  
  // Base case(s)
  if (isBaseCase(input)) return baseResult(input);
  
  // Recurrence
  let result = worstCase(); // e.g., -Infinity for max, Infinity for min
  for (const sub of subproblems(input)) {
    result = combine(result, dpTemplate(sub, memo));
  }
  
  memo.set(key, result);
  return result;
}

function isBaseCase(input) { return false; }
function baseResult(input) { return 0; }
function worstCase() { return -Infinity; }
function subproblems(input) { return []; }
function combine(a, b) { return Math.max(a, b); }

// EXAMPLE 2: Complexity Decision Helper — determines feasible approach from n
function getApproachByInputSize(n) {
  if (n <= 15)       return { complexity: 'O(2^n) or O(n!)',     approaches: ['Backtracking', 'Bitmask DP', 'Brute force permutations'] };
  if (n <= 100)      return { complexity: 'O(n^3)',              approaches: ['3D DP', 'Floyd-Warshall', 'Triple nested loop'] };
  if (n <= 1000)     return { complexity: 'O(n^2)',              approaches: ['2D DP', 'Nested two pointers', 'O(n^2) string algorithms'] };
  if (n <= 100000)   return { complexity: 'O(n log n)',          approaches: ['Sorting', 'Heap', 'Segment tree', 'Binary indexed tree'] };
  if (n <= 1000000)  return { complexity: 'O(n)',                approaches: ['Hash map', 'Two pointers', 'Sliding window', 'Linear DP'] };
  if (n <= 1e9)      return { complexity: 'O(log n)',            approaches: ['Binary search', 'Fast exponentiation'] };
  return               { complexity: 'O(1)',                     approaches: ['Math formula', 'Precomputed lookup'] };
}

// Test the decision helper with common interview problem constraints:
console.log(getApproachByInputSize(15));      // Backtracking OK
console.log(getApproachByInputSize(100000));  // Need O(n log n) or better
console.log(getApproachByInputSize(1000000)); // Need O(n)

// EXAMPLE 3: Signal Word → Pattern Mapper
const PATTERN_SIGNALS = {
  'Two Pointers': [
    'sorted array + pair', 'palindrome check', 'in-place modify', 
    'two arrays merge', 'remove duplicates in-place'
  ],
  'Sliding Window': [
    'longest substring', 'shortest subarray', 'contiguous subarray',
    'max sum of k elements', 'minimum window containing'
  ],
  'Prefix Sum': [
    'range sum query', 'subarray sum equals k', 'number of subarrays with sum'
  ],
  'Hash Map': [
    'two sum', 'find duplicate', 'group anagrams', 'first unique',
    'count frequency', 'longest consecutive'
  ],
  'Binary Search': [
    'sorted array find', 'minimum x satisfying condition', 'rotated sorted',
    'koko eating bananas', 'ship packages', 'search 2D matrix'
  ],
  'Tree DFS': [
    'tree path', 'tree diameter', 'tree height', 'serialize tree',
    'LCA', 'validate BST', 'inorder successor'
  ],
  'BFS': [
    'shortest path', 'minimum steps', 'level order', 'rotten oranges',
    'word ladder', 'minimum knight moves'
  ],
  'Dynamic Programming': [
    'maximum profit', 'number of ways', 'can we partition', 'minimum cost to reach',
    'longest increasing subsequence', 'edit distance', 'knapsack'
  ],
  'Backtracking': [
    'all subsets', 'all permutations', 'all combinations', 'generate all',
    'n-queens', 'sudoku', 'palindrome partitioning'
  ],
  'Heap': [
    'top k', 'k largest', 'k smallest', 'k closest', 'median stream',
    'merge k sorted', 'task scheduler'
  ],
  'Monotonic Stack': [
    'next greater element', 'next smaller element', 'daily temperatures',
    'largest rectangle', 'trapping rain water', 'sum of subarray minimums'
  ],
  'Union-Find': [
    'number of connected components', 'dynamic connectivity',
    'redundant connection', 'accounts merge'
  ],
  'Graph': [
    'cycle in directed graph', 'topological sort', 'course schedule',
    'number of islands', 'shortest path weighted'
  ],
  'Trie': [
    'word prefix', 'autocomplete', 'word search in grid',
    'word break', 'replace words with roots'
  ],
};

function identifyPattern(problemDescription) {
  const desc = problemDescription.toLowerCase();
  const matches = [];
  
  for (const [pattern, signals] of Object.entries(PATTERN_SIGNALS)) {
    for (const signal of signals) {
      if (signal.split(' ').every(word => desc.includes(word))) {
        matches.push({ pattern, signal });
        break;
      }
    }
  }
  
  return matches.length > 0 ? matches : [{ pattern: 'Unknown — analyze manually', signal: '' }];
}

// Test:
console.log(identifyPattern("find top k largest elements in a stream"));
// [{pattern: 'Heap', signal: 'top k'}]
console.log(identifyPattern("next greater element for each array position"));
// [{pattern: 'Monotonic Stack', signal: 'next greater element'}]
console.log(identifyPattern("number of ways to climb stairs"));
// [{pattern: 'Dynamic Programming', signal: 'number of ways'}]

// EXAMPLE 4: The Complete Interview Problem-Solving Walkthrough
// Demonstrating the 5-step framework on "Minimum Window Substring"

/*
STEP 1 — UNDERSTAND:
  "Given strings s and t, return the minimum window in s that contains all chars of t."
  Clarifications:
    - Case sensitive? Yes.
    - What if no window exists? Return "".
    - Can t have duplicates? Yes — "AA" requires two A's in window.
    - Input size? s.length up to 10^5 → O(n log n) or O(n) needed.

STEP 2 — EXAMPLES:
  s="ADOBECODEBANC", t="ABC" → "BANC"
  s="A", t="A" → "A"
  s="A", t="B" → ""
  
  Manual trace: what does a window look like?
  First valid window: [A,D,O,B,E,C] covers A,B,C — indices 0-5, length 6.
  Can we shrink? Remove A from left → [D,O,B,E,C] — missing A → invalid.
  Move right → find next A → BANC = indices 9-12, length 4.

STEP 3 — BRUTE FORCE:
  Try all substrings of s, check if each contains all chars of t.
  O(n²) substrings × O(m) check = O(n²m). Too slow for n=10^5.

STEP 4 — OPTIMIZE:
  Bottleneck: checking all substrings.
  Pattern: "minimum window containing" → variable sliding window!
  Right pointer expands until window is valid.
  Left pointer shrinks while window stays valid.
  Track: what we "need" vs what we "have" using freq maps.

STEP 5 — CODE:
  (See minWindow implementation in Concept 2 code examples)
  Time: O(|s| + |t|). Space: O(|s| + |t|).
*/

// EXAMPLE 5: Common Optimization Moves (Bottleneck → Fix)
const OPTIMIZATIONS = [
  {
    bottleneck: 'O(n) search inside O(n) loop = O(n²)',
    fix: 'Replace inner search with hash set/map → O(1) per lookup',
    example: 'Two Sum: replace nested loop with complement hash map',
  },
  {
    bottleneck: 'Repeated range sum computation = O(n) per query',
    fix: 'Precompute prefix sums → O(1) per range query',
    example: 'Subarray Sum Equals K: prefix sums + hash map',
  },
  {
    bottleneck: 'Sorting on every call = O(n log n) per call',
    fix: 'Sort once outside the function → O(n log n) total',
    example: 'Multi-query problems with sorted input',
  },
  {
    bottleneck: 'Recomputing same recursive subproblems = exponential',
    fix: 'Memoize results → each state computed once',
    example: 'Fibonacci, Coin Change, LCS',
  },
  {
    bottleneck: 'O(n) window recomputation on each slide = O(n²)',
    fix: 'Sliding window: add new element, remove old element → O(1) update',
    example: 'Max sum of k consecutive, Min window substring',
  },
  {
    bottleneck: 'O(n) to find kth element in each query',
    fix: 'Maintain a heap of size K → O(log K) per insert',
    example: 'Kth largest element, Top K frequent',
  },
];

OPTIMIZATIONS.forEach(({ bottleneck, fix, example }) => {
  console.log(\`\\nBottleneck: \${bottleneck}\`);
  console.log(\`Fix:        \${fix}\`);
  console.log(\`Example:    \${example}\`);
});

// EXAMPLE 6: Input/Output type → Data Structure mapping
const DATA_STRUCTURE_BY_INPUT = {
  'Sorted array + search': 'Binary search or Two pointers',
  'Unsorted array + search': 'Hash map or Sort first',
  'Array + K (k-th, top-k)': 'Heap of size K',
  'String + substrings': 'Sliding window or Trie',
  'Two strings + comparison': 'DP (LCS/edit distance)',
  'Binary tree': 'DFS recursion (preorder/inorder/postorder)',
  'Graph unweighted + shortest': 'BFS',
  'Graph weighted + shortest': 'Dijkstra (min-heap)',
  'Dependencies / ordering': 'Topological sort (Kahn)',
  'Dynamic connectivity': 'Union-Find',
  'All subsets/permutations': 'Backtracking',
  'Count/max/min subproblem': 'Dynamic programming',
  'Intervals': 'Sort by start + greedy merge or sweep line',
  'Next greater/smaller': 'Monotonic stack',
  'Prefix queries': 'Trie or Prefix sum',
};

function suggestDataStructure(problemType) {
  return DATA_STRUCTURE_BY_INPUT[problemType] || 'Analyze further: draw examples, identify pattern';
}

console.log(suggestDataStructure('Graph weighted + shortest')); // Dijkstra
console.log(suggestDataStructure('Array + K (k-th, top-k)'));  // Heap of size K

// EXAMPLE 7: Complete problem classification system
class ProblemClassifier {
  classify(description, inputSize) {
    const complexity = getApproachByInputSize(inputSize);
    const patterns = identifyPattern(description);
    
    return {
      inputSize,
      feasibleComplexity: complexity.complexity,
      suggestedApproaches: complexity.approaches,
      detectedPatterns: patterns,
      recommendation: this._getBestApproach(patterns, complexity),
    };
  }
  
  _getBestApproach(patterns, complexity) {
    if (patterns.length === 0) return 'Work through examples manually to find pattern';
    const primary = patterns[0].pattern;
    return \`Primary pattern: \${primary}. Complexity target: \${complexity.complexity}.\`;
  }
}

const classifier = new ProblemClassifier();
const result = classifier.classify(
  "find all subsets of an array that sum to target", 20
);
console.log(result);
// { inputSize: 20, feasibleComplexity: 'O(2^n) or O(n!)',
//   detectedPatterns: [{pattern:'Backtracking', signal:'all subsets'}], ... }
    `,
    bugs: `
REAL PRODUCTION BUGS FROM WRONG PATTERN SELECTION:
---------------------------------------------------

BUG 1: Using greedy when DP is required — wrong optimal result
  Scenario: Discount voucher allocation system. "Maximum discounts claimable from a list,
    cannot claim two adjacent vouchers." Used greedy: always claim largest available.
    For vouchers [₹200, ₹150, ₹600, ₹300]: greedy claims ₹600+₹200=₹800.
    Optimal (DP): ₹200+₹600+? → ₹200+₹600 but ₹200,₹600 are non-adjacent ✓ → 
    Actually optimal: ₹200+₹600=₹800 OR ₹150+₹300=₹450 → ₹200+₹600=₹800. Greedy got lucky here.
    Failure case: [₹100, ₹1000, ₹100]. Greedy: ₹1000. DP: ₹100+₹100=₹200? No DP: ₹1000. 
    Real failure: [₹5, ₹1, ₹5]. Greedy: ₹5+₹5=₹10. Optimal: ₹5+₹5=₹10 (same). 
    Real failure: [₹3, ₹10, ₹3, ₹2]. Greedy: ₹10+₹2=₹12. DP: ₹3+₹3+? → ₹3+₹3=₹6 or ₹10+₹2=₹12. OK.
    Classic failure: [₹2, ₹1, ₹1, ₹2]. Greedy: ₹2+₹1=₹3 (takes first ₹2, then ₹1, skips second ₹2).
    DP: ₹2+₹2=₹4 (skip middle ₹1, ₹1). Greedy FAILS here.
  Fix: Recognize "cannot take adjacent" + "maximize" → House Robber DP pattern.
    Never use greedy for "adjacent" constraints without mathematical proof.

BUG 2: DFS where BFS needed — wrong shortest path found
  Scenario: Routing algorithm for delivery network. "Minimum number of transfers."
    Used DFS (recursion). Returned A path but NOT the MINIMUM path.
  Root cause: DFS finds A path, not SHORTEST path. First path found is not necessarily shortest.
  Fix: BFS guarantees shortest path in unweighted graph.
    "Minimum" + "unweighted" → immediately think BFS, not DFS.

BUG 3: Sliding window where two pointers needed (wrong invariant) 
  Scenario: "Find two indices in SORTED array that sum to target."
    Developer used sliding window (fixed window, checking window sum).
    Found nothing even when solution existed.
  Root cause: Sliding window maintains a contiguous window.
    Two Sum with sorted array needs OPPOSITE-END pointers — not necessarily contiguous!
    The valid pair might be arr[0] + arr[n-1] (not adjacent).
  Fix: Recognize "sorted array" + "pair summing to target" → two pointers opposite ends.
    Sliding window is for CONTIGUOUS subarrays/substrings, not arbitrary pairs.

BUG 4: Backtracking without pruning — correct but TLE
  Scenario: "Find all combinations of candidates summing to target" with candidates=[1,2,3,...,200] and target=300.
    Code was correct but timed out — ran for hours.
  Root cause: No pruning. Explored branches where current sum already exceeded target.
    For sorted candidates: once candidates[i] > remaining, ALL future candidates also > remaining.
  Fix: Sort candidates first. Add break when candidates[i] > remaining.
    Single pruning line reduced runtime from hours to milliseconds.
    Lesson: Correct backtracking that TLEs → add pruning. Check BEFORE recursing.

BUG 5: Wrong complexity estimation — O(n²) passed for small n in tests but TLE in production
  Scenario: "Find all pairs with sum in range" solution used two nested loops O(n²).
    Tests passed with n=1000 (1M ops). Production data had n=500,000 (250B ops → TLE).
  Root cause: Developer estimated n from test cases (n=1000), assumed O(n²) was fine.
    Never verified the actual production constraint (n could be up to 5×10^5).
  Fix: ALWAYS check the constraint (n ≤ ?) BEFORE choosing algorithm.
    n ≤ 500,000 requires O(n log n) or better.
    Sort + two pointers: O(n log n) — 500,000 × 20 = 10M ops. Fast.
  Lesson: First question to ask in any interview: "What is the constraint on n?"
    `,
    challenge: `
CHALLENGES:
-----------

CHALLENGE 1 — CLASSIFY THESE PROBLEMS:
  For each problem, identify: (a) pattern, (b) signal words that gave it away,
  (c) time complexity of optimal solution, (d) the key data structure needed.
  
  Problem A: "Given an array of integers, return the indices of the two numbers
    that add up to a specific target. Each input has exactly one solution."
    n can be up to 10^4.
    Pattern: ___ Signal: ___ Complexity: ___ Data structure: ___
  
  Problem B: "Given a list of meeting time intervals (start, end), find the minimum
    number of conference rooms required."
    n up to 10^4.
    Pattern: ___ Signal: ___ Complexity: ___ Data structure: ___
  
  Problem C: "Given a string s, return the number of substrings that are palindromes."
    n up to 10^3.
    Pattern: ___ Signal: ___ Complexity: ___ Data structure: ___
  
  Problem D: "You have n nodes labeled 0 to n-1. Given a list of edges, determine if
    there's a valid path from source to destination."
    n up to 2×10^5.
    Pattern: ___ Signal: ___ Complexity: ___ Data structure: ___
  
  Problem E: "Given an integer array, find the maximum sum of any non-empty subarray."
    n up to 10^5.
    Pattern: ___ Signal: ___ Complexity: ___ Data structure: ___

CHALLENGE 2 — OPTIMIZATION DRILL:
  Each function below has an O(n²) bottleneck. Identify it and suggest the
  optimization pattern (with time complexity improvement).
  
  // Function 1: O(n²)?
  function containsDuplicate(nums) {
    for (let i = 0; i < nums.length; i++)
      for (let j = i + 1; j < nums.length; j++)
        if (nums[i] === nums[j]) return true;
    return false;
  }
  // Bottleneck: ___  Fix: ___ Optimized complexity: ___
  
  // Function 2: O(n²)?
  function longestCommonPrefix(strs) {
    let prefix = strs[0];
    for (const str of strs) {
      while (!str.startsWith(prefix)) // O(n) startsWith inside O(n) loop!
        prefix = prefix.slice(0, -1);
    }
    return prefix;
  }
  // Bottleneck: ___  Fix: ___ Optimized complexity: ___
  
  // Function 3: hidden O(n²):
  function buildString(words) {
    let result = '';
    for (const word of words) result += word + ' '; // O(total_chars) per iteration!
    return result.trim();
  }
  // Bottleneck: ___  Fix: ___ Optimized complexity: ___

CHALLENGE 3 — FULL PROBLEM SOLVE:
  Apply the complete 5-step framework to this problem:
  
  "You are given an m×n integer matrix. If an element is 0, set its entire row and
  column to 0. Do this in-place."
  Input: matrix = [[1,1,1],[1,0,1],[1,1,1]]
  Output: [[1,0,1],[0,0,0],[1,0,1]]
  
  STEP 1 — UNDERSTAND: What edge cases should you clarify?
  STEP 2 — EXAMPLES: Trace the example above by hand. Also try [[0,1,2,0],[3,4,5,2],[1,3,1,5]].
  STEP 3 — BRUTE FORCE: Describe O(m×n×(m+n)) solution. Why is it wrong to zero in-place immediately?
  STEP 4 — OPTIMIZE:
    Approach A: Use O(m+n) space to track which rows/cols need zeroing. Then zero them.
    Approach B: O(1) space — use first row and first column AS the marker arrays.
    Describe the edge case with Approach B (what about the cell [0][0] itself?).
  STEP 5 — CODE: Implement Approach B (O(1) space). 
    Trace through the example to verify. State final time and space complexity.
    `,
    summary: `Problem-solving mastery is pattern recognition at speed: map input constraints to feasible complexity, identify signal words to the matching algorithm, and apply the pre-memorized template. The 15 patterns cover 95% of coding problems; the 5-step framework prevents the most common interview failure (jumping to code before understanding the problem). Every hour spent solving problems should include conscious pattern labeling — "this was sliding window because of contiguous + maximum + variable size" — to build the recognition muscle that makes future problems click instantly.`
  }
];
