import React from "react";
function Controls({ searchQuery, setSearchQuery, onRefresh, onBack, onPrint, onExportImage, toggleFullScreen, onLayoutChange, selectedLayout, templates = [], onSelectTemplate, selectedTemplate }) {
   return (
      <div className="top-bar">    {/* was controls */}
         {/* Template selection buttons */}
         {templates && templates.length > 0 && (
            <div className="template-controls">
               {templates.map(t => (
                  <button
                     key={t.key}
                     className={`template-btn ${selectedTemplate === t.key ? 'active' : ''}`}
                     onClick={() => onSelectTemplate && onSelectTemplate(t.key)}
                     title={`Use ${t.label} template`}
                  >{t.label}</button>
               ))}
            </div>
         )}

         <div className="layout-controls">
            <span>Layout: </span>
            <select
               value={selectedLayout}   // <-- controlled by state
               id="layout-select"
               onChange={(e) => onLayoutChange && onLayoutChange(e.target.value)}
            >
               <option value="normal">Normal</option>
               <option value="mixed">Mixed</option>
               <option value="tree">Tree</option>
               <option value="treeLeft">Tree Left</option>
               <option value="treeLeftOffset">Tree Left Offset</option>
               <option value="treeRight">Tree Right</option>
               <option value="treeRightOffset">Tree Right Offset</option>
               <option value="grid">Grid</option>
            </select>
         </div>

         <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Name..."
         />
         <button className="refresh" onClick={onRefresh}>Refresh</button>
         <button className="back" onClick={onBack}>Back</button>
         <button className="print" onClick={onPrint}>Print</button>
         {/* <button className="export-pdf" onClick={onExportPDF}>Export PDF</button> */}
         <button className="export-img" onClick={onExportImage}>Export Image</button>
         <button onClick={toggleFullScreen} className="fullscreen-btn">Toggle Fullscreen</button>
      </div>
   );
}
export default Controls;