import React, { useEffect, useRef, useState, useCallback } from "react";
import { OrgChart } from "d3-org-chart";
import * as d3 from "d3";
import html2canvas from "html2canvas";
import Controls from "./Controls";
import InstructionsPopup from "./InstructionsPopup";
import "./OrgChartView.css";

export default function OrgChartView({
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
  const [chart, setChart] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [layout, setLayout] = useState("vertical");
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("ana");

  // Define your custom templates
  const templates = [
    { key: "ana", label: "Ana" },
    { key: "olivia", label: "Olivia" },
    { key: "belinda", label: "Belinda" },
    { key: "rony", label: "Rony" },
    { key: "mery", label: "Mery" },
    { key: "polina", label: "Polina" },
    { key: "diva", label: "Diva" },
    { key: "isla", label: "Isla" },
  ];

  // Map Excel row to node
  const mapRowToNode = useCallback(
    (row) => {
      const nameKey = selectedFields.nameField || "First_Name";
      const extras = Array.isArray(selectedFields.extras)
        ? selectedFields.extras.slice(0, 2)
        : [];
      const extraParts = extras.map((k) => row[k] || "").filter(Boolean);

      return {
        id: row.ID,
        parentId: row["Parent ID"] || null,
        name: row[nameKey] || "",
        title: extraParts.join(" - "),
        img: row.Photo,
        status: row.Status || row.status || "",
      };
    },
    [selectedFields]
  );

  // Helper to color nodes by status
  const getColorForStatus = (status) => {
    if (!status) return "#ccc";
    const s = status.toLowerCase();
    if (s.includes("active")) return "#1e4489";
    if (s.includes("notice")) return "#bd2331";
    if (s.includes("vacant") || s.includes("vacency")) return "#ef6724";
    return "#ccc";
  };

  // Build chart
  useEffect(() => {
    if (!data?.length || !chartContainerRef.current) return;
    const nodes = data.map(mapRowToNode);

    const newChart = new OrgChart()
      .container(chartContainerRef.current)
      .data(nodes)
      .nodeWidth(() => 220)
      .nodeHeight(() => 120)
      .childrenMargin(() => 40)
      .compact(false)
      .nodeContent((d) => {
        const color = getColorForStatus(d.data.status);
        return `
          <div style="
            border: 2px solid ${color};
            border-radius: 8px;
            padding: 8px;
            width: 200px;
            height: 100px;
            background: #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          ">
            ${
              d.data.img
                ? `<img src="${d.data.img}" alt="photo" style="width:40px;height:40px;border-radius:50%;border:2px solid ${color};" />`
                : `<div style="width:40px;height:40px;border-radius:50%;background:${color};"></div>`
            }
            <div style="font-weight:bold;color:${color};margin-top:5px;">${d.data.name}</div>
            <div style="font-size:12px;color:#555;">${d.data.title}</div>
          </div>
        `;
      })
      .onNodeClick((d) => {
        const emp = data.find((r) => String(r.ID) === String(d.data.id));
        if (emp) setSelectedEmployee(emp);
      })
      .render();

    setChart(newChart);
  }, [data, selectedFields, selectedTemplate]);

  // Search handler
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!chart) return;
    chart.clearHighlighting();

    if (query.trim() === "") {
      chart.fit();
      return;
    }

    chart.data().forEach((d) => {
      if (d.name?.toLowerCase().includes(query.toLowerCase())) {
        chart.setHighlighted(d.id);
      }
    });
  };

  // Export
  const handleExportImage = async () => {
    if (!chartContainerRef.current) return;
    const canvas = await html2canvas(chartContainerRef.current, {
      backgroundColor: "#fff",
      scale: 2,
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "orgchart.png";
    link.click();
  };

  const handleRefresh = () => {
    if (chart && data) {
      chart.data(data.map(mapRowToNode)).render();
    }
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    if (chart) chart.layout(newLayout).render();
  };

  return (
    <>
      <div className="orgchart-view">
        <header className="header">SUPRAJIT ENGINEERING LIMITED</header>

        <Controls
          searchQuery={searchQuery}
          setSearchQuery={handleSearch}
          onRefresh={handleRefresh}
          onBack={onBackToUpload}
          onExportImage={handleExportImage}
          onLayoutChange={handleLayoutChange}
          templates={templates}
          onSelectTemplate={setSelectedTemplate}
          selectedTemplate={selectedTemplate}
        />

        <div
          ref={chartContainerRef}
          id="orgChart"
          style={{ width: "100%", height: "80vh" }}
        ></div>
      </div>

      {showInstructions && (
        <InstructionsPopup onClose={() => setShowInstructions(false)} />
      )}
    </>
  );
}
