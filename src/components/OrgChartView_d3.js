/* OrgChartView_d3.js */
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
  const [selectedExtras, setSelectedExtras] = useState([]); // up to 2 extras

  const normalizePhoto = (val) => {
    if (!val) return "";

    const s = String(val).trim();

    // Direct blob URL → keep it
    if (s.startsWith("blob:")) return s;

    // Base64
    if (s.startsWith("data:image")) return s;

    // valid http URL
    if (/^https?:\/\//i.test(s)) return s;

    // absolute path
    if (s.startsWith("/")) return s;

    // relative local file name
    return `/uploads/${s}`;
  };

  const getColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("active")) return "#1e4489"; // dark blue
    if (s.includes("notice")) return "#bd2331"; // red
    if (s.includes("vacant") || s.includes("vacency")) return "#ef6724"; // orange
    return "#1e4489";
  };

  // Per-template node sizes: these will be used to compute node width/height
  const TEMPLATE_CONFIG = {
    ana: { nodeWidth: 300, nodeHeight: 150 },
    olivia: { nodeWidth: 240, nodeHeight: 100 },
    belinda: { nodeWidth: 160, nodeHeight: 160 },
    rony: { nodeWidth: 160, nodeHeight: 190 },
    mery: { nodeWidth: 420, nodeHeight: 240 },
    polina: { nodeWidth: 300, nodeHeight: 100 },
    diva: { nodeWidth: 220, nodeHeight: 160 },
    isla: { nodeWidth: 220, nodeHeight: 140 },
  };

  const LAYOUTS = {
    mixed: { layout: "top", compact: false, childrenMargin: 110, siblingsMargin: 30 },
    normal: { layout: "top", compact: false, childrenMargin: 110, siblingsMargin: 30 },
    tree: { layout: "top", compact: false, childrenMargin: 110, siblingsMargin: 30 },
    treeLeft: { layout: "left", compact: false, childrenMargin: 110, siblingsMargin: 30 },
    treeRight: { layout: "right", compact: false, childrenMargin: 110, siblingsMargin: 30 },
    grid: { layout: "simple", compact: false, childrenMargin: 80, siblingsMargin: 30 },
    // you can add other mapping if your Controls uses different names
  };

  const hasPhoto = (d) => Boolean(d.data.photo && d.data.photo.trim() !== "");

  // Templates: generate HTML content for each node. Use d.data.raw to access arbitrary fields.
  const TEMPLATES = useMemo(() => {
    const photoPlaceholder = "";

    const baseRect = (w, h, bg, contentInner) => `
      <div class="balkan-node" style="width:${w}px;height:${h}px;background:${bg};border-radius:8px;position:relative;overflow:hidden;">
        ${contentInner}
      </div>`;

    return {
      ana: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" class="node-photo" alt="photo">`
          : photoPlaceholder;
        const extrasHtml = (d.data._extrasHtml || "");
        const name = d.data.name || "";
        return baseRect(
          conf.nodeWidth,
          conf.nodeHeight,
          color,
          `<div class="node-inner ana" style="display:flex;align-items:center;padding:8px 10px;gap:10px;">
              ${hasPhoto(d) ? `
                <div style="
                  width:72px;
                  height:72px;
                  flex:0 0 72px;
                  border-radius:50%;
                  overflow:hidden;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                ">
                  <img src="${d.data.photo}" class="node-photo" alt="photo">
                </div>
              ` : ""}

              <div style="flex:1;min-width:0;">
              <div class="node-title two-line-name" style="font-size:22px;">${name}</div>   
                <div class="node-extras">${extrasHtml}</div>
              </div>
            </div>`
        );
      },

      olivia: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" class="node-photo small" alt="photo">`
          : photoPlaceholder;
        const extrasHtml = (d.data._extrasHtml || "");
        const name = d.data.name || "";
        return baseRect(
          conf.nodeWidth,
          conf.nodeHeight,
          color,
          `<div class="node-inner olivia" style="display:flex;align-items:center;padding:8px;">
              <div style="flex:0 0 54px;height:54px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.12)">
                ${photo}
              </div>
              <div style="flex:1;margin-left:10px;">
              <div class="node-name two-line-name">${name}</div>
              <div class="node-extras">${extrasHtml}</div>
              </div>
            </div>`
        );
      },

      belinda: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" class="node-photo" alt="photo">`
          : `<div class="avatar-placeholder">👤</div>`;

        const name = d.data.name || "";
        const extrasHtml = (d.data._extrasHtml || "");

        return `
          <div class="balkan-node belinda-node" 
              style="
                width:${conf.nodeWidth}px;
                height:${conf.nodeHeight}px;       /* Perfect circle */
                background:${color};
                border-radius:50%;
                position:relative;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                padding:10px;
                overflow:hidden;
              ">

            <div style="
                width:${conf.nodeWidth * 0.5}px;
                height:${conf.nodeWidth * 0.5}px;
                border-radius:50%;
                overflow:hidden;
                display:flex;
                align-items:center;
                justify-content:center;
                margin-bottom:6px;
            ">
              ${photo}
            </div>

            <div class="two-line-name"
                style="
                  text-align:center;
                  font-size:14px;
                  font-weight:700;
                  line-height:1.2;
                  color:white;
                  margin-bottom:4px;
                ">
              ${name}
            </div>

            <div class="node-extras"
                style="text-align:center;font-size:11px;color:white;">
              ${extrasHtml}
            </div>
          </div>
        `;
    },

      rony: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" class="node-photo" alt="photo">`
          : `<div class="avatar-placeholder">👤</div>`;

        const name = d.data.name || "";
        const extrasHtml = d.data._extrasHtml || "";

        return `
          <div class="balkan-node rony-node"
            style="
              width:${conf.nodeWidth}px;
              height:${conf.nodeHeight}px;
              background:${color};
              border-radius:10px;
              padding:10px;
              display:flex;
              flex-direction:column;
              align-items:center;
              justify-content:flex-start;
              text-align:center;
              color:white;
            ">

            <div style="
              width:60px;
              height:60px;
              border-radius:50%;
              overflow:hidden;
              margin-bottom:8px;
              display:flex;
              align-items:center;
              justify-content:center;
            ">
              ${photo}
            </div>

            <div class="two-line-name"
              style="font-size:15px;font-weight:700;line-height:1.2;margin-bottom:4px;">
              ${name}
            </div>

            <div class="node-extras"
              style="font-size:12px;line-height:1.2;">
              ${extrasHtml}
            </div>
          </div>
        `;
      },

      mery: (d, conf) => {
        const color = getColor(d.data.status);

        const hasImg = d.data.photo && d.data.photo.trim() !== "";
        const photoHtml = hasImg
          ? `<img src="${d.data.photo}" class="node-photo" style="width:78px;height:78px;border-radius:50%;object-fit:cover;" />`
          : `<div style="
                width:78px;
                height:78px;
                border-radius:50%;
                background:white;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:32px;
                color:${color};
            ">👤</div>`;

        const name = d.data.name || "";
        const extrasHtml = d.data._extrasHtml || "";

        return `
          <div class="mery-node"
            style="
              width:${conf.nodeWidth}px;
              min-height:${conf.nodeHeight}px;
              background:${color};
              border-radius:35px;
              padding:10px 14px;
              display:flex;
              flex-direction:column;
              align-items:center;
              justify-content:flex-start;
              color:white;
              box-sizing:border-box;
              overflow:visible;
              text-align:center;
            ">

            <!-- NAME (white bubble) -->
            <div style="
                color:white;
                padding:10px 18px;
                min-height:42px;
                border-radius:22px;
                font-size:24px;
                font-weight:700;
                line-height:1.25;
                max-width:90%;
                margin-bottom:14px;
                display:-webkit-box;
                -webkit-line-clamp:2;
                -webkit-box-orient:vertical;
                overflow:hidden;
              ">
              ${name}
            </div>

            <!-- PHOTO -->
            <div style="
                width:84px;
                height:84px;
                border-radius:50%;
                overflow:hidden;
                display:flex;
                align-items:center;
                justify-content:center;
                margin-bottom:12px;
              ">
              ${photoHtml}
            </div>

            <!-- EXTRAS SECTION -->
            <div class="node-extras"
              style="
                font-size:14px;
                line-height:1.2;
                color:white;
                text-align:center;
                display:flex;
                flex-direction:column;
                gap:4px;
              ">
              ${extrasHtml}
            </div>

          </div>
        `;
      },

      polina: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" class="polina-avatar-img" />`
          : `<div class="avatar-placeholder">👤</div>`;

        const name = d.data.name || "";
        const extrasHtml = d.data._extrasHtml || "";

        return `
          <div class="balkan-node polina-node" style="width:${conf.nodeWidth}px;height:${conf.nodeHeight}px;background:${color};">
            <div class="polina-content">

              <div class="polina-avatar-wrapper">
                <div class="polina-avatar">${photo}</div>
              </div>

              <div class="polina-text">
                <div class="polina-name">${name}</div>
                <div class="polina-extras">${extrasHtml}</div>
              </div>

            </div>
          </div>
        `;
      },

      diva: (d, conf) => {
        const color = getColor(d.data.status);
        const name = d.data.name || "";
        const extrasHtml = d.data._extrasHtml || "";

        const photoHtml = d.data.photo && d.data.photo.trim() !== ""
          ? `<img src="${d.data.photo}" style="
              width:70px;
              height:70px;
              border-radius:50%;
              object-fit:cover;
              border:3px solid white;
            "/>`
          : `<div style="
              width:70px;
              height:70px;
              border-radius:50%;
              background:white;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:30px;
              color:${color};
              border:3px solid white;
            ">👤</div>`;

        return `
          <div class="diva-node" style="
            width:${conf.nodeWidth}px;
            background:${color};
            border-radius:16px;
            padding:10px 5px;
            color:white;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:flex-start;
            text-align:center;
            box-sizing:border-box;
          ">

            <!-- PHOTO -->
            <div style="margin-bottom:6px;">
              ${photoHtml}
            </div>

            <!-- NAME -->
            <div style="
              font-size:18px;
              font-weight:700;
              line-height:1.2;
              max-width:90%;
              margin-bottom:6px;
              display:-webkit-box;
              -webkit-line-clamp:2;
              -webkit-box-orient:vertical;
              overflow:hidden;
            ">
              ${name}
            </div>

            <!-- EXTRAS -->
            <div style="
              font-size:13px;
              line-height:1.1;
              display:flex;
              flex-direction:column;
              color:white;
              gap:2px;
            ">
              ${extrasHtml}
            </div>

          </div>
        `;
      },

      isla: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" class="node-photo small" alt="photo">`
          : `<div class="avatar-placeholder">👤</div>`;

        const name = d.data.name || "";
        const extrasHtml = d.data._extrasHtml || "";   // ← You were missing this

        return `
          <div class="balkan-node isla-node"
            style="
              width:${conf.nodeWidth}px;
              height:${conf.nodeHeight}px;
              background:${color};
              border-radius:10px;
              padding:8px;
              display:flex;
              align-items:center;
              justify-content:space-between;
              box-sizing:border-box;
              overflow:hidden;
            ">

            <div style="display:flex;flex-direction:column;flex:1;min-width:0;">
              <div class="two-line-name"
                style="
                  font-weight:700;
                  font-size:13px;
                  line-height:1.1;
                  margin-bottom:2px;
                ">
                ${name}
              </div>

              <!-- ⭐ now EXTRA FIELDS ARE VISIBLE -->
              <div class="node-extras"
                style="font-size:11px;line-height:1.1;display:flex;flex-direction:column;color:white;">
                ${extrasHtml}
              </div>
            </div>

            <div style="flex:0 0 54px;border-radius:50%;overflow:hidden;display:flex;">
              ${photo}
            </div>
          </div>
        `;
      }
    };
  }, []);

  // Utility: compute descendant count for a given d (d3-org-chart nodes passed in .nodeContent have children property)
  const getDescendantCount = (node) => {
    if (!node) return 0;
    const rec = (n) => {
      if (!n.children || n.children.length === 0) return 0;
      let c = n.children.length;
      for (const ch of n.children) c += rec(ch);
      return c;
    };
    return rec(node);
  };

  // Prepare chart data from rows
  const makeChartData = useCallback(
    (rows) =>
      rows.map((r) => {
        const node = {
          id: r.ID,
          parentId: r["Parent ID"] || null,
          name: r.First_Name || r.name || "",
          photo: normalizePhoto(r.Photo || r.Image || ""),
          status: r.Status || r.status || "",
          raw: r,
        };
        // assemble extras html for this row (up to 2 selected extras)
        const extras = (selectedExtras || []).slice(0, 2).map((k) => r[k] || "").filter(Boolean);
        node._extrasHtml = extras.map((ex) => `<div class="extra-field" style="font-size:16px;opacity:0.95;margin-top:3px">${ex}</div>`).join("");
        return node;
      }),
    [selectedExtras]
  );

  // Create / re-create chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    if (!data || !Array.isArray(data) || data.length === 0) {
      // clear existing chart if any
      if (chartRef.current && chartRef.current.destroy) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    const chartData = makeChartData(data);

    // create or reuse chart
    const chart = chartRef.current || new OrgChart();
    chart.container(container);

    const tConf = TEMPLATE_CONFIG[template] || TEMPLATE_CONFIG.ana;
    const layoutConf = LAYOUTS[layout] || LAYOUTS.mixed;

    // Correct placement of special template spacing logic
    const isBelinda = template === "belinda";
    const isMery = template === "mery";

    chart
      .data(chartData)
      .nodeWidth(() => tConf.nodeWidth)
      .nodeHeight(() => tConf.nodeHeight)
      .childrenMargin(() =>
        isMery ? 130 :
        isBelinda ? 80 :
        layoutConf.childrenMargin
      )
      .siblingsMargin(() =>
        isMery ? 60 :
        isBelinda ? 40 :
        layoutConf.siblingsMargin
      )
      .compact(layoutConf.compact)
      .layout(layoutConf.layout)
      .linkUpdate(function () {
        d3.select(this).attr("stroke", "#1e4489").attr("stroke-width", 5).attr("fill", "none");
      })
      .nodeContent((d) => {
        // d is a node object provided by d3-org-chart; d.data is our node data
        // Add extras html already prepared above
        const base = (TEMPLATES[template] || TEMPLATES.ana)(d, tConf);
        const childrenCount = (d.children && d.children.length) || 0;
        const descendantCount = getDescendantCount(d);

       // Unified toggle: minus when expanded, number when collapsed
      const isExpanded = d.children && d.children.length > 0;

      const collapseIcon =
        d.children || d._children
          ? `<div class="balkan-toggle" data-nodeid="${d.id}" data-count="${descendantCount}">
              <span>${isExpanded ? "-" : descendantCount}</span>
            </div>`
          : "";
        // add status badge container (will be colored by CSS inline style later)
        const badge = `<div class="status-badge" aria-hidden="true"></div>`;

        // Combine: append icon & badge inside wrapper node
        // We put icon & badge outside the base content so CSS absolute works
        const result = `<div class="balkan-node-wrapper" style="position:relative;display:inline-block;">
                          ${base}
                          ${collapseIcon}
                          ${badge}
                        </div>`;
        return result;
      })
      // OPEN POPUP when node body clicked
      // COLLAPSE / EXPAND only when clicking the orange "+"
      .onNodeClick((d, event) => {
        const inst = chartRef.current;
        if (!inst) return;

        const target = event?.srcElement || event?.target;

        // If user clicked the PLUS button → collapse/expand only
        if (target && target.closest(".balkan-toggle")) {
          if (d.children && d.children.length) inst.collapse(d.id);
          else inst.expand(d.id);
          return; // stop here, do NOT open popup
        }

        // Otherwise → open popup (same as Balkan)
        const emp = originalData.find(
          (e) => String(e.ID) === String(d.data.id)
        );

        if (emp) setSelectedEmployee(emp);
      });

    chart.expandAll().render();
    chart.fit();
    chartRef.current = chart;

    // remove any leftover count bubbles after render/redraw
    const removeCountBubbles = () => {
      try {
        const c = chartContainerRef.current;
        if (!c) return;
        const selectors = [
          'g.count', 'g.boc-count', '.count', '.boc-count',
          'g[class*="count"]'
        ];
        c.querySelectorAll(selectors.join(',')).forEach(el => el.remove());
      } catch (e) { /* ignore */ }
    };

    // call once now and on redraw/render
    removeCountBubbles();
    chart.on?.('render', () => {
      setTimeout(removeCountBubbles, 10);
    });
    chart.on?.('redraw', () => {
      setTimeout(removeCountBubbles, 10);
    });

    // after render, color status badges and set thumbnail sizing
    const recolorAndBadges = () => {
      try {
        const allNodes = container.querySelectorAll(".balkan-node-wrapper");

        allNodes.forEach((wrapper) => {
          // status badge color
          const inner = wrapper.querySelector(".balkan-node");
          const badge = wrapper.querySelector(".status-badge");
          if (inner && badge) {
            const bg = window.getComputedStyle(inner).backgroundColor;
            badge.style.background = bg;
          }

          // avatar fit
          wrapper.querySelectorAll("img.node-photo").forEach((img) => {
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
          });

          // handle collapse button state
          const btn = wrapper.querySelector(".balkan-toggle");
          if (!btn) return;

          const id = btn.getAttribute("data-nodeid");
          const chartInst = chartRef.current;

          // detect if expanded
          const meta = chartInst.getNode ? chartInst.getNode(id) : null;
          const expanded = meta && meta.children && meta.children.length > 0;

          // update UI
          const innerEl = btn.querySelector("span");
          if (expanded) {
            btn.classList.add("expanded");
            btn.classList.remove("collapsed");
            if (innerEl) innerEl.textContent = "-";
          } else {
            btn.classList.remove("expanded");
            btn.classList.add("collapsed");

            const descendantCount =
              (meta && meta.descendantsCount) ||
              getDescendantCount(meta) ||
              0;

            if (innerEl) innerEl.textContent = descendantCount;
          }

          // attach click once
          if (!btn._wired) {
            btn._wired = true;
            btn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const meta = chartInst.getNode(id);
              const expanded = meta && meta.children && meta.children.length > 0;

              if (expanded) chartInst.collapse(id);
              else chartInst.expand(id);

              setTimeout(() => {
                recolorAndBadges();
                chartInst.fit();
              }, 60);
            });
          }
        });
      } catch (e) {}
    };

    // Run recolor after a short delay so DOM exists
    setTimeout(recolorAndBadges, 60);
    // Also recolor after any render/redraw events from chart
    const onRedraw = () => {
      setTimeout(recolorAndBadges, 40);
      setTimeout(removeCountBubbles, 40); // <--- add this
    };
    chart.on?.("render", onRedraw);
    chart.on?.("redraw", onRedraw);

    // cleanup function
    return () => {
      try {
        chart.off?.("render", onRedraw);
        chart.off?.("redraw", onRedraw);
      } catch {}
      if (chart.destroy) chart.destroy();
      chartRef.current = null;
    };
  }, [data, template, layout, TEMPLATES, selectedExtras, makeChartData]);

  // Export image
  const handleExportImage = async () => {
    const node = chartContainerRef.current;
    if (!node) return;
    // ensure all images are loaded
    const imgs = node.querySelectorAll("img");
    await Promise.all(Array.from(imgs).map(img => img.decode?.().catch(() => {})));
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#fff", useCORS: true });
    const link = document.createElement("a");
    link.download = "orgchart.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleLayoutChange = (l) => {
    setLayout(l);
    // instruct chart to update if present
    if (chartRef.current) {
      const layoutConf = LAYOUTS[l] || LAYOUTS.mixed;
      chartRef.current.layout(layoutConf.layout).render();
      chartRef.current.fit();
    }
  };

  const handleRefresh = () => {
    setSearchQuery("");

    if (!originalData || !Array.isArray(originalData)) return;

    const fullData = makeChartData(originalData);

    if (chartRef.current) {
      chartRef.current
        .data(fullData)     // ← restore full data
        .expandAll()
        .render();

      setTimeout(() => chartRef.current.fit(), 60);
    }
  };

  // toggle extras (limit 2)
  const toggleExtra = (field) => {
    setSelectedExtras((prev) => {
      if (prev.includes(field)) return prev.filter((f) => f !== field);
      if (prev.length >= 2) return prev; // silently ignore beyond 2
      return [...prev, field];
    });
  };

  // search handler (basic: find first name and load subtree)
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (!query) {
      if (chartRef.current) {
        chartRef.current
          .data(makeChartData(data))
          .expandAll()
          .render();
        setTimeout(() => chartRef.current.fit(), 50);
      }
      return;
    }

    const q = query.toLowerCase();

    // 1. find node
    const match = data.find(r =>
      String(r.First_Name || r.name || "").toLowerCase().includes(q)
    );
    if (!match) return;

    // 2. Build tree map for fast lookup
    const childrenMap = {};
    data.forEach(row => {
      const pid = String(row["Parent ID"] || "");
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push(row);
    });

    // 3. BFS to get all descendants
    const queue = [match];
    const subtree = [];

    while (queue.length) {
      const node = queue.shift();
      subtree.push(node);
      const kids = childrenMap[String(node.ID)] || [];
      kids.forEach(k => queue.push(k));
    }

    // 4. Make root top-level
    const rebuilt = subtree.map(x => ({ ...x }));
    const root = rebuilt.find(x => x.ID === match.ID);
    if (root) root["Parent ID"] = null;

    // 5. Load into chart
    const chartData = makeChartData(rebuilt);

    chartRef.current
      .data(chartData)
      .expandAll()
      .render();

    setTimeout(() => chartRef.current.fit(), 60);
  };

  const toggleFullScreen = () => {
    const elem = document.getElementById("orgChart");
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <>
      <div className="print-header" style={{ display: "none" }}>
        <img src="/onlylogo.png" alt="Logo" />
        <h1>Suprajit</h1>
        <span className="print-department">{department ? `Department: ${department}` : ""}</span>
      </div>

      <div className="orgchart-view">
        <header className="header">SUPRAJIT ENGINEERING LIMITED</header>

        {/* Controls bar */}
        <Controls
          searchQuery={searchQuery}
          setSearchQuery={handleSearch}
          onRefresh={handleRefresh}
          onBack={onBackToUpload}
          onPrint={() => window.print()}
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
          onSelectTemplate={(t) => setTemplate(t)}
          selectedTemplate={template}
        />

        {/* second row: instructions + extras */}
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