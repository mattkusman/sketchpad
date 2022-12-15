// @ts-nocheck
const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

const hitCanvas = document.createElement("canvas");
const hitContext = hitCanvas.getContext("2d");

const color = document.getElementById("color");

const info = document.getElementById("info");

window.onmousemove = move;
window.onmousedown = down;
window.onmouseup = up;

window.onresize = resize;
resize();

var nodes = [];
var edges = [];

const colorHash = {};

var selection = undefined;
var mode = "create";
var selectedEdge = undefined;
var drawDegree = true;

color.addEventListener("input", (event) => {
  if (selection) {
    selection.fillStyle = color.value;
    draw();
  } else if (selectedEdge) {
    selectedEdge.strokeStyle = color.value;
    draw();
  }
});

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 20;

  hitCanvas.width = window.innerWidth;
  hitCanvas.height = window.innerHeight - 20;
  hitCanvas.style.position = "absolute";
  hitCanvas.style.top = canvas.getBoundingClientRect().top + "px";
}

function setMode(newMode) {
  mode = newMode;
  console.log("mode changed to " + mode);
}

function getMousePosition(e) {
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  return { x: x, y: y };
}

function getHitMousePosition(e) {
  let rect = hitCanvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  return { x: x, y: y };
}

function getRandomColor() {
  const r = Math.round(Math.random() * 255);
  const g = Math.round(Math.random() * 255);
  const b = Math.round(Math.random() * 255);
  return `rgb(${r},${g},${b})`;
}

function getHitColor(edge) {
  while (true) {
    const colorKey = getRandomColor();
    if (!colorHash[colorKey]) {
      return colorKey;
    }
  }
}

function draw() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  drawEdges();

  drawVertices();

  info.innerHTML =
    "M = " +
    nodes.length +
    ", N = " +
    edges.length +
    " K = " +
    numberComponents();
}

function findMidPoint(from, to) {
  return {
    x: (from.x + to.x) * 0.5,
    y: (from.y + to.y) * 0.5,
  };
}

function drawMidPoint(e) {
  e.midpoint = findMidPoint(e.from, e.to);
  //drawArrow(e.from.x, e.from.y, e.to.x, e.to.y, 10, "black");

  drawVertex({
    x: e.midpoint.x,
    y: e.midpoint.y,
    radius: 2,
    fillStyle: "#22cccc",
    strokeStyle: "#009999",
  });
}

function drawEdges() {
  context.lineWidth = 3;
  hitContext.lineWidth = 5;
  for (let i = 0; i < edges.length; i++) {
    let fromNode = edges[i].from;
    let toNode = edges[i].to;

    // Check if isLoop
    if (fromNode === toNode) {
      drawLoop(edges[i]);
    } else if (countParalell(fromNode, toNode) === 1) {
      context.beginPath();
      context.strokeStyle = edges[i].strokeStyle;
      context.moveTo(fromNode.x, fromNode.y);
      context.quadraticCurveTo(
        edges[i].midpoint.x,
        edges[i].midpoint.y,
        toNode.x,
        toNode.y
      );
      context.stroke();
      drawMidPoint(edges[i]);

      // Now draw on hitCtx
      hitContext.beginPath();
      hitContext.strokeStyle = edges[i].colorKey;
      hitContext.moveTo(fromNode.x, fromNode.y);
      hitContext.quadraticCurveTo(
        edges[i].midpoint.x,
        edges[i].midpoint.y,
        toNode.x,
        toNode.y
      );
      hitContext.stroke();
    } else {
      drawCurvedEdge(edges[i]);
      //drawMidPoint(edges[i]);
      edges[i].midpoint = findMidPoint(edges[i].from, edges[i].to);
    }
    drawArrow(
      edges[i].from.x,
      edges[i].from.y,
      edges[i].to.x,
      edges[i].to.y,
      10,
      "black"
    );
  }
  context.lineWidth = 1;
  hitContext.lineWidth = 1;
}

function drawLoop(edge) {
  let node = edge.from;
  context.beginPath();
  context.strokeStyle = edge.strokeStyle;
  context.moveTo(node.x, node.y);
  context.arc(node.x - 28, node.y, 20, 0, Math.PI * 2, true);
  context.stroke();

  // Now draw on hitCtx
  hitContext.beginPath();
  hitContext.strokeStyle = edge.colorKey;
  hitContext.moveTo(node.x, node.y);
  hitContext.arc(node.x - 28, node.y, 20, 0, Math.PI * 2, true);
  hitContext.stroke();
}

