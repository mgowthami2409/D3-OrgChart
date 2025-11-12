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
  setSelectedEmployee,
  onBackToUpload,
  headers = [],
  department = "",
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const exportRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [layout, setLayout] = useState("mixed");
  const [template, setTemplate] = useState("ana");
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);

  const localDepartment = department;

  // ==================== HELPERS ====================
  const normalizePhoto = (val) => {
    if (!val) return "";
    const s = String(val).trim();
    if (s.startsWith("data:image")) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("/")) return s;
    return `/uploads/${s}`;
  };

  const getColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("active")) return "#1e4489";
    if (s.includes("notice")) return "#bd2331";
    if (s.includes("vacant")) return "#ef6724";
    return "#1e4489";
  };

  const TEMPLATE_CONFIG = {
    ana: { nodeWidth: 480, nodeHeight: 150 },
    olivia: { nodeWidth: 260, nodeHeight: 120 },
    belinda: { nodeWidth: 240, nodeHeight: 110 },
    rony: { nodeWidth: 240, nodeHeight: 110 },
    mery: { nodeWidth: 230, nodeHeight: 100 },
    polina: { nodeWidth: 250, nodeHeight: 110 },
    diva: { nodeWidth: 230, nodeHeight: 100 },
    isla: { nodeWidth: 250, nodeHeight: 110 },
  };

  const LAYOUTS = {
    mixed: { layout: "top", compact: false, childrenMargin: 120, siblingsMargin: 60 },
    top: { layout: "top", compact: false, childrenMargin: 120, siblingsMargin: 60 },
    left: { layout: "left", compact: false, childrenMargin: 120, siblingsMargin: 60 },
    right: { layout: "right", compact: false, childrenMargin: 120, siblingsMargin: 60 },
    bottom: { layout: "bottom", compact: false, childrenMargin: 120, siblingsMargin: 60 },
  };

  // ==================== NODE TEMPLATES ====================
  const TEMPLATES = useMemo(() => {
    const photoPlaceholder = `<div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.25);
      display:flex;align-items:center;justify-content:center;font-size:28px;">👤</div>`;

    const baseNode = (d, conf, color, content) => `
      <div style="width:${conf.nodeWidth}px;height:${conf.nodeHeight}px;
        background:${color};border-radius:10px;color:#fff;position:relative;
        box-shadow:0 2px 6px rgba(0,0,0,.15);font-family:Arial,sans-serif;">
        ${content}
      </div>`;

    return {
      ana: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" style="width:70px;height:70px;border-radius:50%;border:3px solid #fff;object-fit:cover;" />`
          : photoPlaceholder;
        return baseNode(
          d,
          conf,
          color,
          `<div style="display:flex;align-items:center;gap:12px;padding:10px;">
              ${photo}
              <div style="flex:1;overflow:hidden;">
                <div style="font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;">${d.data.title || ""}</div>
                <div class="extras"></div>
              </div>
            </div>
            <div style="text-align:center;font-size:18px;font-weight:700;">${d.data.name || ""}</div>`
        );
      },
      olivia: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" style="width:60px;height:60px;border-radius:50%;border:2px solid #fff;object-fit:cover;margin-right:10px;" />`
          : photoPlaceholder;
        return baseNode(
          d,
          conf,
          color,
          `<div style="display:flex;align-items:center;padding:10px;">
            ${photo}
            <div style="flex:1;overflow:hidden;">
              <div style="font-size:15px;font-weight:700;">${d.data.name || ""}</div>
              <div style="font-size:13px;">${d.data.title || ""}</div>
              <div class="extras"></div>
            </div>
          </div>`
        );
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
    };
  }, []);

  // ==================== CHART RENDER ====================
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !data?.length) return;

    const chartData = data.map((r) => ({
      id: r.ID,
      parentId: r["Parent ID"] || null,
      name: r.First_Name || r.name || "",
      title: r.Designation || r.title || "",
      photo: normalizePhoto(r.Photo || r.Image || ""),
      status: r.Status || "",
      raw: r,
    }));

    const tConf = TEMPLATE_CONFIG[template];
    const layoutConf = LAYOUTS[layout];
    const chart = chartRef.current || new OrgChart().container(container);

    chart
      .data(chartData)
      .nodeWidth(() => tConf.nodeWidth)
      .nodeHeight(() => tConf.nodeHeight)
      .childrenMargin(() => layoutConf.childrenMargin)
      .siblingsMargin(() => layoutConf.siblingsMargin)
      .compact(layoutConf.compact)
      .layout(layoutConf.layout)
      .linkUpdate(function () {
        d3.select(this).attr("stroke", "#1e4489").attr("stroke-width", 3).attr("fill", "none");
      })
      .nodeContent((d) => {
        const extras = (selectedExtras || [])
          .map((f) => d.data.raw?.[f])
          .filter(Boolean)
          .slice(0, 2)
          .map((val) => `<div style="font-size:12px;opacity:0.9;">${val}</div>`)
          .join("");
        const base = TEMPLATES[template](d, tConf);
        const childrenCount = d.children?.length || 0;

        const icon = childrenCount
          ? `<div class="collapse-icon" style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);cursor:pointer;">
               <div style="width:20px;height:20px;background:orange;border-radius:50%;
               display:flex;align-items:center;justify-content:center;color:#000;font-weight:bold;">+</div>
             </div>`
          : "";

        return base.replace('<div class="extras"></div>', extras) + icon;
      })
      .onNodeClick((d) => {
        const chartInstance = chartRef.current;
        if (!chartInstance) return;
        if (d.children?.length) chartInstance.collapse(d.id);
        else chartInstance.expand(d.id);
      });

    chart.expandAll().render().fit(0.85);
    chartRef.current = chart;

    return () => chart.destroy?.();
  }, [data, template, layout, selectedExtras, TEMPLATES]);

  // ==================== HANDLERS ====================
  const handleExportImage = async () => {
    const node = chartContainerRef.current;
    if (!node) return;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#fff", useCORS: true });
    const link = document.createElement("a");
    link.download = "orgchart.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleLayoutChange = (l) => {
    setLayout(l);
    chartRef.current?.layout(LAYOUTS[l].layout).render().fit(0.85);
  };

  const handleRefresh = () => {
    chartRef.current?.expandAll().render().fit(0.85);
    setSearchQuery("");
  };

  const toggleExtra = (field) => {
    setSelectedExtras((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : prev.length >= 2
        ? prev
        : [...prev, field]
    );
  };

  // ==================== JSX ====================
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

        {/* Top control bar */}
          <Controls
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
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
        <div className="orgchart-container">
        {/* Second row with instructions and field selectors */}
        <div className="field-selectors" style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '5px 5px' }}>
          <span className= "instructions-popup" style={{ textAlign: "center" }}>
              <button
                onClick={() => setShowInstructions(true)}
                title="View Instructions"
                style={{ fontSize: 14, cursor: "pointer" }}
              >
                ⓘ Instructions
              </button>
            </span>
            <label style={{ marginRight: 4, fontSize: 14 }}>Before printing, click the Refresh button to ensure the chart fits properly on your screen.</label>
            <span style={{ color: 'black', marginRight: 8, fontSize: 14 }}>Click on a person to open the popup then click '+' icon to upload Photo of a person
            </span>

            <label style={{ marginRight: 4, marginLeft: 4, fontSize: 12 }}>Select up to 2 additional fields to show:</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 100, width: 180, overflow: 'auto', fontSize: 14, padding: 2, border: '1px solid #ddd', borderRadius: 4, textAlign: "left"}}>
            {(headers || [])
              .filter((h) => {
                const key = String(h).toLowerCase();
                // return key !== 'photo' && key !== 'image' && key !== 'first_name').toLowerCase(); 
                return !["photo", "image", "first_name", "name"].includes(key);
              })
              .map((h) => (
                <label key={h} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedExtras.includes(h)}
                    onChange={() => toggleExtra(h)}
                  />
                  <span>{h}</span>
                </label>
              ))}
              <span style={{ color: '#666' }}></span>
          </div>
        </div>

        {/* Chart */}
        <div className="print-label" ref={exportRef}>
          <div className={`chart-container template-${template}`} id="orgChart" ref={chartContainerRef} />
        </div>
      </div>
      </div>
        {/* Legend */}
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

        {showInstructions && <InstructionsPopup onClose={() => setShowInstructions(false)} />}
    </>
  );
}

export default OrgChartView_d3;
