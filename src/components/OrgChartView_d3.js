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
    rony: { nodeWidth: 160, nodeHeight: 200 },
    mery: { nodeWidth: 420, nodeHeight: 150 },
    polina: { nodeWidth: 300, nodeHeight: 100 },
    diva: { nodeWidth: 220, nodeHeight: 160 },
    isla: { nodeWidth: 220, nodeHeight: 140 },
  };

  // Logical layout presets that mimic Balkan’s 8 layouts.
  // Root is always at the top. We only change how children are spaced and offset.
  const LAYOUTS = {
    normal: {
      key: "normal",
      compact: false,
    },
    mixed: {
      key: "mixed",
      compact: true, // a bit tighter and more "alternating"
    },
    tree: {
      key: "tree",
      compact: true, // tall, deep tree
    },
    treeLeft: {
      key: "treeLeft",
      compact: true,
    },
    treeLeftOffset: {
      key: "treeLeftOffset",
      compact: true,
    },
    treeRight: {
      key: "treeRight",
      compact: true,
    },
    treeRightOffset: {
      key: "treeRightOffset",
      compact: true,
    },
    grid: {
      key: "grid",
      compact: false,
    },
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
        const extrasHtml = d.data._extrasHtml || "";
        const name = d.data.name || "";
        const hasImg = hasPhoto(d);

        // ✅ WHEN THERE IS NO PHOTO → compact, text-only card (like required screenshot)
        if (!hasImg) {
          return `
            <div class="balkan-node ana-node"
              style="
                width:${conf.nodeWidth}px;
                height:${conf.nodeHeight}px;
                background:${color};
                border-radius:8px;
                position:relative;
                overflow:hidden;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:flex-start;
                padding:10px 16px;
                box-sizing:border-box;
              ">

              <!-- extras on top -->
              <div class="node-extras">
                ${extrasHtml}
              </div>

              <!-- name below, centered -->
              <div class="node-title">
                ${name}
              </div>
            </div>
          `;
        }

        // ✅ WHEN THERE *IS* A PHOTO → keep the existing “photo on the left, text on the right” layout
        return `
          <div class="balkan-node ana-node"
            style="
              width:${conf.nodeWidth}px;
              height:${conf.nodeHeight}px;
              background:${color};
              border-radius:8px;
              position:relative;
              overflow:hidden;
            ">
            <div class="node-inner ana"
              style="display:flex;align-items:center;padding:8px 10px;gap:10px;">

              <div style="
                width:80px;
                height:80px;
                flex:0 0 72px;
                border-radius:60%;
                overflow:hidden;
                display:flex;
                align-items:center;
                justify-content:center;
              ">
                <img src="${d.data.photo}" class="node-photo" alt="photo">
              </div>

              <div style="flex:1;min-width:0;">
                <div class="node-extras"
                  style="font-size:11px;line-height:1.1;margin-bottom:4px;text-align:left;">
                  ${extrasHtml}
                </div>
                <div class="node-title two-line-name"
                  style="font-size:16px;font-weight:700;color:#ffffff;text-align:left;">
                  ${name}
                </div>
              </div>
            </div>
          </div>
        `;
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
              <div class="node-name two-line-name-olivia" style="color:white;">${name}</div>
              <div class="node-extras">
                ${extrasHtml.replace(/<\/div>\s*<div/gi, " - </div><div")}
              </div>
              </div>
            </div>`
        );
      },

      belinda: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" class="node-photo" alt="photo">`
          : `<div class="avatar-placeholder"></div>`;

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

            <div class="two-line-name-belinda">
              ${name}
            </div>

            <div class="node-extras belinda-extras">
              ${extrasHtml.replace(/<\/div>\s*<div/gi, " – </div><div")}
            </div>
          </div>
        `;
      },

      rony: (d, conf) => {
        const color = getColor(d.data.status);
        const photo = d.data.photo
          ? `<img src="${d.data.photo}" class="node-photo" alt="photo">`
          : `<div class="avatar-placeholder"></div>`;

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

            <!-- NAME (first, bold, single-line or 2-line clamp) -->
            <div class="rony-name">
              ${name}
            </div>

            <!-- EXTRAS (one single line only, with dash) -->
            <div class="rony-extras">
              ${extrasHtml.replace(/<\/div>\s*<div/gi, " - </div><div")}
            </div>

            <!-- PHOTO (bigger & centered) -->
            <div style="
              width:80px;
              height:80px;
              border-radius:50%;
              overflow:hidden;
              display:flex;
              align-items:center;
              justify-content:center;
            ">
              ${photo}
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
            <div class="mery-name">
              ${name}
            </div>

            <!-- PHOTO -->
            <div>
              ${photoHtml}
            </div>

            <!-- EXTRAS SECTION -->
            <div class="node-extras">
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
                <div class="polina-name" style="color:white;">${name}</div>
                <div class="polina-extras" style="color:white;display:flex;flex-direction:column;">${extrasHtml}</div>
              </div>
            </div>
          </div>
        `;
      },

      diva: (d, conf) => {
        const color = getColor(d.data.status);
        const name = d.data.name || "";
        const extrasHtml = d.data._extrasHtml || "";

        const CIRCLE = 70;
        const BORDER = "#3fabe0";

        const photoHtml =
          d.data.photo?.trim()
            ? `<img src="${d.data.photo}" style="
                  width:${CIRCLE}px;
                  height:${CIRCLE}px;
                  border-radius:50%;
                  object-fit:cover;
                  border:4px solid ${BORDER};
              ">`
            : `<div style="
                  width:${CIRCLE}px;
                  height:${CIRCLE}px;
                  border-radius:50%;
                  background:white;
                  border:4px solid ${BORDER};
              "></div>`;

        return `
          <div class="diva-wrapper" style="
            width:${conf.nodeWidth}px;
            display:flex;
            flex-direction:column;
            align-items:center;
          ">

            <!-- Circle ABOVE rectangle, NOT overlapping -->
            <div style="margin-bottom:10px;">
              ${photoHtml}
            </div>

            <!-- Rectangle (Balkan size) -->
            <div class="diva-box" style="
              background:${color};
              border-radius:12px;
              width:100%;
              height:80px;
              padding:10px 6px;
              text-align:center;
              color:white;
              box-sizing:border-box;
            ">
              <div style="
                font-size:14px;
                font-weight:600;
                line-height:1.2;
                overflow:hidden;
                white-space:nowrap;
                text-overflow:ellipsis;
              ">
                ${name}
              </div>

              <div style="font-size:11px;margin-top:3px;line-height:1.1;">
                ${extrasHtml}
              </div>
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
                  color:white;
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
        // If two extras exist → combine them on ONE LINE with a hyphen
        let combined = "";
        if (extras.length === 1) {
          combined = extras[0];
        } else if (extras.length === 2) {
          combined = `${extras[0]} - ${extras[1]}`;
        }

        node._extrasHtml = `
          <div class="extra-field"
              style="
                color:white;opacity:0.95;margin-top:3px;
                text-align:center;
                display:inline-block;
                white-space:normal;
              ">
            ${combined}
          </div>`;
        return node;
      }),
    [selectedExtras]
  );

  const safeFit = (chart) => {
    try {
      if (!chart || !chart.root) return;
      chart.fit();     // ✅ correct call
    } catch (e) {
      console.warn("fit skipped:", e);
    }
  };

  const recolorAndBadges = () => {
    try {
      const container = chartContainerRef.current;
      if (!container) return;

      const allNodes = container.querySelectorAll(".balkan-node-wrapper");
      const chartInst = chartRef.current;
      if (!chartInst) return;

      allNodes.forEach((wrapper) => {

      //-----------------------------------------------
      // 1) REAL DOM CLICK DETECTOR (perfect version)
      //-----------------------------------------------
      if (!wrapper._realClickWired) {
        wrapper._realClickWired = true;

        wrapper.addEventListener(
          "click",
          (ev) => {
            const isToggle = ev.target.closest(".balkan-toggle");

            if (isToggle) {
              // mark that toggle was clicked
              window.__realToggleClick = true;

              // FULLY stop event here: popup will never see it
              ev.preventDefault();
              ev.stopPropagation();
              ev.stopImmediatePropagation();
            }
          },
          true // capture phase → MUST be true
        );
      }

        // Coloring badges
        const inner = wrapper.querySelector(".balkan-node");
        const badge = wrapper.querySelector(".status-badge");
        if (inner && badge) {
          const bg = window.getComputedStyle(inner).backgroundColor;
          badge.style.background = bg;
        }

        // Fix images
        // wrapper.querySelectorAll("img.node-photo").forEach((img) => {
        //   img.style.width = "100%";
        //   img.style.height = "100%";
        //   img.style.objectFit = "cover";
        // });

        // Toggle button
        const btn = wrapper.querySelector(".balkan-toggle");
        if (!btn) return;

        const rawId = btn.getAttribute("data-nodeid");
        if (!rawId) return;

        const key = String(rawId);
        const node = chartInst._nodesMap?.get(key);
        const span = btn.querySelector("span");

        let isExpanded = false;
        if (node) {
          if (Array.isArray(node.children) && node.children.length > 0) {
            isExpanded = true;
          } else if (Array.isArray(node._children) && node._children.length > 0) {
            isExpanded = false;
          }
        }

        if (span) {
          span.textContent = isExpanded ? "-" : "+";
        }

        if (!btn._wired) {
          btn._wired = true;

          btn.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();

            window.__clickedToggle = key;

            const nd = chartInst._nodesMap?.get(key);
            let expanded = false;
            if (nd) {
              expanded = Array.isArray(nd.children) && nd.children.length > 0;
            }

            // 🔥 FIX: d3-org-chart v3+ requires NODE OBJECT, not ID
            if (expanded) chartInst.collapse(nd);
            else chartInst.expand(nd);

            chartInst.render();

            setTimeout(() => {
              recolorAndBadges();
              safeFit(chartInst);
            }, 60);
          });
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handler = (ev) => {
      // Detect click on our custom toggle
      if (ev.target.closest(".balkan-toggle")) {
        window.__realToggleClick = true;

        // Stop event BEFORE d3-org-chart receives it
        ev.stopImmediatePropagation();
        ev.stopPropagation();
        ev.preventDefault();
      }
    };

    // MUST use capture phase → true
    document.addEventListener("click", handler, true);

    return () => {
      document.removeEventListener("click", handler, true);
    };
  }, []);

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

    // Depth-aware spacing to mimic Balkan layouts

    // Custom leaf arrangement logic for Balkan layouts
    const getChildrenMargin = (node) => {
      const depth = node.depth || 0;
      const isLeaf = !node.children || node.children.length === 0;
      switch (layout) {
        case "mixed":
          // Alternate leaf arrangement: even-indexed leaves wider
          if (isLeaf) return node.index % 2 === 0 ? 120 : 80;
          if (depth === 0) return 160;
          if (depth === 1) return 130;
          return 90;
        case "tree":
          return 110;
        case "treeLeft":
          // All leaves to left: more margin for leftmost
          if (isLeaf) return node.index === 0 ? 140 : 100;
          return depth === 0 ? 150 : 120;
        case "treeLeftOffset":
          // Offset leaves to left
          if (isLeaf) return 110 + node.index * 30;
          return depth === 0 ? 170 : 130;
        case "treeRight":
          // All leaves to right: more margin for rightmost
          if (isLeaf) return node.index === node.parent.children.length - 1 ? 140 : 100;
          return depth === 0 ? 150 : 120;
        case "treeRightOffset":
          // Offset leaves to right
          if (isLeaf) return 110 + (node.parent.children.length - node.index - 1) * 30;
          return depth === 0 ? 170 : 130;
        case "grid":
          // Arrange leaves in grid: uniform margin
          if (isLeaf) return 80;
          return 70;
        case "normal":
        default:
          return 150;
      }
    };

    const getSiblingsMargin = (node) => {
      const depth = node.depth || 0;
      const isLeaf = !node.children || node.children.length === 0;
      switch (layout) {
        case "mixed":
          return isLeaf ? 60 : (depth === 0 ? 70 : 40);
        case "tree":
          return isLeaf ? 18 : 20;
        case "treeLeft":
          return isLeaf ? 35 : 40;
        case "treeLeftOffset":
          return isLeaf ? 30 : 35;
        case "treeRight":
          return isLeaf ? 35 : 40;
        case "treeRightOffset":
          return isLeaf ? 30 : 35;
        case "grid":
          return isLeaf ? 90 : 80;
        case "normal":
        default:
          return 50;
      }
    };

    // Correct placement of special template spacing logic
    const isBelinda = template === "belinda";
    const isMery = template === "mery";

    chart
      .layout("top")
      .data(chartData)
      // .expandAll()        // ✅ THIS LINE FIXES THE ISSUE
      .nodeWidth(() => tConf.nodeWidth)
      .nodeHeight(() => tConf.nodeHeight)
      .childrenMargin((d) => {
        // keep special spacing for certain templates if you want
        if (template === "mery") return 130;
        if (template === "belinda") return 80;
        return getChildrenMargin(d);
      })
      .siblingsMargin((d) => {
        if (template === "mery") return 60;
        if (template === "belinda") return 40;
        if (template == "rony") return 60
        return getSiblingsMargin(d);
      })
      .compact(layoutConf.compact)
      .linkUpdate(function () {
        d3.select(this)
          .attr("stroke", "#1e4489")
          .attr("stroke-width", 5)
          .attr("fill", "none");
      })
      .nodeContent((d) => {
        // Always show name field for all layouts/templates
        let base = (TEMPLATES[template] || TEMPLATES.ana)(d, tConf);
        // If name is missing in template, add it manually
        if (!base.includes(d.data.name)) {
          base += `<div class='node-title two-line-name' style='font-size:22px;'>${d.data.name || ''}</div>`;
        }
        const descendantCount = getDescendantCount(d);
        const isExpanded = d.children && d.children.length > 0;
        // const hasKids = (d.children && d.children.length > 0) || (d._children && d._children.length > 0);
        const collapseIcon = isExpanded
          ? `<div class="balkan-toggle" data-nodeid="${d.data.id}">
              <span>${d._children ? "+" : "-"}</span>
            </div>`
          : "";
        const badge = `<div class="status-badge" aria-hidden="true"></div>`;
        return `  
          <div class="balkan-node-wrapper" style="position:relative;display:inline-block;overflow:visible;">
            ${base}
            ${collapseIcon}
            ${badge}
          </div>
        `;
      })

      // OPEN POPUP when node body clicked
      // COLLAPSE / EXPAND only when clicking the orange "+" 
      .onNodeClick((d, event) => {
        if (window.__realToggleClick) {
          window.__realToggleClick = false; // reset
          return; // block popup
        }

        const emp = originalData.find(e => String(e.ID) === String(d.data.id));
        if (emp) setSelectedEmployee(emp);
      });

    setTimeout(() => {
      // Use D3 zoom transform for horizontal shifting
      const svg = container.querySelector("svg");
      if (!svg) {
        safeFit(chart);
        return;
      }
      const g = svg.querySelector("g");
      if (!g) {
        safeFit(chart);
        return;
      }

      // Always use D3 zoom/pan handler for all layouts, no manual offset
      const zoomHandler = d3.zoom().on("zoom", (event) => {
        d3.select(g).attr("transform", event.transform);
      });
      d3.select(svg).call(zoomHandler);
      d3.select(svg).transition().duration(300).call(zoomHandler.transform, d3.zoomIdentity);

      setTimeout(() => safeFit(chart), 60);
    }, 40);

    const isNewChart = !chartRef.current;
    chartRef.current = chart;

    if (isNewChart) {
      setTimeout(() => {
        chart.expandAll();
        chart.render();
      }, 50);
    }

    const removeCountBubbles = () => {
      try {
        const c = chartContainerRef.current;
        if (!c) return;

        const selectors = [
          // original
          "g.count", ".count", "g.boc-count", ".boc-count",

          // child-count variants
          "g.node-children-count",
          "g.node-children-count *",
          "text.node-children-count",
          "circle.node-children-count",

          // wrappers
          "g.count-wrapper",
          "g.node-children-count-wrapper",

          // any element containing “count”
          "[class*='count']",
          "[class*='Count']"
        ];

        c.querySelectorAll(selectors.join(",")).forEach(el => el.remove());
      } catch (e) {}
    };

    // call once now and on redraw/render
    removeCountBubbles();
    chart.on?.('render', () => {
      setTimeout(removeCountBubbles, 10);
    });
    chart.on?.('redraw', () => {
      setTimeout(removeCountBubbles, 10);
    });

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
    const wrapper = exportRef.current;
    if (!wrapper) return;

    // Fix overflow so html2canvas sees full chart
    const origOverflow = wrapper.style.overflow;
    wrapper.style.overflow = "visible";

    // Wait for DOM update
    await new Promise(res => setTimeout(res, 50));

    // Preload all images inside nodes
    const imgs = wrapper.querySelectorAll("img");
    await Promise.all(
      Array.from(imgs).map(img => {
        if (img.complete) return img.decode?.().catch(() => {});
        return new Promise(res => { img.onload = img.onerror = res; });
      })
    );

    // Render the whole wrapper (not the SVG alone)
    const canvas = await html2canvas(wrapper, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      foreignObjectRendering: true,   // required for Balkan templates
      allowTaint: true
    });

    wrapper.style.overflow = origOverflow;

    // Download PNG
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "orgchart.png";
    link.click();
  };

  const handleLayoutChange = (l) => {
    setLayout(l);

    // Force re-render with new layout handled inside useEffect
    setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.render();
        safeFit(chartRef.current);
      }
    }, 20);
  };

  const handleRefresh = () => {
    setSearchQuery("");

    if (layout === "mixed") {
      // Force MixedLayout to re-render
      setTimeout(() => {
        setLayout("normal");
        setTimeout(() => setLayout("mixed"), 20);
      }, 0);
      return;
    }

    // For d3-org-chart layouts
    if (chartRef.current) {
      const fullData = makeChartData(originalData);
      chartRef.current
        .data(fullData)
        .expandAll()
        .render();
      setTimeout(() => safeFit(chartRef.current), 60);
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
        setTimeout(() => safeFit(chartRef.current), 50);
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

    setTimeout(() => safeFit(chartRef.current), 60);
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

        {/* ⭐ WRAPPER NEEDED FOR EXPORT IMAGE */}
        <div className="print-label" ref={exportRef}>
          <div className="orgchart-container">

            {/* Second row: instructions + extras */}
            <div
              className="field-selectors"
              style={{
                display: "flex",
                gap: 3,
                alignItems: "center",
                padding: "5px 5px",
              }}
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
                Before printing, click the Refresh button to ensure the chart fits
                properly on your screen.
              </label>

              <span
                style={{
                  color: "black",
                  marginRight: 8,
                  fontSize: 14,
                }}
              >
                Click on a person to open the popup then click '+' icon to upload
                Photo of a person
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
                  textAlign: "left",
                }}
              >
                {(headers || [])
                  .filter((h) => {
                    const key = String(h).toLowerCase();
                    return !["photo", "image", "first_name", "name"].includes(key);
                  })
                  .map((h) => (
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

                <span style={{ color: "#666" }}></span>
              </div>
            </div>

            {/* 🎯 The actual chart (Must be inside print-label wrapper) */}
            <div
              className={`chart-container layout-${layout} template-${template}`}
              id="orgChart"
              data-layout={layout}
              ref={chartContainerRef}
            />
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