function drawCurvedEdge(edge) {
  let angle = Math.atan2(edge.to.y - edge.from.y, edge.to.x - edge.from.x);
  let major =
    Math.sqrt(
      (edge.to.x - edge.from.x) * (edge.to.x - edge.from.x) +
        (edge.to.y - edge.from.y) * (edge.to.y - edge.from.y)
    ) / 2;
  let minor = 0;

  // if no paralell prop in edge, add it
  if (!!!edge.paralell) {
    edge.paralell = countParalell(edge.to, edge.from);
  }

  // even or odd determines side
  let side = edge.paralell % 2;
  minor = 8 * edge.paralell;

  if (!!side) {
    clockwise = false;
  } else {
    clockwise = true;
  }

  context.strokeStyle = edge.strokeStyle;
  context.beginPath();
  context.ellipse(
    edge.midpoint.x,
    edge.midpoint.y,
    major,
    minor,
    angle,
    0,
    Math.PI,
    clockwise
  );
  context.stroke();

  hitContext.strokeStyle = edge.colorKey;
  hitContext.beginPath();
  hitContext.ellipse(
    edge.midpoint.x,
    edge.midpoint.y,
    major,
    minor,
    angle,
    0,
    Math.PI,
    clockwise
  );
  hitContext.stroke();
}

function drawVertex(v) {
  context.beginPath();
  context.fillStyle = v.selected ? v.selectedFill : v.fillStyle;
  context.arc(v.x, v.y, v.radius, 0, Math.PI * 2, true);
  context.strokeStyle = v.strokeStyle;
  context.fill();
  context.stroke();
  if (drawDegree && v.edges) {
    context.fillStyle = "black";
    context.fillText(v.edges?.length, v.x, v.y);
  }
}

function drawVertices() {
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    drawVertex(node);
  }
  getAdjMatrix();
}

function drawArrow(fromx, fromy, tox, toy, arrowWidth, color) {
  //variables to be used when creating the arrow
  var headlen = 20;
  var angle = Math.atan2(toy - fromy, tox - fromx);

  context.save();
  context.strokeStyle = color;

  //starting path of the arrow from the start square to the end square
  //and drawing the stroke

  //starting a new path from the head of the arrow to one of the sides of
  //the point
  context.beginPath();
  context.moveTo(tox, toy);
  context.lineTo(
    tox - headlen * Math.cos(angle - Math.PI / 7),
    toy - headlen * Math.sin(angle - Math.PI / 7)
  );

  //path from the side point of the arrow, to the other side point
  context.lineTo(
    tox - headlen * Math.cos(angle + Math.PI / 7),
    toy - headlen * Math.sin(angle + Math.PI / 7)
  );

  //path from the side point back to the tip of the arrow, and then
  //again to the opposite side point
  context.lineTo(tox, toy);
  context.lineTo(
    tox - headlen * Math.cos(angle - Math.PI / 7),
    toy - headlen * Math.sin(angle - Math.PI / 7)
  );

  //draws the paths created above
  context.stroke();
}

function countParalell(from, to) {
  let count = 0;
  for (let i = 0; i < edges.length; i++) {
    if (
      (edges[i].from === from && edges[i].to === to) ||
      (edges[i].from === to && edges[i].to === from)
    ) {
      count++;
    }
  }
  return count;
}

function within(x, y) {
  let hitNode = nodes.find((n) => {
    return (
      x > n.x - n.radius &&
      y > n.y - n.radius &&
      x < n.x + n.radius &&
      y < n.y + n.radius
    );
  });

  if (hitNode) {
    return hitNode;
  } else {
  }
}

function move(e) {
  let position = getMousePosition(e);
  if (selection && e.buttons) {
    selection.x = position.x;
    selection.y = position.y;
    draw();
  }
}

function addEdge(to, from) {
  // TODO extract to addEdge function
  midpoint = findMidPoint(from, to);
  newEdge = {
    id: edges.length === 0 ? 1 : edges[edges.length - 1].id + 1,
    from: from,
    to: to,
    midpoint: { ...midpoint },
    colorKey: getHitColor(),
    strokeStyle: "#009999",
  };
  // Add hitColor to colorHash
  colorHash[newEdge.colorKey] = newEdge;

  // Add to master edge list
  edges.push(newEdge);

  // Add to each vertex edge list
  from.edges.push(newEdge);
  to.edges.push(newEdge);
}

