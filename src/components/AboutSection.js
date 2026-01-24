import React from 'react';

const AboutSection = () => {
  return (
    <section id="about" className="scroll-mt-24">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-slate-800">
            About LITE
          </h2>
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-50 border border-gray-200 text-slate-600 text-sm">
            <span>Literature Intelligence</span>
          </div>
        </div>
        <p className="text-gray-700 leading-relaxed mb-6">
          LITE (Literature Intelligence, Timeline, and Exploration) is a full-stack research
          exploration tool that helps you discover, cluster, and visualize recent arXiv papers.
          It combines focused search with lightweight analytics so you can quickly understand
          what is being published and how topics evolve over time.
        </p>
        <div className="space-y-5 text-gray-700 leading-relaxed">
          <p>
            The workflow starts with a primary query plus optional keywords. The backend runs an
            arXiv extractor, produces curated CSV outputs, and serves processed papers through the
            API. The frontend then visualizes results with timeline and cluster views so you can
            spot trends and drill into individual papers.
          </p>
          <p>
            LITE is optimized for rapid exploration: it summarizes the latest results, groups
            similar papers using sentence embeddings and clustering, and highlights how the
            literature shifts month by month. It is ideal for researchers, students, and teams
            who want a fast, repeatable way to scan new work in a specific domain.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            Search
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            Clustering
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            Timeline
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            Visualization
          </span>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
