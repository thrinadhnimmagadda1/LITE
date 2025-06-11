import React from 'react';

const PDFViewer = ({ pdfUrl, downloadUrl }) => {
  return (
    <div className="w-full h-[90vh] bg-gray-100 flex flex-col">
      <div className="flex justify-end items-center p-4 border-b bg-white">
        <a 
          href={pdfUrl} 
          download
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          Download PDF
        </a>
      </div>

      <div className="flex-1">
        <iframe 
          src={pdfUrl}
          className="w-full h-full border-0 bg-white"
          title="PDF Viewer"
        >
          This browser does not support PDFs. Please use the download button above to view the PDF.
        </iframe>
      </div>
    </div>
  );
};

export default PDFViewer;
