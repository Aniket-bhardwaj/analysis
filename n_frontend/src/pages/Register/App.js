import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/uploaded-files`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(file => {
          const utcDate = new Date(file.uploaded_at + ' UTC');
          const ist = new Date(utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
          const displayTime = ist.toLocaleString("en-GB", {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            hour12: false
          }).replace(',', '');
          return { ...file, displayTime };
        });
        setUploadedFiles(formatted);
      })
      .catch(err => console.error('Fetch error:', err));
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        alert('Server returned an invalid response.');
        return;
      }

      if (!response.ok) {
        alert(data.error || 'Upload failed.');
        return;
      }

      console.log('Upload response:', data);

      const utcDate = new Date(data.uploaded_at + ' UTC');
      const ist = new Date(utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const displayTime = ist.toLocaleString("en-GB", {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: false
      }).replace(',', '');

      const newFile = { ...data, displayTime };
      setUploadedFiles(prev => [newFile, ...prev]);
      setSelectedFile(null);

      // Clear the file input element so it shows empty after upload
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }

      fetch(`${import.meta.env.VITE_API_URL}/preview/${data.stored_name}`)
        .then(res => res.json())
        .then(preview => setPreviewData(preview))
        .catch(err => console.error('Preview error:', err));

    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed.');
    }
  };

  const handleFileClick = (file) => {
    fetch(`${import.meta.env.VITE_API_URL}/preview/${file.stored_name}`)
      .then(res => res.json())
      .then(preview => setPreviewData(preview))
      .catch(err => console.error('Preview error:', err));
  };

  const handleDeleteFromList = async (id) => {
    const confirmDelete = window.confirm("Do you want to remove this file from the list?");
    if (confirmDelete) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/hide-file/${id}`, { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          setUploadedFiles(prev => prev.filter(file => file.id !== id));
        } else {
          alert('Failed to hide file.');
        }
      } catch (err) {
        console.error('Hide error:', err);
        alert('Error hiding file.');
      }
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload CSV File</h2>
      <input
        type="file"
        accept=".csv"
        name='file'
        onChange={handleFileChange}
        ref={fileInputRef}
      />
      <button onClick={handleUpload} style={{ marginLeft: 10 }}>Upload</button>

      <h3>Uploaded Files:</h3>
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        {uploadedFiles.map(file => (
          <li key={file.id} style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            marginBottom: '10px',
            padding: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div onClick={() => handleFileClick(file)} style={{ cursor: 'pointer' }}>
              <strong>{file.filename}</strong><br />
              <small>{file.displayTime}</small>
            </div>
            <button onClick={() => handleDeleteFromList(file.id)} style={{
              marginLeft: '10px',
              backgroundColor: 'red',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '5px 10px'
            }}>❌</button>
          </li>
        ))}
      </ul>

      {previewData.length > 0 && (
        <div>
          <h3>Preview (first 5 rows):</h3>
          <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {Object.keys(previewData[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
