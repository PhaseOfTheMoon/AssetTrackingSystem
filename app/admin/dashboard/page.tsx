"use client";
import React from 'react'
import Dashboard from '../../../components/navbar/navigationBar'

const page = () => {
  return (
    <div>
        {/* Page Content */}
        <Dashboard />
        <main className="p-6 flex-grow ml-auto w-[81%]  bg-gray-50">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          {/* Top row of small placeholder boxes */}
          <div className="flex-1 bg-white border border-gray-200 p-4 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg shadow h-32 flex items-center justify-center text-gray-500">
                Asset Count Placeholder
              </div>
              <div className="bg-white border border-gray-200 rounded-lg shadow h-32 flex items-center justify-center text-gray-500">
                Department Placeholder
              </div>
              <div className="bg-white border border-gray-200 rounded-lg shadow h-32 flex items-center justify-center text-gray-500">
                Staff Placeholder
              </div>
              <div className="bg-white border border-gray-200 rounded-lg shadow h-32 flex items-center justify-center text-gray-500">
                Location Placeholder
              </div>
            </div>
            {/* Bottom row for graph placeholders */}
            <div className="w-full flex justify-center mb-6">
              <div className="bg-white rounded-lg flex flex-col items-center justify-center max-w-xl lg:col-span-2 min-h-[200px] p-4 border">
                <p className="flex-1 p-1 pb-2 font-bold text-xl">Total Assets</p>
                <img 
                  className="w-full h-full object-contain rounded-lg"
                  src='https://cdn.corporatefinanceinstitute.com/assets/line-graph.jpg'>
                </img>  
              </div>
              {/* <div className="bg-white border border-gray-300 rounded-lg h-32 flex items-center justify-center text-gray-500">
                Graph Placeholder 2
              </div> */}
            </div>
          </div>
        </main>        
    </div>
  )
}

export default page
