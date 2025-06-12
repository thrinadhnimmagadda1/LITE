import { useParams, Link } from 'react-router-dom';
import { items } from '../App';
import PDFViewer from './PDFViewer';

const ItemDetail = () => {
  const { id } = useParams(); // We only need id from params to find the item
  const numericId = parseInt(id, 10);
  const currentItem = items.find(item => item.id === numericId);

  if (!currentItem) {
    return <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center text-xl dark:text-white">Item not found.</div>;
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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg transition-colors duration-200">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-300">Item Details</p>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          <dl>
            {item.content.map((content, index) => (
              <div 
                key={index} 
                className={`px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 transition-colors duration-200 ${
                  index % 2 === 0 
                    ? 'bg-white dark:bg-gray-800' 
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                {/* <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">
                  Line {index + 1}
                </dt> */}
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2 sm:mt-0">
                  {content}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="mt-5">
        <Link 
          to="/" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
        >
          Back to list
        </Link>
      </div>
    </div>
  );
};

export default ItemDetail;
