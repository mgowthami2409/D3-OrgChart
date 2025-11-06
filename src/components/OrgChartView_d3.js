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

  const [searchQuery, setSearchQuery] = useState("");
  const [layout, setLayout] = useState("top");
  const [template, setTemplate] = useState("ana");
  const [showInstructions, setShowInstructions] = useState(false);

  // color logic for statuses
  const getColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("active")) return "#1e4489";
    if (s.includes("notice")) return "#bd2331";
    if (s.includes("vacant") || s.includes("vacency")) return "#ef6724";
    return "#e0e0e0";
  };

  // template renderers
  const TEMPLATES = useMemo(
    () => ({
      ana: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:220px;height:100px;border-radius:10px;background:${color};
            color:#fff;display:flex;flex-direction:column;align-items:center;
            justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.15);text-align:center;">
            ${
              d.data.photo
                ? `<img src="${d.data.photo}" style="width:40px;height:40px;border-radius:50%;
                    border:2px solid #fff;object-fit:cover;margin-bottom:5px;"/>`
                : `<div style="width:40px;height:40px;border-radius:50%;border:2px solid #fff;
                    display:flex;align-items:center;justify-content:center;font-size:12px;margin-bottom:5px;">👤</div>`
            }
            <div style="font-weight:700;font-size:13px;">${d.data.name || ""}</div>
            <div style="font-size:11px;opacity:0.9;">${d.data.title || ""}</div>
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
            <div style="font-size:13px;">${d.data.title || ""}</div>
          </div>`;
      },
      belinda: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:240px;border-radius:10px;background:${color};
            color:#fff;overflow:hidden;box-shadow:0 2px 5px rgba(0,0,0,.2);
            padding:12px;text-align:center;">
            <div style="font-weight:700;font-size:15px;">${d.data.name || ""}</div>
            <div style="font-size:13px;">${d.data.title || ""}</div>
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
            <div style="font-size:13px;">${d.data.title || ""}</div>
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
            <div style="font-size:13px;">${d.data.title || ""}</div>
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
              <div style="font-size:13px;">${d.data.title || ""}</div>
            </div>
          </div>`;
      },
      diva: (d) => {
        const color = getColor(d.data.status);
        return `
          <div style="width:230px;border-radius:10px;background:${color};color:#fff;
            text-align:center;padding:10px;box-shadow:0 2px 6px rgba(0,0,0,.15);">
            <div style="font-weight:700;font-size:15px;">${d.data.name || ""}</div>
            <div style="font-size:13px;">${d.data.title || ""}</div>
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
              <div style="font-size:13px;">${d.data.title || ""}</div>
            </div>
            <img src="${d.data.photo || ""}" style="width:54px;height:54px;border-radius:50%;
              border:2px solid #fff;margin-left:10px;object-fit:cover;"/>
          </div>`;
      },
    }),
    []
  );

  const LAYOUT_MAP = { top: "top", left: "left", right: "right", bottom: "bottom" };

  // render chart
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
      .nodeContent((d) => (TEMPLATES[template] ? TEMPLATES[template](d) : TEMPLATES.ana(d)))
      .onNodeClick((d) => {
        const emp = originalData.find((r) => String(r.ID) === String(d.data.id));
        if (emp && setSelectedEmployee) setSelectedEmployee(emp);
      })
      .expandAll() // 👈 ensures full expansion
      .render()
      .fit();

    chartRef.current = instance;
  }, [data, template, layout]);

  // utility actions
  const handleExportImage = async () => {
    const node = chartContainerRef.current;
    if (!node) return;
    await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true }).then((canvas) => {
      const link = document.createElement("a");
      link.download = "orgchart.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
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
    chartRef.current?.setHighlighted((node) =>
      String(node.data.name || "").toLowerCase().includes(q.toLowerCase())
    ).render();
  };

  return (
    <>
      <div className="orgchart-view">
        <header className="header">SUPRAJIT ENGINEERING LIMITED</header>

        {/* 🔹 Controls identical to Balkan style */}
        <Controls
          searchQuery={searchQuery}
          setSearchQuery={handleSearch}
          onRefresh={handleRefresh}
          onBack={onBackToUpload}
          onPrint={() => window.print()}
          onExportImage={handleExportImage}
          toggleFullScreen={() =>
            !document.fullscreenElement
              ? document.documentElement.requestFullscreen()
              : document.exitFullscreen()
          }
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

        {/* ℹ️ Instruction bar below header */}
        <div className="field-selectors">
          <button
            onClick={() => setShowInstructions(true)}
            className="instructions-popup"
            style={{ fontSize: 14, cursor: "pointer" }}
          >
            ⓘ Instructions
          </button>
          <label style={{ fontSize: 14 }}>
            Before printing, click the Refresh button to ensure the chart fits properly on your screen.
            Click on a person to open the popup then click '+' icon to upload Photo of a person.
          </label>
        </div>

        <div className="chart-container" ref={chartContainerRef}></div>
      </div>

      {/* 🟦 Status legend (Active / Vacant / Notice) */}
      <div className="theme">
        <p className="themep"><span style={{ color: "#1e4489" }}>●</span> Active</p>
        <p className="themep"><span style={{ color: "#ef6724" }}>●</span> Vacant</p>
        <p className="themep"><span style={{ color: "#bd2331" }}>●</span> Notice</p>
      </div>

      {showInstructions && <InstructionsPopup onClose={() => setShowInstructions(false)} />}
    </>
  );
}

export default OrgChartView_d3;
