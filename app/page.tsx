"use client";
import React, { useState } from "react";
import GenerateTab from "./GenerateTab";
import RecoverTab from "./RecoverTab";
import FAQ from "./faq";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"generate" | "recover">("generate");

  return (
    <main className="flex min-h-screen flex-col items-center wrapper">
      <div className="flex items-center mb-8">
        <img src="/secureshards.png" width="40" className="mr-4" alt="SecureShards Logo" />
        <h1 className="text-4xl font-bold">SecureShards</h1>
      </div>

      <div className="flex w-full mb-8 p-1 bg-gray-700/50 backdrop-blur-lg rounded-xl">
        <button 
          onClick={() => setActiveTab("generate")} 
          className={`w-full px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 ${
            activeTab === "generate" 
              ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg" 
              : "hover:bg-gray-700/50"
          }`}
        >
          Generate
        </button>
        <button 
          onClick={() => setActiveTab("recover")} 
          className={`w-full px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 ${
            activeTab === "recover" 
              ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg" 
              : "hover:bg-gray-700/50"
          }`}
        >
          Recover
        </button>
      </div>

      {activeTab === "generate" && <GenerateTab />}
      {activeTab === "recover" && <RecoverTab />}

      <FAQ />

      <footer className="w-full text-center py-3 text-gray-400 mb-10">
        <p className="text-sm">
          Made with <span className="text-red-500">❤</span> by{" "}
          <a
            href="https://sv3n.me"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            sv3n.me
          </a>
          {" • "}
          <a
            href="https://github.com/sv3nnie/secureshards"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            Source Code
          </a>
        </p>
      </footer>
    </main>
  );
}
