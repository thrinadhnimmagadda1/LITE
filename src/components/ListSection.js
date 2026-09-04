import React, { useState, useRef } from 'react';
import { Skeleton, SkeletonCard } from './Skeleton';
import { askPaperQuestion, preparePaperRAG } from '../services/api';

const ListSection = ({ items = [], isLoading = false, onCategorySelect, onItemClick }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [ragState, setRagState] = useState({});

  const toggleAbstract = (e, itemId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close all abstracts first, then open the clicked one if it was closed
    setExpandedId(prevId => {
      // If clicking the currently expanded item, close it
      if (prevId === itemId) {
        return null;
      }
      // Otherwise, expand the clicked item
      return itemId;
    });
  };

  const handleItemClick = (e, itemId) => {
    // Only navigate if the click is not on the abstract toggle or its children
    const isAbstractToggle = e.target.closest('.abstract-toggle');
    
    if (!isAbstractToggle) {
      onItemClick?.(itemId);
    }
  };

  const prepareChat = async (itemId, paperId) => {
    setRagState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status: 'preparing', error: null }
    }));

    try {
      const data = await preparePaperRAG(paperId);
      setRagState(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          status: 'ready',
          prepareInfo: data,
          messages: prev[itemId]?.messages || [],
          error: null
        }
      }));
    } catch (error) {
      setRagState(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], status: 'error', error: error.message }
      }));
    }
  };

  const askQuestion = async (event, itemId, paperId) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const question = String(formData.get('question') || '').trim();
    if (!question) return;
    event.currentTarget.reset();

    const currentMessages = ragState[itemId]?.messages || [];
    setRagState(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: 'answering',
        messages: [...currentMessages, { role: 'user', text: question }],
        error: null
      }
    }));

    try {
      const data = await askPaperQuestion(paperId, question);
      setRagState(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          status: 'ready',
          messages: [
            ...(prev[itemId]?.messages || []),
            { role: 'assistant', text: data.answer, source: data.model_source }
          ],
          error: null
        }
      }));
    } catch (error) {
      setRagState(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], status: 'ready', error: error.message }
      }));
    }
  };

  // const formatDate = (dateString) => {
  //   if (!dateString) return 'N/A';
  //   try {
  //     const cleanDate = String(dateString).replace('Date : ', '').trim();
  //     const date = new Date(cleanDate);
  //     return isNaN(date.getTime()) 
  //       ? 'N/A' 
  //       : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  //   } catch (error) {
  //     console.error('Error formatting date:', error);
  //     return 'N/A';
  //   }
  // };

  const getItemProperty = (item, prop, defaultValue = '') => {
    if (!item) return defaultValue;
    const value = item[prop];
    return value !== undefined && value !== null ? value : defaultValue;
  };

  // Use a ref to maintain a stable counter across renders
  const counterRef = useRef(0);
  
  // Generate a unique ID for each item
  const generateItemId = (item, index) => {
    counterRef.current += 1;
    
    // First try to use existing unique identifiers
    if (item?.id) return `item-${item.id}`;
    if (item?.paper_id) return `paper-${item.paper_id}`;
    
    // Then try to create a unique key from content
    const title = item?.title ? String(item.title).substring(0, 20) : '';
    const line1 = item?.line1 ? String(item.line1).substring(0, 20) : '';
    const abstract = item?.abstract ? String(item.abstract).substring(0, 20) : '';
    
    // Create a content-based key if possible
    if (title || line1 || abstract) {
      const contentKey = `${title}-${line1}-${abstract}`.replace(/\s+/g, '-');
      return `content-${contentKey}-${counterRef.current}`;
    }
    
    // Fallback to a completely unique key
    return `fallback-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}-${counterRef.current}`;
  };

  const renderPaperItem = (item, index) => {
    if (!item) return null;
    
    // Use existing ID or generate a stable one
    const itemId = item.id || `item-${index}-${item.title?.substring(0, 20) || 'paper'}`;
    const title = getItemProperty(item, 'title', 'Untitled Paper');
    const line1 = getItemProperty(item, 'line1');
    const line2 = getItemProperty(item, 'line2');
    const technologies = Array.isArray(item.technologies) ? item.technologies : [];
    const topicLabel = item.topicLabel || item.topic_label || item.Cluster;
    const topicKeywords = String(item.topicKeywords || item.topic_keywords || '')
      .split(';')
      .map(keyword => keyword.trim())
      .filter(Boolean)
      .slice(0, 5);
    const confidenceValue = item.topicConfidence ?? item.topic_confidence;
    const confidence = typeof confidenceValue === 'number'
      ? `${Math.round(confidenceValue * 100)}%`
      : null;
    const hasAbstract = Boolean(item.abstract || item.line3);
    const isExpanded = expandedId === itemId;
    const chat = ragState[itemId] || { status: 'idle', messages: [] };
    
    return (
      <div 
        key={itemId}
        className="paper-card bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200"
        onClick={(e) => handleItemClick(e, itemId)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleItemClick(e, itemId)}
        style={{ cursor: 'pointer' }}
      >
        <div className="p-6">
          <div className="flex flex-col space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
              <h3
                className="paper-title text-lg font-semibold leading-snug hover:text-indigo-600 transition-colors"
                style={{ color: '#334155' }}
              >
                {title}
              </h3>
              {topicLabel && (
                <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    {topicLabel}
                  </span>
                  {confidence && (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {confidence}
                    </span>
                  )}
                </div>
              )}
            </div>
          
            {line1 && (
              <p className="paper-authors text-sm" style={{ color: '#475569' }}>
                {line1}
              </p>
            )}

            {topicKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {topicKeywords.map((tech, techIndex) => {
                  const techText = String(tech || '').trim();
                  return techText ? (
                    <span
                      key={`tech-${itemId}-${techIndex}`}
                      className="inline-flex items-center rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100"
                    >
                      {techText}
                    </span>
                  ) : null;
                })}
              </div>
            ) : technologies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {technologies.slice(0, 5).map((tech, techIndex) => {
                  const techText = String(tech || '').trim();
                  return techText ? (
                    <span
                      key={`tech-${itemId}-${techIndex}`}
                      className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {techText}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <div className="flex justify-between items-center mt-3">
              {hasAbstract && (
                <button
                  onClick={(e) => toggleAbstract(e, itemId)}
                  className="abstract-toggle flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none transition-all duration-200 group"
                  aria-expanded={isExpanded}
                  aria-controls={`abstract-${itemId}`}
                >
                  <span className="flex items-center">
                    <svg 
                      className={`w-4 h-4 mr-1.5 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {isExpanded ? 'Hide Abstract' : 'Read Abstract'}
                  </span>
                </button>
              )}
              
              {item.line4 && (
                <a 
                  href={item.line4} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                  onClick={e => e.stopPropagation()}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Paper
                </a>
              )}
            </div>
          
            {hasAbstract && (
              <div 
                id={`abstract-${itemId}`}
                className={`mt-3 pt-3 border-t border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
                aria-hidden={!isExpanded}
              >
                <div
                  className="paper-abstract-box bg-white rounded-lg p-4 mt-2 border border-gray-200"
                  style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
                >
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 text-indigo-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-sm font-semibold" style={{ color: '#1f2937' }}>
                      Abstract
                    </h4>
                  </div>
                  <div className="pl-6">
                    <p
                      className="paper-abstract-text text-sm leading-relaxed tracking-wide"
                      style={{ color: '#334155' }}
                    >
                      {getItemProperty(item, 'abstract', getItemProperty(item, 'line3', 'No abstract available.'))}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">Ask this paper</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Uses full PDF text when available, cached only for this paper.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        prepareChat(itemId, item.id);
                      }}
                      disabled={chat.status === 'preparing'}
                      className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {chat.status === 'preparing' ? 'Preparing...' : chat.status === 'ready' ? 'Rebuild Cache' : 'Prepare Chat'}
                    </button>
                  </div>

                  {chat.prepareInfo && (
                    <p className="mt-3 text-xs text-slate-500">
                      Ready with {chat.prepareInfo.chunks} chunks ({chat.prepareInfo.status.replace('_', ' ')}).
                    </p>
                  )}

                  {chat.messages?.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {chat.messages.map((message, messageIndex) => (
                        <div
                          key={`${itemId}-message-${messageIndex}`}
                          className={`rounded-md p-3 text-sm ${
                            message.role === 'user'
                              ? 'bg-white text-slate-700 ring-1 ring-slate-200'
                              : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100'
                          }`}
                        >
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {message.role === 'user' ? 'You' : `AI${message.source ? ` · ${message.source}` : ''}`}
                          </div>
                          <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(event) => askQuestion(event, itemId, item.id)}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      name="question"
                      type="text"
                      placeholder="Ask about methods, results, limitations..."
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="submit"
                      disabled={chat.status === 'answering' || chat.status === 'preparing'}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    >
                      {chat.status === 'answering' ? 'Answering...' : 'Ask'}
                    </button>
                  </form>

                  {chat.error && (
                    <p className="mt-3 text-xs font-medium text-red-600">{chat.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Process items to ensure they're valid and have unique keys
  const validItems = [];
  const usedKeys = new Set();
  
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      if (item == null) return;
      
      // Generate a unique key for this item
      let itemKey = generateItemId(item, index);
      
      // Ensure the key is unique
      while (usedKeys.has(itemKey)) {
        itemKey = `${itemKey}-${Math.random().toString(36).substr(2, 4)}`;
      }
      
      usedKeys.add(itemKey);
      validItems.push({
        ...item,
        _key: itemKey // Store the generated key with the item
      });
    });
  }
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {validItems.length > 0 ? (
        validItems.map((item) => (
          <div key={item._key} id={`paper-${item._key}`}>
            {renderPaperItem(item, item._key)}
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No papers found. Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default ListSection;
