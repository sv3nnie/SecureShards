import React, { useState } from "react";
import { reconstructString } from "./helpers/secureshards";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid";
import jsQR from "jsqr";

type PdfJsModule = typeof import("pdfjs-dist");
let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

type RecoveryDiagnostics = {
  duplicatesIgnored: number;
  filesSelected: number;
  pdfFiles: number;
  pngFiles: number;
  qrDecoded: number;
  qrFailed: number;
  supportedFiles: number;
  txtFiles: number;
  uniqueShards: number;
  unsupportedFiles: number;
};

const initialDiagnostics: RecoveryDiagnostics = {
  duplicatesIgnored: 0,
  filesSelected: 0,
  pdfFiles: 0,
  pngFiles: 0,
  qrDecoded: 0,
  qrFailed: 0,
  supportedFiles: 0,
  txtFiles: 0,
  uniqueShards: 0,
  unsupportedFiles: 0
};

export default function RecoverTab() {
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveredSecret, setRecoveredSecret] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<FileList | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [diagnostics, setDiagnostics] = useState<RecoveryDiagnostics | null>(null);
  const [fieldErrors, setFieldErrors] = useState({
    files: false,
    password: false
  });

  const handleFileUpload = (files: FileList) => {
    setUploadedFiles(files);
    setErrorMessage("");
  };

  const loadPdfJsModule = async () => {
    if (!pdfJsModulePromise) {
      pdfJsModulePromise = import("pdfjs-dist/webpack.mjs") as Promise<PdfJsModule>;
    }
    return pdfJsModulePromise;
  };

  const handleRecovery = async () => {
    setDiagnostics(null);
    setRecoveredSecret("");

    setFieldErrors({
      files: !uploadedFiles,
      password: !password.trim()
    });

    if (!password.trim()) {
      setErrorMessage("Enter the password you used when generating these shards.");
      setSuccessMessage("");
      return;
    }

    if (!uploadedFiles) {
      setErrorMessage("Upload shard files to continue.");
      setSuccessMessage("");
      return;
    }

    const shardSet = new Set<string>();
    const nextDiagnostics: RecoveryDiagnostics = {
      ...initialDiagnostics,
      filesSelected: uploadedFiles.length
    };

    const addShard = (value: string | null, isQrSource: boolean) => {
      const normalized = value?.trim();
      if (!normalized) {
        if (isQrSource) {
          nextDiagnostics.qrFailed += 1;
        }
        return;
      }

      if (shardSet.has(normalized)) {
        nextDiagnostics.duplicatesIgnored += 1;
        return;
      }

      shardSet.add(normalized);
      if (isQrSource) {
        nextDiagnostics.qrDecoded += 1;
      }
    };

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith(".txt")) {
          nextDiagnostics.supportedFiles += 1;
          nextDiagnostics.txtFiles += 1;
          addShard(await file.text(), false);
          continue;
        }

        if (fileName.endsWith(".png")) {
          nextDiagnostics.supportedFiles += 1;
          nextDiagnostics.pngFiles += 1;
          addShard(await decodeQRFromArrayBuffer(await file.arrayBuffer()), true);
          continue;
        }

        if (fileName.endsWith(".pdf")) {
          nextDiagnostics.supportedFiles += 1;
          nextDiagnostics.pdfFiles += 1;
          addShard(await decodeQRFromPdfFile(file), true);
          continue;
        }

        nextDiagnostics.unsupportedFiles += 1;
      }

      nextDiagnostics.uniqueShards = shardSet.size;
      setDiagnostics(nextDiagnostics);

      if (shardSet.size === 0) {
        setErrorMessage(
          "No valid shards detected. Upload exported TXT/PNG/PDF shards and make sure QR codes are clear."
        );
        setSuccessMessage("");
        return;
      }

      const reconstructed = await reconstructString(Array.from(shardSet), password.trim());
      setRecoveredSecret(reconstructed);
      setErrorMessage("");
      setSuccessMessage(`Secret recovered successfully with ${shardSet.size} unique shard(s).`);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Recovery failed. Check that your password is correct and that you uploaded enough unique shards."
      );
      setSuccessMessage("");
    }
  };

  const decodeQRFromArrayBuffer = async (buffer: ArrayBuffer) => {
    const blob = new Blob([buffer], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    try {
      return await decodeQRFromImageUrl(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const decodeQRFromImageUrl = async (url: string) => {
    const img = new Image();
    img.src = url;

    return new Promise<string | null>((resolve) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        const imageData = context.getImageData(0, 0, img.width, img.height);
        resolve(decodeQrFromImageData(imageData, img.width, img.height));
      };

      img.onerror = () => resolve(null);
    });
  };

  const decodeQrFromImageData = (imageData: ImageData, width: number, height: number) => {
    const attempts: Array<"attemptBoth" | "dontInvert" | "onlyInvert"> = [
      "attemptBoth",
      "dontInvert",
      "onlyInvert"
    ];

    for (const inversionAttempts of attempts) {
      const code = jsQR(imageData.data, width, height, { inversionAttempts });
      if (code?.data) {
        return code.data;
      }
    }

    return null;
  };

  const decodeQrFromCanvas = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const fullImage = context.getImageData(0, 0, canvas.width, canvas.height);
    const directDecode = decodeQrFromImageData(fullImage, canvas.width, canvas.height);
    if (directDecode) {
      return directDecode;
    }

    const regionSize = Math.floor(canvas.width * 0.62);
    const regionX = Math.max(0, Math.floor((canvas.width - regionSize) / 2));
    const candidateYOffsets = [0.28, 0.34, 0.4];

    for (const offset of candidateYOffsets) {
      const regionY = Math.max(0, Math.floor(canvas.height * offset));
      const safeRegionHeight = Math.min(regionSize, canvas.height - regionY);
      if (safeRegionHeight <= 0) {
        continue;
      }

      const regionImage = context.getImageData(regionX, regionY, regionSize, safeRegionHeight);
      const regionDecode = decodeQrFromImageData(regionImage, regionSize, safeRegionHeight);
      if (regionDecode) {
        return regionDecode;
      }
    }

    return null;
  };

  const decodeQRFromPdfFile = async (file: File) => {
    const pdfjs = await loadPdfJsModule();
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    try {
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 4 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const context = canvas.getContext("2d");
        if (!context) {
          continue;
        }

        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const qrData = decodeQrFromCanvas(canvas, context);
        if (qrData) {
          return qrData;
        }
      }

      return null;
    } finally {
      await pdfDocument.destroy();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="bg-dark shadow-2xl rounded-xl p-8 w-full backdrop-blur-sm bg-opacity-80">
        <div className="space-y-6">
          <div>
            <label htmlFor="password-recover" className="text-lg font-semibold mb-2 flex items-center">
              Password
              <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                Required
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password-recover"
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  fieldErrors.password ? "border-red-500 ring-1 ring-red-500" : "border-gray-700"
                }`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter the generation password"
              />
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Must match the password used during shard generation exactly.
            </p>
          </div>

          <div>
            <label className="text-lg font-semibold mb-2 flex items-center">
              Upload Shards
              <span className="ml-2 text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                Required
              </span>
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                fieldErrors.files
                  ? "border-red-500 bg-red-500/10"
                  : isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 hover:border-gray-500"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleFileUpload(event.dataTransfer.files);
              }}
            >
              <input
                type="file"
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(event) => handleFileUpload(event.target.files!)}
                multiple
                accept=".txt,.png,.pdf"
              />
              <div className="space-y-2">
                <p className="text-gray-400">Drag and drop shard files here, or click to select files</p>
                <p className="text-sm text-gray-500">Supports .txt, .png, and .pdf files</p>
                {uploadedFiles && uploadedFiles.length > 0 && (
                  <div className="group relative">
                    <p className="text-blue-400">
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} selected
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

          {diagnostics && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-200 font-semibold mb-2">Recovery Diagnostics</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm text-gray-300">
                <p>Unique shards: {diagnostics.uniqueShards}</p>
                <p>Duplicates ignored: {diagnostics.duplicatesIgnored}</p>
                <p>Files selected: {diagnostics.filesSelected}</p>
                <p>Supported files parsed: {diagnostics.supportedFiles}</p>
                <p>Unsupported files ignored: {diagnostics.unsupportedFiles}</p>
                <p>TXT parsed: {diagnostics.txtFiles}</p>
                <p>PNG parsed: {diagnostics.pngFiles}</p>
                <p>PDF parsed: {diagnostics.pdfFiles}</p>
                <p>QR decoded: {diagnostics.qrDecoded}</p>
                <p>QR decode failures: {diagnostics.qrFailed}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 w-full">
              <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                <p className="text-red-400 text-center font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 w-full">
              <div className="bg-green-500/10 border border-green-500/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                <p className="text-green-400 text-center font-medium">{successMessage}</p>
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
