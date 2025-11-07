// src/components/OrgChartView_d3.js
import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { OrgChart } from "d3-org-chart";
import html2canvas from "html2canvas";
import Controls from "./Controls";
import InstructionsPopup from "./InstructionsPopup";
import "./OrgChartView.css";

function OrgChartView_d3({
  data,
  originalData,
  setDisplayData,
  setSelectedEmployee,
  onBackToUpload,
  headers = [],
  department = "",
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const exportRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [layout, setLayout] = useState("top");
  const [template, setTemplate] = useState("ana");
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);

  const localDepartment = department;

  // === status color helper ===
  const getColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("active")) return "#1e4489";
    if (s.includes("notice")) return "#bd2331";
    if (s.includes("vacant") || s.includes("vacency")) return "#ef6724";
    return "#b0b0b0";
  };

   // template renderers
  const TEMPLATES = useMemo(
    () => ({
      ana: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="
            width:220px;
            height:auto;
            min-height:110px;
            border-radius:10px;
            background:${color};
            color:#fff;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            padding:10px 5px;
            box-shadow:0 2px 6px rgba(0,0,0,0.15);
            text-align:center;
          ">
            ${
              d.data.photo
                ? `<img src="${d.data.photo}" style="
                      width:50px;
                      height:50px;
                      border-radius:50%;
                      border:2px solid #fff;
                      object-fit:cover;
                      margin-bottom:6px;
                    "/>`
                : `<div style="
                      width:50px;
                      height:50px;
                      border-radius:50%;
                      border:2px solid #fff;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      font-size:20px;
                      margin-bottom:6px;
                    ">👤</div>`
            }
            <div style="font-weight:700;font-size:14px;line-height:1.3;">
              ${d.data.name || ""}
            </div>
          </div>`;
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

  const LAYOUT_MAP = { top: "top", left: "left", right: "right", bottom: "bottom" };

  // === render chart ===
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !data?.length) return;

    const chartData = data.map((r) => ({
      id: r.ID,
      parentId: r["Parent ID"] || null,
      name: r.First_Name || r.name || "",
      title: r.Designation || r.title || "",
      photo: r.Photo || "",
      status: r.Status || "",
      raw: r,
    }));

    const instance = chartRef.current || new OrgChart().container(container);

    instance
      .data(chartData)
      .nodeWidth(() => 260)
      .nodeHeight(() => 120)
      .childrenMargin(() => 60)
      .layout(LAYOUT_MAP[layout] || "top")
      .linkUpdate(function () {
        d3.select(this)
          .attr("stroke", "#1e4489")
          .attr("stroke-width", 3)
          .attr("fill", "none");
      })
      .nodeContent((d) => {
        // Collect up to 2 extra field values based on user's checkbox selections
        const extras = selectedExtras
          .map((field) => d.data.raw?.[field])
          .filter(Boolean)
          .slice(0, 2); // limit to 2 fields

        // Create small HTML block for extra fields
        const extrasHTML = extras
          .map(
            (val, i) =>
              `<div style="font-size:11px;opacity:0.9;line-height:1.3;margin-top:${i === 0 ? '4px' : '2px'};">${val}</div>`
          )
          .join("");

        // Get the base template content (always shows name and maybe title)
        const baseContent =
          TEMPLATES[template]?.(d) || TEMPLATES.ana(d);

        // Inject the extras just before closing </div> tag (at the bottom of the node)
        return baseContent.replace("</div>", `${extrasHTML}</div>`);
      })

      .onNodeClick((d) => {
        const emp = originalData.find(
          (r) => String(r.ID) === String(d.data.id)
        );
        if (emp && setSelectedEmployee) setSelectedEmployee(emp);
      })
      .expandAll()
      .render()
      .fit();

    chartRef.current = instance;
  }, [data, template, layout, selectedExtras, TEMPLATES]);

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

  const handleLayoutChange = (l) => {
    setLayout(l);
    chartRef.current?.layout(l).render().fit();
  };

  const handleRefresh = () => {
    chartRef.current?.expandAll().render().fit();
    setSearchQuery("");
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q) return chartRef.current?.clearHighlight().render();
    chartRef.current
      ?.setHighlighted((node) =>
        String(node.data.name || "").toLowerCase().includes(q.toLowerCase())
      )
      .render();
  };

  const handlePrint = () => window.print();
  const toggleFullScreen = () => {
    !document.fullscreenElement
      ? document.documentElement.requestFullscreen()
      : document.exitFullscreen();
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

        {/* === Combined Controls + Info Section === */}
        <div
          className="orgchart-container"
          style={{
            background: "#a9d8f3",
            padding: "5px 10px",
            borderRadius: "8px",
            marginBottom: "5px",
          }}
        >
          {/* Controls */}
          <Controls
            searchQuery={searchQuery}
            setSearchQuery={handleSearch}
            onRefresh={handleRefresh}
            onBack={onBackToUpload}
            onPrint={handlePrint}
            onExportImage={handleExportImage}
            toggleFullScreen={toggleFullScreen}
            onLayoutChange={handleLayoutChange}
            selectedLayout={layout}
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
          />

          {/* Instructions + Field Selector (aligned baseline, right side) */}
          <div
            className="field-selectors"
            style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '5px 5px' }}
          >
            {/* Left Section — Instructions */}
            {/* <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: "60%",
              }}
            > */}
              {/* <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  lineHeight: "1.4",
                }}
              > */}
                <span className="instructions-popup" style={{ textAlign: "center" }}>
                  <button
                    onClick={() => setShowInstructions(true)}
                    title="View Instructions"
                    style={{
                      fontSize: 14,
                      cursor: "pointer",
                      // borderRadius: "5px",
                      // padding: "2px 8px",
                      // fontWeight: "bold",
                    }}
                  >
                    ⓘ Instructions
                  </button>
                </span>
                <label style={{ marginRight: 4, fontSize: 14 }}>Before printing, click the Refresh button to ensure the chart fits properly on your screen.</label>
                <span style={{ color: 'black', marginRight: 8, fontSize: 14 }}>Click on a person to open the popup then click '+' icon to upload Photo of a person
                </span>
                <label style={{ marginRight: 4, marginLeft: 4, fontSize: 12 }}>Select up to 2 additional fields to show:</label>
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
                  // background: "#fff",
                }}
              >
                {(headers || []).map((h) => (
                  <label
                    key={h}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
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

        </div>

        {/* Chart */}
        <div className="print-label" ref={exportRef}>
          <div
            className={`chart-container template-${template}`}
            id="orgChart"
            ref={chartContainerRef}
          ></div>
        </div>
      

      {/* === Status Legend === */}
      <div className="theme">
        <p className="themep">
          <img src="./Blue.png" alt="Blue" className="logo1" /> - refers to
          Active
        </p>
        <p className="themep">
          <img src="./Orange.png" alt="Orange" className="logo1" /> - refers to
          Vacant
        </p>
        <p className="themep">
          <img src="./Red.png" alt="Red" className="logo1" /> - refers to Notice
        </p>
      </div>

      {showInstructions && (
        <InstructionsPopup onClose={() => setShowInstructions(false)} />
      )}
    </>
  );
}

export default OrgChartView_d3;
