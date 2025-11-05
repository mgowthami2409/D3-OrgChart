import React from "react";

const InstructionsPopup = ({ onClose }) => {
  return (
    <div className="popup" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2>INSTRUCTIONS</h2>
        <ol>
          <ol className="instructions">
            <li>
              When preparing your Excel sheet, ensure that all <b>mandatory
              fields</b> (as specified in the template) are included. You may
              add additional fields if needed.
            </li>
            <li>The Excel sheet must not contain any empty cells.</li>
            <li>
              To automatically display photos in the chart without manual editing, upload the photos folder in the 
              <strong>"Upload Photos Folder"</strong> section. 
              Ensure that the photo file names exactly match
              the names specified in the Excel sheet.
            </li>
            <li>
              In the Organization Chart, the <b>Name</b> field is mandatory
              by default. If required, you may display up to two additional
              fields by selecting the checkboxes above the chart.
            </li>
            <li>
              To <b>print</b> the chart, click the <b>Print</b> button. In the
              print settings, adjust the scaling based on your chosen paper
              size (e.g., A3 → 60, A4 → 45, A5 → 30).
            </li>
            <li>
              Before printing, click the <b>Refresh</b> button to ensure the chart 
              fits properly on your screen.
            </li>
            <li>
              To <b>export</b> the chart as an image, click the{" "}
              <b>Export Image</b> button. The file will be saved in
              <code>.png</code> format.
            </li>
            <li>
              To save the chart as a <b>PDF</b>, click the <b>Print</b> button.
              In the print settings, select <b>“Save as PDF”</b> as the
              destination and adjust the scaling as needed.
            </li>
          </ol>
        </ol>
      </div>
    </div>
  );
};

export default InstructionsPopup;
