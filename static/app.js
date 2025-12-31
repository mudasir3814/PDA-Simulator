// ----------------------
// PDA Simulator Frontend JS
// ----------------------

let selectedPDA = null;
window.simTrace = [];
window.simStep = 0;

// ----------------------
// Load PDA list on page start
// ----------------------
window.onload = async function () {
  const select = document.getElementById("pdaSelect");
  const res = await fetch("/pdalist");
  const data = await res.json();
  data.pdas.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
  select.onchange = e => {
    selectedPDA = e.target.value;
    drawDiagram(selectedPDA);
  };
  selectedPDA = data.pdas[0].id;
  drawDiagram(selectedPDA);
};

// ----------------------
// Run Button
// ----------------------
document.getElementById("runBtn").onclick = async () => {
  const input = document.getElementById("inputStr").value;
  if (!selectedPDA) return alert("Select a PDA first!");

  const res = await fetch("/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pda_id: selectedPDA, input })
  });

  const result = await res.json();
  window.simTrace = result.trace || [];
  window.simStep = 0;

  const statusElem = document.getElementById("statusText");
  if (result.accepted) {
    statusElem.textContent = "Status: Accepted ✅";
    statusElem.style.color = "green";
  } else {
    statusElem.textContent = "Status: Rejected ❌";
    statusElem.style.color = "red";
  }

  if (window.simTrace.length > 0) {
    renderStep(0);
  } else {
    document.getElementById("traceBox").textContent = "(no valid transitions)";
    renderStack("", "noop");
  }
};

// ----------------------
// Step Button
// ----------------------
document.getElementById("stepBtn").onclick = () => {
  if (window.simTrace.length === 0) return;
  window.simStep++;
  if (window.simStep >= window.simTrace.length)
    window.simStep = window.simTrace.length - 1;
  renderStep(window.simStep);
};

// ----------------------
// Reset Button
// ----------------------
document.getElementById("resetBtn").onclick = () => {
  window.simTrace = [];
  window.simStep = 0;
  document.getElementById("statusText").textContent = "Status: waiting";
  document.getElementById("traceBox").innerHTML = "";
  document.getElementById("currentStep").innerHTML = "";
  renderStack("", "noop");
  drawDiagram(selectedPDA);
};

// ----------------------
// Render one step
// ----------------------
function renderStep(idx) {
  const traceBox = document.getElementById("traceBox");
  const curBox = document.getElementById("currentStep");
  const trace = window.simTrace || [];
  if (idx < 0 || idx >= trace.length) return;
  const cur = trace[idx];
  const prev = trace[idx - 1];

  traceBox.innerHTML = "";
  trace.forEach((t, i) => {
    const div = document.createElement("div");
    div.textContent = `#${i + 1} (${t.state}) — Input: ${t.remaining || "ε"} | Stack: ${t.stack}`;
    if (i === idx) div.style.fontWeight = "bold";
    traceBox.appendChild(div);
  });

  curBox.innerHTML = `
    <p><b>State:</b> ${cur.state}</p>
    <p><b>Remaining Input:</b> ${cur.remaining || "ε"}</p>
    <p><b>Stack (top → bottom):</b> ${cur.stack || "ε"}</p>
  `;

  highlightState(cur.state);

  let diffType = "noop";
  if (prev) {
    if ((cur.stack || "").length > (prev.stack || "").length) diffType = "push";
    else if ((cur.stack || "").length < (prev.stack || "").length) diffType = "pop";
  }
  renderStack(cur.stack, diffType);
}

// ----------------------
// Stack Visualization
// ----------------------
function renderStack(stackString, diffType = null) {
  const container = document.getElementById("stackDisplay");
  container.innerHTML = "";

  if (!stackString || stackString === "$") {
    const div = document.createElement("div");
    div.className = "stack-item noop";
    div.textContent = "$";
    container.appendChild(div);
    return;
  }

  const chars = stackString.split("");
  for (let i = chars.length - 1; i >= 0; i--) {
    const ch = chars[i];
    const div = document.createElement("div");
    div.className = "stack-item";
    if (i === 0 && diffType) div.classList.add(diffType);
    div.textContent = ch;
    container.appendChild(div);
  }
}

// ----------------------
// Highlight state in diagram
// ----------------------
function highlightState(state) {
  document.querySelectorAll("circle.state").forEach(c => {
    c.classList.remove("active");
  });
  const active = document.getElementById("state-" + state);
  if (active) active.classList.add("active");
}

