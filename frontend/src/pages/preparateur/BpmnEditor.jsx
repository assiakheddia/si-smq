import React, { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   BpmnEditor — éditeur BPMN SVG (onglet "Déroulement")
═══════════════════════════════════════════════════════════════════ */

const NODE_COLORS = {
  task: { fill: "#B5D4F4", stroke: "#185FA5", text: "#0C447C" },
  start: { fill: "#C0DD97", stroke: "#3B6D11", text: "#27500A" },
  end: { fill: "#F7C1C1", stroke: "#A32D2D", text: "#791F1F" },
  gateway: { fill: "#FAC775", stroke: "#854F0B", text: "#633806" },
};

const BPMN_SAMPLE = {
  lanes: [
    { id: "l1", label: "Direction", h: 110 },
    { id: "l2", label: "Chef Dept.", h: 110 },
    { id: "l3", label: "Étudiant", h: 110 },
  ],
  nodes: [
    { id: "n1", type: "start", x: 110, y: 95, label: "Début", lane: "l1" },
    {
      id: "n2",
      type: "task",
      x: 240,
      y: 95,
      label: "Appel à sujets",
      lane: "l1",
    },
    {
      id: "n3",
      type: "gateway",
      x: 380,
      y: 95,
      label: "Validation",
      lane: "l1",
    },
    {
      id: "n4",
      type: "task",
      x: 380,
      y: 205,
      label: "Attribution sujet",
      lane: "l2",
    },
    {
      id: "n5",
      type: "task",
      x: 520,
      y: 205,
      label: "Encadrement",
      lane: "l2",
    },
    {
      id: "n6",
      type: "task",
      x: 520,
      y: 315,
      label: "Rédaction PFE",
      lane: "l3",
    },
    {
      id: "n7",
      type: "task",
      x: 660,
      y: 315,
      label: "Dépôt mémoire",
      lane: "l3",
    },
    {
      id: "n8",
      type: "task",
      x: 660,
      y: 205,
      label: "Jury & soutenance",
      lane: "l2",
    },
    { id: "n9", type: "end", x: 800, y: 205, label: "Fin", lane: "l2" },
  ],
  edges: [
    { id: "e1", from: "n1", to: "n2", label: "" },
    { id: "e2", from: "n2", to: "n3", label: "" },
    { id: "e3", from: "n3", to: "n4", label: "Approuvé" },
    { id: "e4", from: "n4", to: "n5", label: "" },
    { id: "e5", from: "n5", to: "n6", label: "" },
    { id: "e6", from: "n6", to: "n7", label: "" },
    { id: "e7", from: "n7", to: "n8", label: "" },
    { id: "e8", from: "n8", to: "n9", label: "" },
  ],
};

function bpmnNodeW(label) {
  return Math.max(90, label.length * 7 + 24);
}
function bpmnMakeId() {
  return "n" + Math.random().toString(36).slice(2, 7);
}
function bpmnMakeLaneId() {
  return "l" + Math.random().toString(36).slice(2, 7);
}

function BpmnNodeShape({
  node,
  selected,
  onMouseDown,
  onMouseUp,
  onHandleMouseDown,
}) {
  const col = NODE_COLORS[node.type];
  const sw = selected ? 2.5 : 1.5;

  const Handle = ({ cx, cy }) => (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill={col.stroke}
      opacity={0}
      style={{ cursor: "crosshair" }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
      onMouseDown={(e) => {
        e.stopPropagation();
        onHandleMouseDown(e, node.id);
      }}
    />
  );

  const shared = {
    style: { cursor: "pointer" },
    onMouseDown: (e) => onMouseDown(e, node.id),
    onMouseUp: (e) => onMouseUp(e, node.id),
  };

  if (node.type === "start")
    return (
      <g transform={`translate(${node.x},${node.y})`} {...shared}>
        <circle r={18} fill={col.fill} stroke={col.stroke} strokeWidth={sw} />
        <circle r={12} fill="none" stroke={col.stroke} strokeWidth={1} />
        <text
          y={32}
          textAnchor="middle"
          fontSize={10}
          fill={col.text}
          fontFamily="sans-serif"
        >
          {node.label}
        </text>
        <Handle cx={18} cy={0} />
      </g>
    );

  if (node.type === "end")
    return (
      <g transform={`translate(${node.x},${node.y})`} {...shared}>
        <circle r={18} fill={col.fill} stroke={col.stroke} strokeWidth={sw} />
        <circle r={10} fill={col.stroke} />
        <text
          y={32}
          textAnchor="middle"
          fontSize={10}
          fill={col.text}
          fontFamily="sans-serif"
        >
          {node.label}
        </text>
        <Handle cx={-18} cy={0} />
      </g>
    );

  if (node.type === "gateway")
    return (
      <g transform={`translate(${node.x},${node.y})`} {...shared}>
        <polygon
          points="0,-24 24,0 0,24 -24,0"
          fill={col.fill}
          stroke={col.stroke}
          strokeWidth={sw}
        />
        <text
          y={5}
          textAnchor="middle"
          fontSize={13}
          fill={col.text}
          fontWeight="700"
          fontFamily="sans-serif"
        >
          ?
        </text>
        <text
          y={40}
          textAnchor="middle"
          fontSize={10}
          fill={col.text}
          fontFamily="sans-serif"
        >
          {node.label}
        </text>
        <Handle cx={24} cy={0} />
        <Handle cx={-24} cy={0} />
        <Handle cx={0} cy={24} />
      </g>
    );

  /* task */
  const w = bpmnNodeW(node.label),
    h = 40;
  const words = node.label.split(" ");
  let lines = [],
    cur = "";
  words.forEach((word) => {
    const t = cur ? cur + " " + word : word;
    if (t.length > 13) {
      if (cur) lines.push(cur);
      cur = word;
    } else cur = t;
  });
  if (cur) lines.push(cur);
  const ty = lines.length > 1 ? -6 : 5;

  return (
    <g transform={`translate(${node.x},${node.y})`} {...shared}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={6}
        fill={col.fill}
        stroke={col.stroke}
        strokeWidth={sw}
      />
      {lines.map((l, i) => (
        <text
          key={i}
          y={ty + i * 14}
          textAnchor="middle"
          fontSize={10}
          fill={col.text}
          fontFamily="sans-serif"
        >
          {l}
        </text>
      ))}
      <Handle cx={w / 2} cy={0} />
      <Handle cx={-w / 2} cy={0} />
      <Handle cx={0} cy={h / 2} />
      <Handle cx={0} cy={-h / 2} />
    </g>
  );
}

function BpmnEditor({ onChange, initialData }) {
  const [bNodes, setBNodes] = useState(() => initialData?.nodes ?? []);
  const [bEdges, setBEdges] = useState(() => initialData?.edges ?? []);
  const [bLanes, setBLanes] = useState(
    () => initialData?.lanes ?? [{ id: "l1", label: "Lane 1", h: 110 }],
  );
  const [bSelected, setBSelected] = useState(null);
  const [bMode, setBMode_] = useState("select");
  const [bConnectFrom, setBConnectFrom] = useState(null);
  const [bZoom, setBZoom] = useState(1);
  const [bPan, setBPan] = useState({ x: 0, y: 0 });
  const [editingEdge, setEditingEdge] = useState(null);
  const [edgeLabel, setEdgeLabel] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [laneInput, setLaneInput] = useState("");

  const dragRef = useRef(null);
  const panRef = useRef(null);
  const movedRef = useRef(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    onChange?.({ nodes: bNodes, edges: bEdges, lanes: bLanes });
  }, [bNodes, bEdges, bLanes]);

  const selNode = bNodes.find((n) => n.id === bSelected);
  useEffect(() => {
    if (selNode) {
      setLabelInput(selNode.label);
      setLaneInput(selNode.lane || "");
    }
  }, [bSelected]);

  const svgCoords = useCallback(
    (e) => {
      const r = wrapRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - r.left - bPan.x) / bZoom,
        y: (e.clientY - r.top - bPan.y) / bZoom,
      };
    },
    [bPan, bZoom],
  );

  function setBMode(m) {
    setBMode_(m);
    setBConnectFrom(null);
  }

  function addBNode(type) {
    const id = bpmnMakeId();
    const labels = {
      task: "Tâche",
      start: "Début",
      end: "Fin",
      gateway: "Décision",
    };
    setBNodes((p) => [
      ...p,
      {
        id,
        type,
        x: 200 + Math.random() * 300,
        y: 80 + Math.random() * 250,
        label: labels[type],
        lane: null,
      },
    ]);
    setBSelected(id);
  }

  function addBLane() {
    setBLanes((p) => [
      ...p,
      { id: bpmnMakeLaneId(), label: "Acteur " + (p.length + 1), h: 110 },
    ]);
  }

  function deleteBSelected() {
    if (!bSelected) return;
    setBNodes((p) => p.filter((n) => n.id !== bSelected));
    setBEdges((p) =>
      p.filter((e) => e.from !== bSelected && e.to !== bSelected),
    );
    setBSelected(null);
  }

  function clearBAll() {
    if (!window.confirm("Réinitialiser le diagramme ?")) return;
    setBNodes([]);
    setBEdges([]);
    setBLanes([]);
    setBSelected(null);
  }

  function loadBSample() {
    setBNodes(BPMN_SAMPLE.nodes);
    setBEdges(BPMN_SAMPLE.edges);
    setBLanes(BPMN_SAMPLE.lanes);
    setBSelected(null);
    setBPan({ x: 0, y: 0 });
    setBZoom(1);
  }

  function onNodeMouseDown(e, id) {
    e.stopPropagation();
    if (bMode === "connect") {
      if (!bConnectFrom) {
        setBConnectFrom(id);
        return;
      }
      if (bConnectFrom !== id)
        setBEdges((p) => [
          ...p,
          { id: bpmnMakeId(), from: bConnectFrom, to: id, label: "" },
        ]);
      setBConnectFrom(null);
      setBMode("select");
      return;
    }
    if (bMode === "select") {
      const n = bNodes.find((n) => n.id === id);
      const c = svgCoords(e);
      dragRef.current = { id, offX: c.x - n.x, offY: c.y - n.y };
      movedRef.current = false;
    }
  }

  function onNodeMouseUp(e, id) {
    e.stopPropagation();
    if (!movedRef.current) setBSelected(id);
    dragRef.current = null;
    movedRef.current = false;
  }

  function onHandleMouseDown(e, id) {
    e.stopPropagation();
    setBConnectFrom(id);
    setBMode_("connect");
  }

  function onCanvasMouseDown(e) {
    if (
      e.target.tagName.toLowerCase() === "svg" ||
      e.target === wrapRef.current
    ) {
      setBSelected(null);
      setBConnectFrom(null);
    }
    if (bMode === "pan")
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: bPan.x,
        originY: bPan.y,
      };
  }

  function onCanvasMouseMove(e) {
    if (dragRef.current && bMode === "select") {
      movedRef.current = true;
      const c = svgCoords(e);
      const { id, offX, offY } = dragRef.current;
      setBNodes((p) =>
        p.map((n) =>
          n.id === id ? { ...n, x: c.x - offX, y: c.y - offY } : n,
        ),
      );
    }
    if (panRef.current)
      setBPan({
        x: panRef.current.originX + (e.clientX - panRef.current.startX),
        y: panRef.current.originY + (e.clientY - panRef.current.startY),
      });
  }

  function onCanvasMouseUp() {
    dragRef.current = null;
    panRef.current = null;
    movedRef.current = false;
  }

  function onWheel(e) {
    e.preventDefault();
    setBZoom((z) =>
      Math.min(2.5, Math.max(0.25, z + (e.deltaY < 0 ? 0.08 : -0.08))),
    );
  }

  function onEdgeClick(e, edgeId) {
    e.stopPropagation();
    const ed = bEdges.find((x) => x.id === edgeId);
    setEditingEdge(edgeId);
    setEdgeLabel(ed?.label || "");
  }

  function confirmEdgeLabel() {
    setBEdges((p) =>
      p.map((e) => (e.id === editingEdge ? { ...e, label: edgeLabel } : e)),
    );
    setEditingEdge(null);
  }

  const computedLanes = bLanes.map((l, i) => ({
    ...l,
    y: 40 + bLanes.slice(0, i).reduce((a, x) => a + x.h, 0),
  }));
  const totalLaneH = computedLanes.reduce((a, l) => a + l.h, 0);

  const tbtn = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 11px",
    borderRadius: 8,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.lightBg : C.white,
    color: active ? C.primary : C.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  });
  const sep = {
    width: 1,
    height: 22,
    background: C.border,
    margin: "0 4px",
    flexShrink: 0,
  };
  const pinp = {
    padding: "5px 10px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.white,
    fontSize: 12,
    color: C.text,
    width: 150,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
  const psel = {
    padding: "5px 10px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.white,
    fontSize: 12,
    color: C.text,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
  const cursors = { select: "default", pan: "grab", connect: "crosshair" };

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: "hidden",
        background: C.white,
      }}
    >
      {/* TOOLBAR */}
      <div
        style={{
          display: "flex",
          gap: 5,
          padding: "10px 14px",
          borderBottom: `1px solid ${C.border}`,
          background: "#f7fbf8",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          style={tbtn(bMode === "select")}
          onClick={() => setBMode("select")}
        >
          ↖ Sélection
        </button>
        <button style={tbtn(bMode === "pan")} onClick={() => setBMode("pan")}>
          ✥ Déplacer
        </button>
        <button
          style={tbtn(bMode === "connect")}
          onClick={() => setBMode("connect")}
        >
          → Connecter
        </button>
        <div style={sep} />
        <button style={tbtn(false)} onClick={() => addBNode("task")}>
          ▭ Tâche
        </button>
        <button style={tbtn(false)} onClick={() => addBNode("start")}>
          ● Début
        </button>
        <button style={tbtn(false)} onClick={() => addBNode("end")}>
          ◉ Fin
        </button>
        <button style={tbtn(false)} onClick={() => addBNode("gateway")}>
          ◆ Passerelle
        </button>
        <div style={sep} />
        <button style={tbtn(false)} onClick={addBLane}>
          ⊞ Lane
        </button>
        <button
          style={{ ...tbtn(false), color: C.danger }}
          onClick={deleteBSelected}
        >
          ✕ Supprimer
        </button>
        <div style={sep} />
        <button style={tbtn(false)} onClick={loadBSample}>
          ↺ Exemple PFE
        </button>
        <button style={{ ...tbtn(false), color: C.muted }} onClick={clearBAll}>
          🗑 Vider
        </button>
        {bConnectFrom && (
          <span
            style={{
              fontSize: 11,
              color: C.primary,
              fontWeight: 700,
              background: C.lightBg,
              padding: "4px 10px",
              borderRadius: 8,
              marginLeft: 4,
            }}
          >
            → Cliquez sur le nœud cible
          </span>
        )}
      </div>

      {/* CANVAS */}
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          height: 490,
          background: "#f9fdfb",
          overflow: "hidden",
          cursor: cursors[bMode],
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onWheel={onWheel}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <defs>
            <marker
              id="bpmnarr"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0,0 8,3.5 0,7" fill={C.muted} />
            </marker>
            <marker
              id="bpmnarrsel"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0,0 8,3.5 0,7" fill="#378ADD" />
            </marker>
          </defs>
          <g transform={`translate(${bPan.x},${bPan.y}) scale(${bZoom})`}>
            {/* Swim lanes */}
            {computedLanes.length > 0 && (
              <>
                <rect
                  x={0}
                  y={40}
                  width={1050}
                  height={totalLaneH}
                  rx={6}
                  fill="none"
                  stroke={C.border}
                  strokeWidth={1.5}
                />
                {computedLanes.map((l, i) => (
                  <g key={l.id}>
                    {i > 0 && (
                      <line
                        x1={0}
                        y1={l.y}
                        x2={1050}
                        y2={l.y}
                        stroke={C.border}
                        strokeWidth={1}
                        strokeDasharray="5 4"
                      />
                    )}
                    <rect
                      x={0}
                      y={l.y}
                      width={60}
                      height={l.h}
                      fill={C.lightBg}
                      stroke={C.border}
                      strokeWidth={1}
                    />
                    <text
                      transform={`translate(28,${l.y + l.h / 2}) rotate(-90)`}
                      textAnchor="middle"
                      fontSize={10}
                      fill={C.muted}
                      fontWeight={600}
                      fontFamily="sans-serif"
                    >
                      {l.label}
                    </text>
                  </g>
                ))}
              </>
            )}

            {/* Arêtes */}
            {bEdges.map((e) => {
              const from = bNodes.find((n) => n.id === e.from);
              const to = bNodes.find((n) => n.id === e.to);
              if (!from || !to) return null;
              const mx = (from.x + to.x) / 2;
              const sel = bSelected === e.from || bSelected === e.to;
              return (
                <g key={e.id}>
                  <path
                    d={`M${from.x},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`}
                    stroke="transparent"
                    strokeWidth={14}
                    fill="none"
                    style={{ cursor: "pointer" }}
                    onClick={(ev) => onEdgeClick(ev, e.id)}
                  />
                  <path
                    d={`M${from.x},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`}
                    stroke={sel ? "#378ADD" : C.muted}
                    strokeWidth={sel ? 2 : 1.5}
                    fill="none"
                    markerEnd={`url(#bpmnarr${sel ? "sel" : ""})`}
                    style={{ pointerEvents: "none" }}
                  />
                  {e.label && (
                    <text
                      x={mx}
                      y={(from.y + to.y) / 2 - 6}
                      textAnchor="middle"
                      fontSize={9}
                      fill={C.muted}
                      fontFamily="sans-serif"
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nœuds */}
            {bNodes.map((n) => (
              <BpmnNodeShape
                key={n.id}
                node={n}
                selected={n.id === bSelected}
                onMouseDown={onNodeMouseDown}
                onMouseUp={onNodeMouseUp}
                onHandleMouseDown={onHandleMouseDown}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* PROPRIÉTÉS */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${C.border}`,
          background: "#f7fbf8",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: 12,
          minHeight: 44,
        }}
      >
        {selNode ? (
          <>
            <span style={{ color: C.muted }}>Libellé :</span>
            <input
              style={pinp}
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onBlur={() =>
                setBNodes((p) =>
                  p.map((n) =>
                    n.id === bSelected ? { ...n, label: labelInput } : n,
                  ),
                )
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                setBNodes((p) =>
                  p.map((n) =>
                    n.id === bSelected ? { ...n, label: labelInput } : n,
                  ),
                )
              }
            />
            <span style={{ color: C.muted }}>Lane :</span>
            <select
              style={psel}
              value={laneInput}
              onChange={(e) => {
                setLaneInput(e.target.value);
                setBNodes((p) =>
                  p.map((n) =>
                    n.id === bSelected
                      ? { ...n, lane: e.target.value || null }
                      : n,
                  ),
                );
              }}
            >
              <option value="">— Aucune —</option>
              {bLanes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              style={{ ...tbtn(false), color: C.danger, marginLeft: "auto" }}
              onClick={deleteBSelected}
            >
              ✕ Supprimer
            </button>
          </>
        ) : (
          <span style={{ color: C.muted, fontSize: 11 }}>
            Cliquez sur un nœud pour le modifier · Cliquez sur une flèche pour
            l'étiqueter · Survolez un nœud pour les points de connexion
          </span>
        )}
      </div>

      {/* POPUP LABEL ARÊTE */}
      {editingEdge && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: `1px solid ${C.border}`,
            background: C.lightBg,
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12,
          }}
        >
          <span style={{ color: C.muted }}>Libellé de la connexion :</span>
          <input
            autoFocus
            style={pinp}
            value={edgeLabel}
            onChange={(e) => setEdgeLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmEdgeLabel();
              if (e.key === "Escape") setEditingEdge(null);
            }}
          />
          <button
            style={{
              ...tbtn(true),
              background: C.primary,
              color: "#fff",
              borderColor: C.primary,
            }}
            onClick={confirmEdgeLabel}
          >
            ✓ OK
          </button>
          <button style={tbtn(false)} onClick={() => setEditingEdge(null)}>
            Annuler
          </button>
        </div>
      )}

      {/* ZOOM */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderTop: `1px solid ${C.border}`,
          background: "#f7fbf8",
          fontSize: 11,
          color: C.muted,
        }}
      >
        <button
          style={{ ...tbtn(false), padding: "2px 8px", fontSize: 14 }}
          onClick={() => setBZoom((z) => Math.max(0.25, z - 0.1))}
        >
          −
        </button>
        <input
          type="range"
          min={25}
          max={250}
          value={Math.round(bZoom * 100)}
          onChange={(e) => setBZoom(e.target.value / 100)}
          style={{ width: 100 }}
        />
        <button
          style={{ ...tbtn(false), padding: "2px 8px", fontSize: 14 }}
          onClick={() => setBZoom((z) => Math.min(2.5, z + 0.1))}
        >
          +
        </button>
        <span style={{ minWidth: 36 }}>{Math.round(bZoom * 100)}%</span>
        <button
          style={{ ...tbtn(false), padding: "2px 8px", fontSize: 11 }}
          onClick={() => {
            setBZoom(1);
            setBPan({ x: 0, y: 0 });
          }}
        >
          ↺ Réinitialiser vue
        </button>
        <div style={{ flex: 1 }} />
        <span>
          Mode :{" "}
          <strong>
            {
              {
                select: "Sélection",
                pan: "Déplacer vue",
                connect: "Connexion",
              }[bMode]
            }
          </strong>
          {bConnectFrom && " — cliquez sur le nœud cible"}
        </span>
      </div>
    </div>
  );
}

export default BpmnEditor;

