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
  context.lineWidth = 3;
  hitContext.lineWidth = 5;
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
  }
  context.lineWidth = 1;
  hitContext.lineWidth = 1;
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

  // return if click outside canvas
  if (position.x < 0 || position.y < 0) {
    return;
  }
  let target = within(position.x, position.y);

  if (mode == "create") {
    // toggle currently selected node to false
    if (selection && selection.selected) {
      selection.selected = false;
    }
    if (target) {
      if (selection && selection !== target) {
        // TODO extract to addEdge function
        midpoint = findMidPoint(selection, target);
        newEdge = {
          id: edges.length === 0 ? 1 : edges[edges.length - 1].id + 1,
          from: selection,
          to: target,
          midpoint: { ...midpoint },
          colorKey: getHitColor(),
        };
        // Add hitColor to colorHash
        colorHash[newEdge.colorKey] = newEdge;

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

  if (position.x < 0 || position.y < 0) {
    return;
  }
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
      //console.log(getHitMousePosition(e));
      //console.log(getMousePosition(e));
      //console.log(hitContext.getImageData(position.x, position.y, 1, 1).data);
      const pixel = hitContext.getImageData(position.x, position.y, 1, 1).data;
      const color = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
      const edge = colorHash[color];
      console.log(colorHash);
      console.log(edge);
      if (edge) {
        console.log("clicked edge");
        deleteEdges([edge]);
        draw();
      }
    }
  }
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
    console.log(index);
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