// ----------------------
// Draw PDA Diagram
// ----------------------
function drawDiagram(pdaId) {
  const svg = document.getElementById("pdaDiagram");
  svg.innerHTML = "";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `<marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3"
                      orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="#555"/>
                    </marker>`;
  svg.appendChild(defs);

  let states = [];
  let transitions = [];
  const positions = {};

  if (pdaId === "anbn") {
    states = ["q0", "q1", "qf"];
    transitions = [
      ["q0", "q0", "a/A↑"],
      ["q0", "q1", "b/A↓"],
      ["q1", "q1", "b/A↓"],
      ["q1", "qf", "ε,$→acc"]
    ];
    Object.assign(positions, {q0: [80, 100], q1: [200, 100], qf: [320, 100]});
  }
  else if (pdaId === "balanced_parentheses") {
    states = ["q0", "qf"];
    transitions = [
      ["q0", "q0", "( push A"],
      ["q0", "q0", ") pop A"],
      ["q0", "qf", "ε,$→acc"]
    ];
    Object.assign(positions, {q0: [140, 100], qf: [300, 100]});
  }
  else if (pdaId === "a_plus_b_star") {
    states = ["q0", "qf"];
    transitions = [
      ["q0", "q0", "a/b (no-op)"],
      ["q0", "qf", "ε,$→acc"]
    ];
    Object.assign(positions, {q0: [140, 100], qf: [300, 100]});
  }
  else if (pdaId === "palindrome") {
    states = ["q0", "q1", "qf"];
    transitions = [
      ["q0", "q0", "push a/b"],
      ["q0", "q1", "ε guess mid"],
      ["q1", "q1", "match pop"],
      ["q1", "qf", "ε,$→acc"]
    ];
    Object.assign(positions, {q0: [80, 100], q1: [200, 100], qf: [320, 100]});
  }
  else if (pdaId === "anbn_c_star") {
    states = ["q0", "q1", "qf"];
    transitions = [
      ["q0", "q0", "push A for a"],
      ["q0", "q1", "b/A↓"],
      ["q1", "q1", "b/A↓ or c"],
      ["q1", "qf", "ε,$→acc"]
    ];
    Object.assign(positions, {q0: [80, 100], q1: [200, 100], qf: [320, 100]});
  }
  else if (pdaId === "wwr") {
    states = ["q0", "q1", "qf"];
    transitions = [
      ["q0", "q0", "push w"],
      ["q0", "q1", "ε mid guess"],
      ["q1", "q1", "pop reverse"],
      ["q1", "qf", "ε,$→acc"]
    ];
    Object.assign(positions, {q0: [80, 100], q1: [200, 100], qf: [320, 100]});
  }
  else if (pdaId === "a2n_b") {
    states = ["q0", "q1", "q2", "qf"];
    transitions = [
      ["q0", "q1", "a (no push)"],
      ["q1", "q0", "a push A"],
      ["q0", "q2", "b/A↓"],
      ["q2", "q2", "b/A↓"],
      ["q2", "qf", "ε,$→acc"]
    ];
    Object.assign(positions, {q0: [60, 100], q1: [160, 100], q2: [260, 100], qf: [360, 100]});
  }
  else if (pdaId === "a_b_equal_c") {
    states = ["q0", "qf"];
    transitions = [
      ["q0", "q0", "push A for a/b"],
      ["q0", "q0", "pop A for c"],
      ["q0", "qf", "ε,$→acc"]
    ];
    Object.assign(positions, {q0: [140, 100], qf: [300, 100]});
  }

  // Draw transitions
  transitions.forEach(([from, to, label]) => {
    const [x1, y1] = positions[from];
    const [x2, y2] = positions[to];
    
    if (from === to) {
      // Self-loop
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const loopD = `M ${x1},${y1 - 26} Q ${x1},${y1 - 70} ${x1 + 30},${y1 - 26}`;
      path.setAttribute("d", loopD);
      path.setAttribute("stroke", "#555");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "none");
      path.setAttribute("marker-end", "url(#arrow)");
      svg.appendChild(path);
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x1 + 25);
      text.setAttribute("y", y1 - 75);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "11");
      text.setAttribute("fill", "#333");
      text.textContent = label;
      svg.appendChild(text);
    } else {
      // Regular transition
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", "#555");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("marker-end", "url(#arrow)");
      svg.appendChild(line);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2 - 10;
      text.setAttribute("x", midX);
      text.setAttribute("y", midY);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "11");
      text.setAttribute("fill", "#333");
      text.textContent = label;
      svg.appendChild(text);
    }
  });

  // Draw states
  states.forEach(s => {
    const [x, y] = positions[s];
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 26);
    circle.setAttribute("class", "state" + (s === "qf" ? " accept" : ""));
    circle.setAttribute("id", "state-" + s);
    svg.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y + 4);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "13");
    text.textContent = s;
    svg.appendChild(text);
  });
}