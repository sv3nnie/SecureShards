import React, { useState } from "react";
import { reconstructString } from "./helpers/secureshards";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid";
import jsQR from "jsqr";

export default function RecoverTab() {
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveredSecret, setRecoveredSecret] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<FileList | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    password: false,
    files: false
  });

  const handleFileUpload = (files: FileList) => {
    setUploadedFiles(files);
  };

  const handleRecovery = async () => {
    setFieldErrors({
      password: !password,
      files: !uploadedFiles
    });

    if (!uploadedFiles || !password) {
      setErrorMessage("Please fill in all required fields.");
      setSuccessMessage("");
      return;
    }

    const shards: string[] = [];

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        if (file.name.endsWith(".txt")) {
          const shardContent = await file.text();
          if (shardContent && !shards.includes(shardContent)) {
            shards.push(shardContent);
          }
        } else if (file.name.endsWith(".png")) {
          const imgData = await file.arrayBuffer();
          const shardContent = await decodeQRFromArrayBuffer(imgData);
          if (shardContent && !shards.includes(shardContent)) {
            shards.push(shardContent);
          }
        }
      }

      if (shards.length === 0) {
        setErrorMessage("No valid shards found in the uploaded files.");
        setSuccessMessage("");
        return;
      }

      const reconstructed = await reconstructString(shards, password);
      setRecoveredSecret(reconstructed);

      setErrorMessage("");
      setSuccessMessage("Secret recovered successfully.");
    } catch (err) {
      console.error(err);
      setErrorMessage("An error occurred while recovering the secret. Please check your password and files.");
      setSuccessMessage("");
    }
  };

  const decodeQRFromArrayBuffer = async (buffer: ArrayBuffer) => {
    const blob = new Blob([buffer], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    return decodeQRFromBase64Buffer(url);
  };

  const decodeQRFromBase64Buffer = async (url: string) => {
    const img = new Image();
    img.src = url;
    return new Promise<string | null>((resolve) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0, img.width, img.height);
          const imageData = context.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, img.width, img.height);
          resolve(code ? code.data : null);
        } else {
          resolve(null);
        }
      };
    });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="bg-dark shadow-2xl rounded-xl p-8 w-full backdrop-blur-sm bg-opacity-80">
        <div className="space-y-6">
          <div>
            <label htmlFor="password-recover" className="text-lg font-semibold mb-2 flex items-center">
              Password
              <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">Required</span>
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password-recover" 
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  fieldErrors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'
                }`}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-lg font-semibold mb-2 flex items-center">
              Upload Shards
              <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">Required</span>
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                fieldErrors.files 
                  ? 'border-red-500 bg-red-500/10' 
                  : isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 hover:border-gray-500"
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
            >
              <input
                type="file"
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handleFileUpload(e.target.files!)}
                multiple
                accept=".txt,.png"
              />
              <div className="space-y-2">
                <p className="text-gray-400">
                  Drag and drop your shard files here, or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  Supports .txt and .png files
                </p>
                {uploadedFiles && uploadedFiles.length > 0 && (
                  <div className="group relative">
                    <p className="text-blue-400">
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected
                    </p>
                    <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 p-2 bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      {Array.from(uploadedFiles).map((file, index) => (
                        <p key={index} className="text-sm text-gray-300 whitespace-nowrap">
                          {file.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={handleRecovery} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Recover Secret
          </button>

          {errorMessage && (
              <div className="mt-4 w-full">
                <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                  <p className="text-red-500 text-center font-medium">{errorMessage}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 w-full">
                <div className="bg-green-500/10 border border-green-500/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                  <p className="text-green-500 text-center font-medium">{successMessage}</p>
                </div>
              </div>
            )}
        </div>
      </div>

      {recoveredSecret && (
        <div className="mt-4 w-full">
          <div className="bg-dark shadow-2xl rounded-xl p-8 w-full backdrop-blur-sm bg-opacity-80">
            <h2 className="text-lg font-semibold mb-4">Recovered Secret</h2>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="break-words">{recoveredSecret}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
