import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";

function FileUploader({ setOriginalData, setDisplayData, setHeaders, setDepartment }) {
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [images, setImages] = useState({});
  const [photoFolderLabel, setPhotoFolderLabel] = useState("No folder chosen");


  // normalize filenames (basename, lowercase)
  const normalize = (p) => {
    if (!p && p !== 0) return "";
    const s = String(p);
    return s.split(/[/\\]/).pop().toLowerCase().trim();
  };

  // 📌 Trigger hidden Excel input
  const handleChooseFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // 📌 Trigger hidden Photos input
  const handleChoosePhotos = () => {
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
      photoInputRef.current.click();
    }
  };

  const handleClearPhotos = () => {
    setImages({}); // clear uploaded photo map
    setPhotoFolderLabel("No folder chosen"); // reset label
    if (photoInputRef.current) {
      photoInputRef.current.value = ""; // clear file input
    }
  };

  // 📌 When Excel file is selected
  const handleFileSelected = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setFileName("");
      setError("");
      return;
    }

    const validExtensions = [".xlsx", ".xls"];
    const isValid = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isValid) {
      setFileName("");
      setError("Error: Please choose the correct format (.xlsx or .xls)");
      return;
    }

    setFileName(file.name);
    setError("");
  };

  // 📌 When Photos are selected
  const handlePhotoUpload = (e) => {
    const files = e.target.files;
    const imgMap = {};

    if (files.length === 0) {
      setPhotoFolderLabel("No folder chosen");
      return;
    }

    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      imgMap[normalize(file.name)] = url;
    });

    setImages(prev => ({ ...prev, ...imgMap }));

    // 📌 Show folder name or number of photos
    const firstFilePath = files[0].webkitRelativePath || files[0].name;
    const folderName = firstFilePath.split("/")[0];
    setPhotoFolderLabel(`${folderName} (${files.length} photos)`);
  };

  // 📌 Process Excel + match Photos
  const handleSubmit = () => {
    const file =
      fileInputRef.current?.files?.length > 0
        ? fileInputRef.current.files[0]
        : null;

    if (!file) {
      setError("Error: Please choose a valid Excel file first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

      const headerRow = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })[0] || [];

      // find Photo column key case-insensitively
      const headerLower = headerRow.map(h => String(h).toLowerCase());
      const photoIndex = headerLower.indexOf("photo");
      const photoKey =
        photoIndex >= 0
          ? headerRow[photoIndex]
          : headerRow.find(h => String(h).toLowerCase().includes("photo")) || "Photo";

      // Attach photo URLs
      if (jsonData.length > 0 && jsonData[0][photoKey] !== undefined) {
        const missing = new Set();
        jsonData.forEach(row => {
          const raw = row[photoKey];
          if (!raw) return;

          const str = String(raw).trim();
          if (/^https?:\/\//i.test(str) || /^data:/i.test(str)) {
            row.Photo = str;
            return;
          }

          const key = normalize(str);
          if (images[key]) {
            row.Photo = images[key]; // blob URL from uploaded photos
          } else {
            missing.add(str);
            row.Photo = ""; // leave blank if not found
          }
        });

        if (missing.size > 0) {
          console.warn(`⚠️ Missing ${missing.size} referenced image(s):`, Array.from(missing).slice(0, 8));
        }
      }

      // Validate mandatory Name column
      const headersLower = headerRow.map(h => String(h).toLowerCase());
      const possibleNameKeys = ["first_name", "first name", "name", "full_name", "fullname", "employee name", "employee_name"];

      const hasName = headersLower.some(h => possibleNameKeys.includes(h));
      if (!hasName) {
        setError("Error: Uploaded file must include a Name column.");
        return;
      }

      setOriginalData(jsonData);
      setDisplayData(jsonData);
      if (setHeaders) setHeaders(headerRow.map(h => String(h)));
      setError("");
      setSubmitted(true);
    };
    reader.readAsArrayBuffer(file);
  };

  // 📌 Clear everything
  const handleClear = () => {
    setFileName("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";

    Object.values(images).forEach(url => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    });
    setImages({});
  };

  const handleRefresh = () => window.location.reload();
  const handleBack = () => {
    setSubmitted(false);
    handleClear();
  };

  // 📌 If submitted, show chart UI
  if (submitted) {
    return (
      <div className="app-container">
        <header className="header">
          <img src="/onlylogo.png" alt="Logo" className="logo" />
          <h1>SUPRAJIT ENGINEERING LIMITED</h1>
        </header>

        <h2 className="sub-header">ORGANIZATION CHART</h2>
        <div className="chart-container">
          <p>✅ Data uploaded successfully. Organization chart displayed here.</p>
        </div>

        <div className="action-buttons">
          <button onClick={handleRefresh}>Refresh</button>
          <button onClick={() => window.print()}>Print</button>
          <button onClick={handleBack}>Back</button>
        </div>
      </div>
    );
  }

  // 📌 Default Upload UI
  return (
    <>
      <div className="app-container">
        <header className="header">
          <img src="/onlylogo.png" alt="Logo" className="logo" />
          <h1>SUPRAJIT ENGINEERING LIMITED</h1>
        </header>

        <h2 className="sub-header">ORGANIZATION CHART</h2>

        <div className="template-download">
          <p>Download the <b>.xlsx</b> file template:</p>
          <a href="/template.xlsx" download className="download-btn">
            📥 Excel Template
          </a>
        </div>

        <div className="upload-section">
          {/* Excel upload */}
          <button onClick={handleChooseFile}>Choose Excel File</button>
          <button onClick={handleSubmit}>Submit</button>
          <button onClick={handleClear}>Clear</button>
          <br />

          <span className={`file-name ${error ? "error" : fileName ? "success" : ""}`}>
            {error ? error : (fileName ? fileName : "No file chosen")}
          </span>
          <br/><br/>

          <label style={{ marginTop: 8 }}><b>Department Name: </b></label>
          <input type="text" onChange={e => setDepartment && setDepartment(e.target.value)} style={{ marginLeft: 6 }} />

          {/* Hidden Excel input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            style={{ display: "none" }}
          />
        </div>

        <div className="photo-upload-section">
          <p>Upload Photos Folder (optional)</p>

          <button type="button" onClick={handleChoosePhotos}>
            Choose Folder
          </button>
          <button type="button" onClick={handleClearPhotos} className="clear-btn">
            Clear
          </button>

          <input
            type="file"
            ref={photoInputRef}
            onChange={handlePhotoUpload}
            style={{ display: "none" }}
            webkitdirectory="true"
            directory="true"
            multiple
            accept="image/*"
          />
          <br/>
          {/* Show chosen folder / message */}
          <span
            className={`file-name ${photoFolderLabel.includes("No") ? "" : "success"}`}
          >
            {photoFolderLabel}
          </span>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">INSTRUCTIONS</h2>
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
        </div>
      </div>
      <img src="./itlogonobg.png" alt="IT Logo" className="itlogo" />
    </>
  );
}

export default FileUploader;