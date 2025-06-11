import { useParams, Link } from 'react-router-dom';
import { items } from '../App';
import PDFViewer from './PDFViewer';

const ItemDetail = () => {
  const { id } = useParams(); // We only need id from params to find the item
  const numericId = parseInt(id, 10);
  const currentItem = items.find(item => item.id === numericId);

  if (!currentItem) {
    return <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center text-xl">Item not found.</div>;
  }

  // Use data from currentItem
  const item = {
    id: currentItem.id,
    line1: currentItem.line1, // Use line1 from the found item
    line2: currentItem.line2, // Use line2 from the found item
    line3: currentItem.line3, // Use line3 from the found item
    line4: <Link to={currentItem.line4}>{currentItem.line4}</Link>, // Use line4 from the found item
    title: currentItem.title, // Use title from the found item
    description: `This is a detailed description for item ${currentItem.id}. It uses data from App.js.`, // Updated description
    content: [
      currentItem.line1,    // Display actual data
      currentItem.line2,
      currentItem.line3,
      <div className="w-full bg-white">
        <PDFViewer 
          pdfUrl="https://ai4society.github.io/publications/papers_local/litevol.pdf"
          downloadUrl={currentItem.line4}
        />
      </div>
    ]
  };

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 px-2 sm:px-4">
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-white">{item.title}</h2>
            <Link 
              to="/" 
              className="inline-flex items-center px-4 py-2 bg-white text-indigo-700 font-medium rounded-md hover:bg-indigo-50 transition-colors shadow-sm"
            >
              Back to List
            </Link>
          </div>
        </div>
        <div className="p-0">
          <dl className="divide-y divide-gray-200">
            {item.content.map((line, index) => (
              <div key={index} className={index < 3 ? 'px-6 py-4' : 'p-0'}>
                <div className="w-full">
                  {line}
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
      

    </div>
  );
};

export default ItemDetail;
