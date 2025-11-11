// src/components/OrgChartView_d3.js
import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
// NOTE: no d3-org-chart here – we render manually
import html2canvas from "html2canvas";
import Controls from "./Controls";
import InstructionsPopup from "./InstructionsPopup";
import "./OrgChartView.css";
import { buildHierarchy, applyBalkanLayout } from "../layouts/balkanLike";
import jsPDF from "jspdf";

function OrgChartView_d3({
  data,
  originalData,
  setDisplayData,      // not used by custom engine; kept for API compatibility
  setSelectedEmployee,
  onBackToUpload,
  headers = [],
  department = "",
}) {
  const chartContainerRef = useRef(null);
  const exportRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLayout, setSelectedLayout] = useState("normal"); // Balkan-like key
  const [template, setTemplate] = useState("ana");
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [visibleData, setVisibleData] = useState(data || []);
  const [version, setVersion] = useState(0); // force rerender when needed

  useEffect(() => setVisibleData(data || []), [data]);

  const localDepartment = department;

  // === status color helper ===
  const getColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("active")) return "#1e4489";
    if (s.includes("notice")) return "#bd2331";
    if (s.includes("vacant") || s.includes("vacency")) return "#ef6724";
    return "#b0b0b0";
  };

  // === templates ===
  const TEMPLATES = useMemo(
    () => ({
      ana: (d) => {
        const color = getColor(d.data.status);
        const extras = d.data.raw?.__extras || [];

        const extrasHTML = extras
          .map(
            (val) => `
              <div style="
                font-size:14px;
                font-weight:500;
                color:rgba(255,255,255,0.95);
                line-height:1.4;
                text-align:left;
              ">${val}</div>`
          )
          .join("");

        const photoBlock = d.data.photo
          ? `<img src="${d.data.photo}" style="
                width:70px; height:70px; border-radius:50%;
                border:3px solid #fff; object-fit:cover; flex-shrink:0;
              "/>`
          : `<div style="
                width:70px; height:70px; border-radius:50%;
                border:3px solid #fff; display:flex; align-items:center;
                justify-content:center; font-size:30px;
                background:rgba(255,255,255,.15); flex-shrink:0;
              ">👤</div>`;

        return `
          <div style="
            width:340px; height:130px; border-radius:10px; background:${color};
            color:#fff; display:flex; flex-direction:column; justify-content:center;
            padding:10px 14px; box-shadow:0 3px 8px rgba(0,0,0,0.2);
            font-family:Arial, sans-serif;
          ">
            <div style="display:flex;align-items:center;gap:10px;">
              ${photoBlock}
              <div style="flex:1;text-align:left;">${extrasHTML || ""}</div>
            </div>
            <div style="
              text-align:center; font-weight:700; font-size:18px; margin-top:6px;
              letter-spacing:0.3px;
            ">${d.data.name || ""}</div>
          </div>
        `;
      },

      olivia: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:240px;height:120px;border-radius:16px;background:${color};
            color:#fff;text-align:center;display:flex;flex-direction:column;
            justify-content:center;align-items:center;box-shadow:0 3px 6px rgba(0,0,0,.2);">
            <img src="${d.data.photo || ""}" style="width:56px;height:56px;border-radius:50%;
              border:2px solid #fff;margin-bottom:6px;object-fit:cover;"/>
            <div style="font-weight:700;font-size:15px;">${d.data.name || ""}</div>
          </div>`;
      },
      belinda: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:240px;border-radius:10px;background:${color};
            color:#fff;overflow:hidden;box-shadow:0 2px 5px rgba(0,0,0,.2);
            padding:12px;text-align:center;">
            <div style="font-weight:700;font-size:15px;">${d.data.name || ""}</div>
          </div>`;
      },
      rony: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:230px;height:110px;border-radius:12px;background:${color};
            color:#fff;display:flex;align-items:center;justify-content:center;
            flex-direction:column;box-shadow:0 2px 6px rgba(0,0,0,.15);
            text-align:center;">
            <div style="font-weight:700;font-size:16px;">${d.data.name || ""}</div>
          </div>`;
      },
      mery: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:210px;text-align:center;border-radius:12px;background:${color};
            color:#fff;padding:10px;box-shadow:0 2px 6px rgba(0,0,0,.15);">
            <img src="${d.data.photo || ""}" style="width:56px;height:56px;border-radius:50%;
              border:2px solid #fff;margin-bottom:6px;object-fit:cover;"/>
            <div style="font-weight:700;font-size:15px;">${d.data.name || ""}</div>
          </div>`;
      },
      polina: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:250px;height:110px;border-radius:10px;background:${color};
            color:#fff;display:flex;align-items:center;justify-content:space-between;
            padding:10px;box-shadow:0 2px 6px rgba(0,0,0,.15);">
            <img src="${d.data.photo || ""}" style="width:54px;height:54px;border-radius:50%;
              border:2px solid #fff;object-fit:cover;"/>
            <div style="flex:1;margin-left:10px;">
              <div style="font-weight:700;font-size:15px;">${d.data.name || ""}</div>
            </div>
          </div>`;
      },
      diva: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:230px;border-radius:10px;background:${color};color:#fff;
            text-align:center;padding:10px;box-shadow:0 2px 6px rgba(0,0,0,.15);">
            <div style="font-weight:700;font-size:15px;">${d.data.name || ""}</div>
            <img src="${d.data.photo || ""}" style="width:46px;height:46px;border-radius:50%;
              border:2px solid #fff;margin-top:6px;object-fit:cover;"/>
          </div>`;
      },
      isla: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:250px;height:110px;border-radius:12px;background:${color};
            color:#fff;display:flex;align-items:center;justify-content:center;
            padding:10px;box-shadow:0 2px 6px rgba(0,0,0,.15);">
            <div style="flex:1;text-align:left;">
              <div style="font-weight:700;font-size:15px;">${d.data.name || ""}</div>
            </div>
            <img src="${d.data.photo || ""}" style="width:54px;height:54px;border-radius:50%;
              border:2px solid #fff;margin-left:10px;object-fit:cover;"/>
          </div>`;
      },
    }),
    []
  );

  // === draw chart ===
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !visibleData?.length) {
      if (container) d3.select(container).selectAll("*").remove();
      return;
    }

    // 1) prepare rows with up to 2 extras
    const rows = visibleData.map((r) => {
      const extras = (selectedExtras || [])
        .map((f) => (r[f] != null ? String(r[f]).trim() : ""))
        .filter(Boolean)
        .slice(0, 2);

      return {
        id: r.ID,
        parentId: r["Parent ID"] || null,
        name: r.First_Name || r.name || "",
        title: r.Designation || r.title || "",
        photo: r.Photo || "",
        status: r.Status || "",
        raw: { ...r, __extras: extras },
        _nodeW: 320,
        _nodeH: 120,
      };
    });

    // 2) hierarchy + layout
    const root = buildHierarchy(rows);
    applyBalkanLayout(root, selectedLayout, {
      nodeW: 320,
      nodeH: 120,
      compactBetween: 30,
      compactPair: 40,
      levelGap: 140,
      hGap: 40,
      vGap: 60,
      maxCols: 6,
    });

    // 3) compute canvas size
    const nodes = root.descendants();
    const maxX = d3.max(nodes, (d) => d.X + (d.data._nodeW || 320)) || 1200;
    const maxY = d3.max(nodes, (d) => d.Y + (d.data._nodeH || 120)) || 800;
    const W = Math.max(1200, maxX + 40);
    const H = Math.max(800, maxY + 40);

    // 4) clear & draw
    d3.select(container).selectAll("*").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .style("overflow", "visible");

    const g = svg.append("g");

    // 5) links
    const verticalLink = d3
      .linkVertical()
      .x((d) => d.x)
      .y((d) => d.y);

    const links = root.links().map((l) => {
      const sw = l.source.data._nodeW || 320;
      const sh = l.source.data._nodeH || 120;
      const tw = l.target.data._nodeW || 320;
      return {
        source: { x: l.source.X + sw / 2, y: l.source.Y + sh },
        target: { x: l.target.X + tw / 2, y: l.target.Y },
      };
    });

    g.selectAll(".link")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", verticalLink)
      .attr("fill", "none")
      .attr("stroke", "#1e4489")
      .attr("stroke-width", 4);

    // 6) nodes (foreignObject so you can use your HTML templates)
    const node = g
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("foreignObject")
      .attr("class", "node")
      .attr("width", (d) => d.data._nodeW || 320)
      .attr("height", (d) => d.data._nodeH || 120)
      .attr("x", (d) => d.X)
      .attr("y", (d) => d.Y)
      .style("overflow", "visible");

    node
      .append("xhtml:div")
      .attr("class", (d) => `template-${template}`)
      .html((d) => {
        const base =
          TEMPLATES[template]?.({ data: d.data }) || TEMPLATES.ana({ data: d.data });
        const extras = (d.data.raw?.__extras || [])
          .map(
            (val, i) =>
              `<div style="font-size:11px;opacity:0.9;line-height:1.3;margin-top:${i === 0 ? "4px" : "2px"};">${val}</div>`
          )
          .join("");
        return `
          <div style="width:100%;height:100%;display:flex;flex-direction:column;">
            ${base}
            <div style="padding:4px 6px;text-align:left;">${extras}</div>
          </div>
        `;
      })
      .on("click", (_, d) => {
        const emp = originalData?.find((r) => String(r.ID) === String(d.data.id));
        if (emp && setSelectedEmployee) setSelectedEmployee(emp);
      });
  }, [visibleData, template, selectedLayout, selectedExtras, version]);

  // === handlers ===
  const handleExportImage = async () => {
    const node = chartContainerRef.current;
    if (!node) return;
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = "orgchart.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleLayoutChange = (layoutKey) => {
    // expected values: "normal","mixed","tree","treeLeft","treeLeftOffset","treeRight","treeRightOffset","grid"
    setSelectedLayout(layoutKey);
    setVersion((v) => v + 1); // trigger redraw
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setVisibleData(data || []);
    setVersion((v) => v + 1);
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q || !q.trim()) {
      setVisibleData(data || []);
      setVersion((v) => v + 1);
      return;
    }
    if (!originalData?.length) return;

    const root = originalData.find((r) =>
      String(r.First_Name || r.name || "").toLowerCase().includes(q.toLowerCase())
    );
    if (!root) return;

    const collectSubtree = (id) => {
      const kids = originalData.filter((e) => e["Parent ID"] === id);
      return [...kids, ...kids.flatMap((c) => collectSubtree(c.ID))];
    };
    const subtree = [root, ...collectSubtree(root.ID)];
    setVisibleData(subtree);
    setVersion((v) => v + 1);
  };

  const handlePrint = () => window.print();

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleExtra = (field) => {
    setSelectedExtras((prev) => {
      if (prev.includes(field)) return prev.filter((f) => f !== field);
      if (prev.length >= 2) return prev; // limit 2
      return [...prev, field];
    });
  };

  // === render ===
  return (
    <>
      <div
        className="print-header"
        style={{ display: "none", textAlign: "center", marginBottom: 10 }}
      >
        <img src="/onlylogo.png" alt="Logo" />
        <h1>Suprajit</h1>
        <span className="print-department">
          {localDepartment ? `Department name: ${localDepartment}` : ""}
        </span>
      </div>

      <div className="orgchart-view">
        <header className="header">SUPRAJIT ENGINEERING LIMITED</header>

        {/* Controls + info */}
        <div
          className="orgchart-container"
          style={{
            background: "#a9d8f3",
            padding: "5px 10px",
            borderRadius: "8px",
            marginBottom: "5px",
          }}
        >
          <Controls
            searchQuery={searchQuery}
            setSearchQuery={handleSearch}
            onRefresh={handleRefresh}
            onBack={onBackToUpload}
            onPrint={handlePrint}
            onExportImage={handleExportImage}
            toggleFullScreen={toggleFullScreen}
            onLayoutChange={handleLayoutChange}
            selectedLayout={selectedLayout}
            templates={[
              { key: "ana", label: "Ana" },
              { key: "olivia", label: "Olivia" },
              { key: "belinda", label: "Belinda" },
              { key: "rony", label: "Rony" },
              { key: "mery", label: "Mery" },
              { key: "polina", label: "Polina" },
              { key: "diva", label: "Diva" },
              { key: "isla", label: "Isla" },
            ]}
            onSelectTemplate={setTemplate}
            selectedTemplate={template}
            // Ensure your Controls component emits one of these exact keys:
            // "normal","mixed","tree","treeLeft","treeLeftOffset","treeRight","treeRightOffset","grid"
          />

          {/* Instructions + Field Selector */}
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
              Before printing, click Refresh to ensure the chart fits properly on your screen.
            </label>
            <span style={{ color: "black", marginRight: 8, fontSize: 14 }}>
              Click on a person to open the popup then click '+' to upload a photo.
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
                  return (
                    key !== "photo" &&
                    key !== "image" &&
                    key !== "first_name" &&
                    key !== "name"
                  );
                })
                .map((h) => (
                  <label key={h} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedExtras.includes(h)}
                      onChange={() => toggleExtra(h)}
                    />
                    <span>{h}</span>
                  </label>
                ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="print-label" ref={exportRef}>
          <div className={`chart-container template-${template}`} id="orgChart" ref={chartContainerRef} />
        </div>

        {/* Legend */}
        <div className="footer-wrapper">
          <div className="theme">
            <p className="themep">
              <img src="./Blue.png" alt="Blue" className="logo1" /> - refers to Active
            </p>
            <p className="themep">
              <img src="./Orange.png" alt="Orange" className="logo1" /> - refers to Vacant
            </p>
            <p className="themep">
              <img src="./Red.png" alt="Red" className="logo1" /> - refers to Notice
            </p>
          </div>
        </div>

        {showInstructions && <InstructionsPopup onClose={() => setShowInstructions(false)} />}
      </div>
    </>
  );
}

export default OrgChartView_d3;
