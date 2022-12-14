// @ts-nocheck
const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

const hitCanvas = document.createElement("canvas");
const hitContext = hitCanvas.getContext("2d");

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

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 20;
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

function getRandomColor() {
  const r = Math.round(Math.random() * 255);
  const g = Math.round(Math.random() * 255);
  const b = Math.round(Math.random() * 255);
  return `rgb(${r},${g},${b})`;
}

function draw() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  drawEdges();

  drawVertices();
}

function findMidPoint(from, to) {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
}

function drawMidPoint(e) {
  e.midpoint = findMidPoint(e.from, e.to);

  drawVertex({
    x: e.midpoint.x,
    y: e.midpoint.y,
    radius: 2,
    fillStyle: "#22cccc",
    strokeStyle: "#009999",
  });
}

function drawEdges() {
  for (let i = 0; i < edges.length; i++) {
    let fromNode = edges[i].from;
    let toNode = edges[i].to;
    context.beginPath();
    context.strokeStyle = fromNode.strokeStyle;
    context.moveTo(fromNode.x, fromNode.y);
    context.quadraticCurveTo(
      edges[i].midpoint.x,
      edges[i].midpoint.y,
      toNode.x,
      toNode.y
    );
    //context.lineTo(toNode.x, toNode.y);
    // test hit region
    context.stroke();
    drawMidPoint(edges[i]);
  }
}

function drawVertex(v) {
  context.beginPath();
  context.fillStyle = v.selected ? v.selectedFill : v.fillStyle;
  context.arc(v.x, v.y, v.radius, 0, Math.PI * 2, true);
  context.strokeStyle = v.strokeStyle;
  context.fill();
  context.stroke();
}

function drawVertices() {
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    drawVertex(node);
  }
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

function down(e) {
  let position = getMousePosition(e);
  let target = within(position.x, position.y);
  if (mode == "create") {
    if (selection && selection.selected) {
      selection.selected = false;
    }
    if (target) {
      if (selection && selection !== target) {
        // TODO extract to addEdge function
        midpoint = findMidPoint(selection, target);
        newEdge = {
          from: selection,
          to: target,
          midpoint: { ...midpoint },
        };
        // Add to master edge list
        edges.push(newEdge);

        // Add to each vertex edge list
        selection.edges.push(newEdge);
        target.edges.push(newEdge);
      }
      selection = target;
      selection.selected = true;
      draw();
    }
  } else {
  }
}

function up(e) {
  let position = getMousePosition(e);
  if (mode == "create") {
    if (!selection) {
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
    }
  }
}

function deleteEdges(dyingEdges) {
  console.log("deleting edges: " + dyingEdges);

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

    // Then remove edge from master edge list
    index = edges.indexOf(dyingEdges[i]);
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