function down(e) {
  let position = getMousePosition(e);

  // return if click outside canvas
  if (position.x < 0 || position.y < 0) {
    return;
  }
  let target = within(position.x, position.y);
  selectedEdge = clickedEdge(position.x, position.y);

  if (mode == "create") {
    // toggle currently selected node to false
    if (selection && selection.selected) {
      selection.selected = false;
    }
    // if another vertex clicked, create edge
    if (target) {
      if (selection) {
        addEdge(target, selection);
      }
      selection = target;
      selection.selected = true;
      draw();
    } else if (selectedEdge) {
    }
  } else {
  }
}

function up(e) {
  let position = getMousePosition(e);

  if (position.x < 0 || position.y < 0) {
    return;
  }

  if (mode == "create") {
    if (!selection && !selectedEdge) {
      let node = {
        x: position.x,
        y: position.y,
        radius: 10,
        fillStyle: "#22cccc",
        strokeStyle: "#009999",
        selectedFill: "#88aaaa",
        selected: false,
        edges: [],
      };
      nodes.push(node);
      draw();
    }
    if (selection && !selection.selected) {
      selection = undefined;
    }
    draw();
  } else {
    target = within(position.x, position.y);
    // Check for clicked vertex, then clicked edge
    if (target) {
      // Find all connected edges
      let dyingEdges = [...target.edges];

      // Add vertex to delete list
      let dyingVertices = [];
      dyingVertices.push(target);

      // Now do the deleting and redraw
      deleteVertices(dyingVertices);
      deleteEdges(dyingEdges);
      draw();
    } else {
      // Mode delete, check if clicked edge and delete it
      const edge = clickedEdge(position.x, position.y);

      if (edge) {
        deleteEdges([edge]);
        draw();
      }
    }
  }
}

function clickedEdge(x, y) {
  const pixel = hitContext.getImageData(x, y, 1, 1).data;
  const color = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
  const edge = colorHash[color];

  return edge;
}

function deleteEdges(dyingEdges) {
  for (let i = 0; i < dyingEdges.length; i++) {
    // First remove edges from vertex edge list
    let index = dyingEdges[i].from.edges.indexOf(dyingEdges[i]);
    if (index >= 0) {
      dyingEdges[i].from.edges.splice(index, 1);
    }
    index = dyingEdges[i].to.edges.indexOf(dyingEdges[i]);
    if (index >= 0) {
      dyingEdges[i].to.edges.splice(index, 1);
    }

    // Remove from hit system
    delete colorHash[dyingEdges[i].colorKey];

    // Then remove edge from master edge list
    index = edges.indexOf(dyingEdges[i]);
    //console.log(index);
    if (index >= 0) {
      edges.splice(index, 1);
    }
  }
}

function deleteVertices(dyingVertices) {
  for (let i = 0; i < dyingVertices.length; i++) {
    nodes.splice(nodes.indexOf(dyingVertices[i]), 1);
  }
}

function findPath(start, finish, path = []) {
  if (start === finish) {
    return path;
  }
  for (let i = 0; i < start.edges; i++) {
    i = 1;
  }
}

function numberComponents() {
  let visited = new Array(nodes.length).fill(false);
  let count = 0;

  for (let v = 0; v < nodes.length; v++) {
    if (visited[v] == false) {
      DFSUtil(v, visited);
      count += 1;
    }
  }
  return count;
}

function DFSUtil(v, visited) {
  visited[v] = true;
  let count = 0;

  for (let i of getAdj(nodes[v])) {
    console.log(visited[nodes.indexOf(i)]);
    if (visited[nodes.indexOf(i)] == false) {
      console.log("inside");
      DFSUtil(nodes.indexOf(i), visited);
    }
  }
}

function getAdj(v) {
  adjs = [];

  for (let i = 0; i < v.edges.length; i++) {
    if (v.edges[i].from != v) {
      adjs.push(v.edges[i].from);
    } else {
      adjs.push(v.edges[i].to);
    }
  }

  return adjs;
}

function getAdjMatrix() {
  let matrix = new Array(nodes.length)
    .fill()
    .map((_) => Array(edges.length).fill(0));
  for (let i = 0; i < edges.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (edges[i].to === nodes[j] || edges[i].from === nodes[j]) {
        matrix[j][i] = 1;
      } else {
        matrix[j][i] = 0;
      }
    }
  }
  console.log(matrix);
}

function save() {}
