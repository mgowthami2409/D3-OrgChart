// src/components/OrgChartViewFree.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { OrgChart } from "d3-org-chart";
import html2canvas from "html2canvas";
import Controls from "./Controls"; // use the Controls below
import InstructionsPopup from "./InstructionsPopup";
import "./OrgChartView.css";

window.d3 = d3; // some builds of d3-org-chart expect global d3

const ACTIVE = "#1e4489";
const NOTICE = "#bd2331";
const VACANT = "#ef6724";
const NEUTRAL = "#e0e0e0";

function OrgChartView({
  data,
  originalData,
  setDisplayData,
  setSelectedEmployee,
  onBackToUpload,
  headers = [],
  selectedFields = { nameField: "First_Name", titleField: "Designation" },
  setSelectedFields,
  department = "",
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  // We’ll keep your layout selector — map “mixed” → “top”
  const [layout, setLayout] = useState("mixed");
  const layoutMap = { mixed: "top", top: "top", left: "left", right: "right", bottom: "bottom" };

  // Your previous template selector existed, but design is unified now.
  // We keep the prop wiring to avoid breaking anything.
  const templates = useMemo(() => [{ key: "balkanLike", label: "Balkan" }], []);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].key);

  // selected fields
  const [localSelected, setLocalSelected] = useState({
    nameField: "First_Name",
    titleField: "Designation",
    extras: [],
  });
  const effectiveSelected =
    selectedFields && setSelectedFields
      ? { ...selectedFields, extras: selectedFields.extras || [] }
      : localSelected;

  // department text
  const [localDepartment, setLocalDepartment] = useState(department || "");
  useEffect(() => {
    if (department) {
      setLocalDepartment(department);
      return;
    }
    try {
      const possible = ["Department", "department", "Dept", "dept", "Department Name", "DepartmentName"];
      if (Array.isArray(originalData) && originalData.length) {
        const hk = (headers || []).find((h) => possible.includes(h));
        if (hk) {
          const counts = {};
          for (const r of originalData) {
            const v = (r[hk] || "").toString().trim();
            if (!v) continue;
            counts[v] = (counts[v] || 0) + 1;
          }
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          if (top) setLocalDepartment(top[0]);
        } else {
          for (const k of possible) {
            const v = originalData[0][k] || "";
            if (v && v.toString().trim()) {
              setLocalDepartment(v.toString().trim());
              break;
            }
          }
        }
      }
    } catch {}
  }, [department, headers, originalData]);

  // helpers
  const statusColor = (status) => {
    if (!status) return NEUTRAL;
    const s = String(status).toLowerCase();
    if (s.includes("active")) return ACTIVE;
    if (s.includes("notice")) return NOTICE;
    if (s.includes("vacant") || s.includes("vacency")) return VACANT;
    return NEUTRAL;
  };

  // map rows → nodes
  const mapRowToNode = useCallback(
    (row) => {
      const nameKey = effectiveSelected.nameField || "First_Name";
      const extras = Array.isArray(effectiveSelected.extras) ? effectiveSelected.extras.slice(0, 2) : [];
      const subtitle = extras.map((k) => row[k] || "").filter(Boolean).join(" - ");
      return {
        id: row.ID,
        parentId: row["Parent ID"] || null,
        name: row[nameKey] || "",
        title: subtitle,
        img: row.Photo,
        status: row.Status || row.status || "",
        raw: row,
      };
    },
    [effectiveSelected.nameField, effectiveSelected.extras]
  );

  const nodes = useMemo(() => (Array.isArray(data) ? data.map(mapRowToNode) : []), [data, mapRowToNode]);

  // Node content: FULL solid color background + white text (Balkan-like)
  const NODE_W = 420;
  const NODE_H = 200;
  const nodeContent = (d) => {
    const bg = statusColor(d.data.status);
    const img =
      d.data.img
        ? `<img class="node-photo" src="${d.data.img}" alt="photo" />`
        : `<div class="node-photo node-photo--placeholder"> </div>`;
    return `
      <div class="node node--solid" style="width:${NODE_W}px;height:${NODE_H}px;background:${bg}">
        <div class="node-body">
          ${img}
          <div class="node-text">
            <div class="node-name" style="color:#fff">${d.data.name || ""}</div>
            <div class="node-title" style="color:#fff">${d.data.title || ""}</div>
          </div>
          <div class="status-badge" style="background:${bg}"></div>
        </div>
      </div>
    `;
  };

  // collapse count (optional badge when collapsed)
  const computeSubtreeCount = (chart, nodeId) => {
    const node = chart.getNode?.(nodeId);
    if (!node || !node.children) return 0;
    let count = 0;
    const dfs = (n) => {
      if (!n.children?.length) return;
      for (const c of n.children) {
        count += 1;
        dfs(c);
      }
    };
    dfs(node);
    return count;
  };

  const refreshCollapseCounters = (chart) => {
    const wrap = chartContainerRef.current;
    const state = chart.getChartState?.();
    if (!wrap || !state?.allNodes) return;
    state.allNodes.forEach((n) => {
      const host = wrap.querySelector(`[data-node-id="${n.data.id}"] .node`);
      if (!host) return;
      let badge = host.querySelector(".collapse-count");
      const total = computeSubtreeCount(chart, n.data.id);
      const collapsed = !n.expanded;
      if (total > 0 && collapsed) {
        if (!badge) {
          badge = document.createElement("div");
          badge.className = "collapse-count";
          host.appendChild(badge);
        }
        badge.textContent = String(total);
        badge.style.display = "flex";
      } else if (badge) {
        badge.remove();
      }
    });
  };

  // init / render
  useEffect(() => {
    if (!chartContainerRef.current || !nodes.length) return;

    let chart = chartRef.current;
    if (!chart) {
      chart = new OrgChart();
      chartRef.current = chart;
    }

    chart
      .container(chartContainerRef.current)
      .data(nodes)
      .nodeWidth(() => NODE_W)
      .nodeHeight(() => NODE_H)
      .childrenMargin(() => 40)
      .compact(false)
      .layout(layoutMap[layout] || "top")
      .nodeContent((d) => nodeContent(d))
      .onNodeClick((d) => {
        const id = d?.data?.id;
        if (!id || !Array.isArray(data)) return;
        const emp = data.find((r) => String(r.ID) === String(id));
        if (emp && setSelectedEmployee) setSelectedEmployee(emp);
      })
      .expandAll() 
      .render()
      .fit();

    // style links like your blue lines
    d3.select(chartContainerRef.current)
      .selectAll("path.link")
      .attr("stroke", ACTIVE)
      .attr("stroke-width", 2)
      .attr("fill", "none");

    setTimeout(() => refreshCollapseCounters(chart), 0);

    return () => {
      if (chartContainerRef.current) chartContainerRef.current.innerHTML = "";
    };
  }, [nodes, layout, data]);

  // handlers (same behaviour)
  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    const chart = chartRef.current;
    if (chart) {
      chart.layout(layoutMap[newLayout] || "top").render().fit();
      setTimeout(() => refreshCollapseCounters(chart), 0);
    }
  };

  const handleExportImage = async () => {
    if (!chartContainerRef.current) return;
    const imgs = chartContainerRef.current.querySelectorAll("img");
    await Promise.all(
      Array.from(imgs).map((img) => {
        if (img.complete) return img.decode?.().catch(() => {});
        return new Promise((res) => {
          img.onload = img.onerror = res;
        });
      })
    );
    const canvas = await html2canvas(chartContainerRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = "orgchart.png";
    link.click();
  };

  const handleRefresh = () => {
    setDisplayData?.(originalData);
    const chart = chartRef.current;
    if (chart && Array.isArray(originalData)) {
      chart.data(originalData.map(mapRowToNode)).render().fit();
      setTimeout(() => refreshCollapseCounters(chart), 0);
    }
    setSearchQuery("");
  };

  const handleBack = () => onBackToUpload?.();
  const handlePrint = () => window.print();

  const handleSearch = (query) => {
    setSearchQuery(query);
    const chart = chartRef.current;
    if (!chart || !Array.isArray(originalData)) return;

    if (!query) {
      chart.data(originalData.map(mapRowToNode)).render().fit();
      setTimeout(() => refreshCollapseCounters(chart), 0);
      return;
    }
    const nameKey = effectiveSelected.nameField || "First_Name";
    const root = originalData.find((emp) =>
      String(emp[nameKey] || "").toLowerCase().includes(String(query).toLowerCase())
    );
    if (!root) return;

    const collectSubtree = (id) => {
      const children = originalData.filter((e) => e["Parent ID"] === id);
      return [
        ...children,
        ...children.flatMap((child) => collectSubtree(child.ID)),
      ];
    };
    const subset = [root, ...collectSubtree(root.ID)];
    chart.data(subset.map(mapRowToNode)).render().fit();
    setTimeout(() => refreshCollapseCounters(chart), 0);
  };

  const toggleExtra = (field) => {
    const curr = Array.isArray(effectiveSelected.extras) ? [...effectiveSelected.extras] : [];
    let next = [];
    if (curr.includes(field)) next = curr.filter((f) => f !== field);
    else {
      if (curr.length >= 2) return;
      next = [...curr, field];
    }
    const newVal = { ...effectiveSelected, extras: next };
    if (setSelectedFields) setSelectedFields(newVal);
    else setLocalSelected(newVal);
  };

  const toggleFullScreen = () => {
    const elem = document.getElementById("orgChart");
    if (!document.fullscreenElement) {
      if (elem?.requestFullscreen) elem.requestFullscreen();
      else if (elem?.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem?.msRequestFullscreen) elem.msRequestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <>
      <div className="print-header" style={{ display: "none" }}>
        <img src="/onlylogo.png" alt="Logo" />
        <h1>Suprajit</h1>
        <span className="print-department">
          {localDepartment ? `Department name: ${localDepartment}` : ""}
        </span>
      </div>

      <div className="orgchart-view">
        <header className="header">SUPRAJIT ENGINEERING LIMITED</header>

        <Controls
          searchQuery={searchQuery}
          setSearchQuery={handleSearch}
          onRefresh={handleRefresh}
          onBack={handleBack}
          onPrint={handlePrint}
          templates={templates}
          onSelectTemplate={setSelectedTemplate}   // kept for compatibility (no visual change)
          selectedTemplate={selectedTemplate}
          onExportImage={handleExportImage}
          toggleFullScreen={toggleFullScreen}
          onLayoutChange={handleLayoutChange}
          selectedLayout={layout}
        />

        <div className="orgchart-container">
          <div
            className="field-selectors"
            style={{ display: "flex", gap: 3, alignItems: "center", padding: "5px 5px" }}
          >
            <span className="instructions-popup" style={{ textAlign: "center" }}>
              <button
                onClick={() => setShowInstructions(true)}
                title="View Instructions"
                style={{ fontSize: 14, cursor: "pointer" }}
              >
                ⓘ Instructions
              </button>
            </span>
            <label style={{ marginRight: 4, fontSize: 14 }}>
              Before printing, click the Refresh button to ensure the chart fits properly on your screen.
            </label>
            <span style={{ color: "black", marginRight: 8, fontSize: 14 }}>
              Click on a person to open the popup then click '+' icon to upload Photo of a person
            </span>

            <label style={{ marginRight: 4, marginLeft: 4, fontSize: 12 }}>
              Select up to 2 additional fields to show:
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                maxHeight: 100,
                width: 180,
                overflow: "auto",
                fontSize: 14,
                padding: 2,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            >
              {(headers || [])
                .filter((h) => {
                  const key = String(h).toLowerCase();
                  return key !== "photo" && key !== "image" && key !== (effectiveSelected.nameField || "first_name").toLowerCase();
                })
                .map((h) => {
                  const checked =
                    Array.isArray(effectiveSelected.extras) && effectiveSelected.extras.includes(h);
                  return (
                    <label key={h} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleExtra(h)} />
                      <span>{h}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="print-label">
            <div className="chart-container" id="orgChart" ref={chartContainerRef} />
          </div>
        </div>
      </div>

      <div className="theme">
        <p className="themep"><img src="./Blue.png" alt="Blue" className="logo1" /> - refers to Active</p>
        <p className="themep"><img src="./Orange.png" alt="Orange" className="logo1" /> - refers to Vacant</p>
        <p className="themep"><img src="./Red.png" alt="Red" className="logo1" /> - refers to Notice</p>
      </div>

      {showInstructions && <InstructionsPopup onClose={() => setShowInstructions(false)} />}
    </>
  );
}

export default OrgChartView;
